import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { messagesToTurns, type ThreadTurn } from "@/lib/thread-turns";
import { checkRateLimit } from "@/lib/rate-limit";
import { invalidateUserResourceCache } from "@/lib/cache";

interface Params {
  params: Promise<{ id: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_THREAD_BODY_BYTES = 512_000;

async function boundedBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_THREAD_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_THREAD_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function validTurn(value: unknown): value is ThreadTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<ThreadTurn>;
  return typeof turn.id === "string" && turn.id.length <= 100 && turn.id.length > 0 &&
    typeof turn.question === "string" && turn.question.length > 0 && turn.question.length <= 2000 &&
    typeof turn.courseId === "string" && (!turn.courseId || UUID.test(turn.courseId)) &&
    typeof turn.createdAt === "string" && !Number.isNaN(Date.parse(turn.createdAt)) &&
    ["loading", "done", "error"].includes(turn.status ?? "") &&
    (turn.error === undefined || (typeof turn.error === "string" && turn.error.length <= 8000)) &&
    (turn.response === undefined || (turn.response !== null && typeof turn.response === "object" &&
      !Array.isArray(turn.response) && typeof turn.response.answer === "string" &&
      turn.response.answer.length <= 8000 && JSON.stringify(turn.response).length <= 32000));
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const sb = supabaseAdmin();
    const { data: thread, error: threadError } = await sb
      .from("chat_threads")
      .select("id, title, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (threadError) throw new Error(threadError.message);
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const { data: messages, error: messagesError } = await sb
      .from("chat_messages")
      .select("id, role, content, metadata, created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
      .order("role", { ascending: false });
    if (messagesError) throw new Error(messagesError.message);
    return NextResponse.json({ ...thread, turns: messagesToTurns((messages ?? []) as Array<Record<string, unknown>>) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("thread load error", error);
    return NextResponse.json({ error: "Failed to load chat thread" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) return NextResponse.json(
      { error: limit.enforced ? "Chat write limit exceeded" : "Rate limiter unavailable" },
      { status: limit.enforced ? 429 : 503, headers: { "Cache-Control": "no-store" } },
    );
    if (!UUID.test(id) || Number(request.headers.get("content-length") ?? 0) > 512_000) {
      return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
    }
    let raw: string | null;
    try {
      raw = await boundedBody(request);
    } catch {
      return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
    }
    if (raw === null) return NextResponse.json({ error: "Chat too large" }, { status: 413 });
    let body: { title?: unknown; courseId?: unknown; turns?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || !Array.isArray(body.turns) || body.turns.length > 100 ||
      !body.turns.every(validTurn) || (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) ||
      (body.courseId != null && (typeof body.courseId !== "string" || !UUID.test(body.courseId)))) {
      return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
    }
    const turns = body.turns as ThreadTurn[];
    const courseId = (body.courseId || turns.at(-1)?.courseId || null) as string | null;
    const title = (typeof body.title === "string" ? body.title.trim() : "") || turns[0]?.question.slice(0, 52) || "New chat";
    const sb = supabaseAdmin();
    if (courseId) {
      const { data: course, error: courseError } = await sb.from("courses").select("id")
        .eq("id", courseId).eq("user_id", user.id).maybeSingle();
      if (courseError) throw new Error(courseError.message);
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const messages = turns.flatMap((turn) => {
      const userMessage = {
        id: crypto.randomUUID(),
        thread_id: id,
        role: "user",
        content: turn.question,
        status: turn.status === "error" ? "error" : "complete",
        metadata: { turnId: turn.id, courseId: turn.courseId },
        created_at: turn.createdAt,
      };
      const assistantContent = turn.status === "error"
        ? turn.error || "Unable to answer this question."
        : turn.response ? String(turn.response.answer ?? "") : "";
      const assistantMessage = assistantContent
        ? {
            id: crypto.randomUUID(),
            thread_id: id,
            role: "assistant",
            content: assistantContent,
            status: turn.status === "error" ? "error" : "complete",
            metadata: { turnId: turn.id, status: turn.status, response: turn.response ?? null },
            created_at: new Date(Date.parse(turn.createdAt) + 1).toISOString(),
          }
        : null;
      return assistantMessage ? [userMessage, assistantMessage] : [userMessage];
    });
    const { error } = await sb.rpc("save_chat_thread", {
      p_thread_id: id, p_user_id: user.id, p_course_id: courseId,
      p_title: title, p_messages: messages,
    });
    if (error) throw new Error(error.message);
    invalidateUserResourceCache(user.id, "thread-list");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("thread save error", error);
    return NextResponse.json({ error: "Failed to save chat thread" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { error } = await supabaseAdmin()
      .from("chat_threads")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    invalidateUserResourceCache(user.id, "thread-list");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("thread delete error", error);
    return NextResponse.json({ error: "Failed to delete chat thread" }, { status: 500 });
  }
}
