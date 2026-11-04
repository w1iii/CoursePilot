import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";

interface Params {
  params: Promise<{ id: string }>;
}

interface IncomingTurn {
  id: string;
  question: string;
  courseId: string;
  createdAt: string;
  status: "loading" | "done" | "error";
  response?: Record<string, unknown>;
  error?: string;
}

function toTurns(messages: Array<Record<string, unknown>>) {
  const turns = new Map<string, IncomingTurn>();
  for (const message of messages) {
    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const turnId = typeof metadata.turnId === "string" ? metadata.turnId : String(message.id);
    const existing = turns.get(turnId);
    if (message.role === "user") {
      turns.set(turnId, {
        id: turnId,
        question: String(message.content),
        courseId: typeof metadata.courseId === "string" ? metadata.courseId : "",
        createdAt: String(message.created_at),
        status: "loading",
      });
    } else if (existing) {
      existing.status = metadata.status === "error" ? "error" : "done";
      if (metadata.status === "error") existing.error = String(message.content);
      else existing.response = metadata.response as Record<string, unknown>;
    }
  }
  return Array.from(turns.values());
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
      .order("created_at", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);
    return NextResponse.json({ ...thread, turns: toTurns((messages ?? []) as Array<Record<string, unknown>>) });
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
    const body = await request.json() as { title?: string; courseId?: string; turns?: IncomingTurn[] };
    const turns = Array.isArray(body.turns) ? body.turns : [];
    const title = body.title?.trim() || turns[0]?.question?.slice(0, 52) || "New chat";
    const now = new Date().toISOString();
    const sb = supabaseAdmin();
    const { data: existing, error: existingError } = await sb
      .from("chat_threads")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (existing === null && turns.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    const { error: threadError } = await sb.from("chat_threads").upsert(
      {
        id,
        user_id: user.id,
        course_id: body.courseId || turns.at(-1)?.courseId || null,
        title,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    if (threadError) throw new Error(threadError.message);

    const { error: deleteError } = await sb.from("chat_messages").delete().eq("thread_id", id);
    if (deleteError) throw new Error(deleteError.message);
    const messages = turns.flatMap((turn) => {
      const userMessage = {
        id: turn.id,
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
            created_at: turn.createdAt,
          }
        : null;
      return assistantMessage ? [userMessage, assistantMessage] : [userMessage];
    });
    if (messages.length) {
      const { error: messageError } = await sb.from("chat_messages").insert(messages);
      if (messageError) throw new Error(messageError.message);
    }
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("thread delete error", error);
    return NextResponse.json({ error: "Failed to delete chat thread" }, { status: 500 });
  }
}
