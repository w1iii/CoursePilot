/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { listStudyPrepCourses } from "@/lib/ai/study-prep-courses";
import { generateStudyPack, moduleMetadata, StudyPrepServiceError } from "@/lib/ai/study-prep";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid, readJsonObject } from "@/lib/api-validation";
import { randomUUID } from "node:crypto";
import { logServerError } from "@/lib/server-error";

export const maxDuration = 300;

export async function GET() {
  try {
    const user = await requireUser();
    const packs = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin().from("study_packs").select("id,title,mode,topic,module,difficulty,item_count,created_at,course:courses(course_name,course_code),study_sessions(id,status,score,last_active_at)").eq("user_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw error;
      packs.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    return NextResponse.json(packs, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const requestId = logServerError("study-packs.list", error);
    return NextResponse.json({ error: "Could not load study history" }, { status: 500, headers: { "X-Request-ID": requestId } });
  }
}

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = randomUUID();
  try {
    const user = await requireUser();
    const input = await readJsonObject(request);
    const allowedFields = new Set(["courseId", "mode", "difficulty", "count", "topic", "moduleIds"]);
    if (!input || Object.keys(input).some((key) => !allowedFields.has(key)) || !isUuid(input.courseId) || !["flashcards", "quiz", "mixed"].includes(input.mode as string) || !["easy", "medium", "hard", "mixed"].includes(input.difficulty as string) || !Number.isInteger(input.count) || (input.count as number) < 1 || (input.count as number) > 15 || (input.topic != null && (typeof input.topic !== "string" || input.topic.length > 300))) return NextResponse.json({ error: "Invalid study pack request" }, { status: 400 });
    if (!Array.isArray(input.moduleIds) || input.moduleIds.length < 1 || input.moduleIds.length > 2 || input.moduleIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(input.moduleIds).size !== input.moduleIds.length) return NextResponse.json({ error: "Select one or two modules" }, { status: 400 });
    const validInput = {
      courseId: input.courseId,
      mode: input.mode as "flashcards" | "quiz" | "mixed",
      difficulty: input.difficulty as "easy" | "medium" | "hard" | "mixed",
      count: input.count as number,
      moduleIds: input.moduleIds as number[],
      ...(typeof input.topic === "string" ? { topic: input.topic } : {}),
    };
    const course = (await listStudyPrepCourses(user.id)).find((item) => item.id === input.courseId);
    if (!course) return NextResponse.json({ error: "Selected course not found" }, { status: 404 });
    if (!course.rag_indexed_at) return NextResponse.json({ error: "Course is not indexed yet" }, { status: 409 });
    const db = supabaseAdmin();
    const { data: limited, error: limitError } = await db.rpc("check_rate_limit", { p_user_id: user.id, p_minute_limit: 5, p_day_limit: 40 });
    if (limitError) throw limitError;
    if (limited?.[0]?.allowed === false) return NextResponse.json({ error: "Study generation limit reached. Try again later." }, { status: 429 });
    const modules = await moduleMetadata(user.id, course);
    const selectedModules = validInput.moduleIds.map((id) => modules.find((module) => module.id === id && module.chunks > 0));
    if (selectedModules.some((module) => !module)) return NextResponse.json({ error: "Selected module is not indexed" }, { status: 422 });
    try {
      const generated = await generateStudyPack(user.id, course, validInput, requestId);
      if (!generated.grounded || !Array.isArray(generated.items) || generated.items.length !== input.count || generated.items.some((item: any) => !Array.isArray(item.citations) || !item.citations.length)) return NextResponse.json({ error: "Not enough cited course material to generate this pack" }, { status: 422 });
      const { data: pack, error } = await db.from("study_packs").insert({ user_id: user.id, course_id: course.id, title: generated.title, mode: input.mode, topic: input.topic ?? null, module: selectedModules.map((module) => module!.name).join(", ").slice(0, 200), difficulty: input.difficulty, item_count: generated.items.length, source_index_version: generated.source_index_version }).select().single();
      if (error) throw error;
      const items = generated.items.map((item: any, item_order: number) => ({ ...item, pack_id: pack.id, item_order }));
      const { error: itemsError } = await db.from("study_pack_items").insert(items);
      if (itemsError) { await db.from("study_packs").delete().eq("id", pack.id).eq("user_id", user.id); throw itemsError; }
      await db.from("ai_requests").insert({ user_id: user.id, feature: "study-prep", latency_ms: Date.now() - started, status: "ok" });
      invalidateUserCache(user.id);
      return NextResponse.json({ ...pack, items }, { status: 201, headers: { "X-Request-ID": requestId } });
    } catch (error) {
      await db.from("ai_requests").insert({ user_id: user.id, feature: "study-prep", latency_ms: Date.now() - started, status: "error", error: "generation_failed" });
      throw error;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logServerError("study-packs.generate", error, requestId);
    if (error instanceof StudyPrepServiceError) return NextResponse.json({ error: error.message }, { status: error.status === 422 || error.status === 504 ? error.status : 502, headers: { "X-Request-ID": requestId } });
    return NextResponse.json({ error: "Could not generate study pack" }, { status: 502, headers: { "X-Request-ID": requestId } });
  }
}
