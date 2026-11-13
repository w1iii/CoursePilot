import { NextResponse } from "next/server";

import { invalidateUserCache } from "@/lib/cache";
import { listCourses } from "@/lib/canvas";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { ingestCanvasCourse } from "@/lib/ai/ingest";
import { syncCanvas } from "@/lib/sync";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { courseIds?: unknown } | null;
    const requested = Array.isArray(body?.courseIds)
      ? [...new Set(body.courseIds.filter((id): id is string => typeof id === "string"))]
      : [];
    if (requested.length === 0 || requested.length > 100) {
      return NextResponse.json({ error: "Choose at least one course" }, { status: 400 });
    }

    const { credentials } = await getCanvasCredentials(user.id);
    const canvasCourses = await listCourses(credentials);
    const sb = supabaseAdmin();
    const { data: enrolledRows, error: enrolledError } = await sb.from("courses")
      .select("id, canvas_course_id").eq("user_id", user.id);
    if (enrolledError) throw enrolledError;
    const courseMap = new Map((enrolledRows ?? []).map((course) => [course.id, course.canvas_course_id]));
    const requestedCanvasIds = requested.map((id) => courseMap.get(id));
    const validCanvasIds = new Set(canvasCourses.map((course) => course.id));
    if (requestedCanvasIds.some((id) => id === undefined || !validCanvasIds.has(id))) {
      return NextResponse.json({ error: "One or more courses are not enrolled in this Canvas account" }, { status: 400 });
    }

    const { error: clearError } = await sb.from("courses")
      .update({ selected_for_rag: false })
      .eq("user_id", user.id);
    if (clearError) throw clearError;

    const selectedCanvasIds = new Set(requestedCanvasIds);
    const chosen = canvasCourses.filter((course) => selectedCanvasIds.has(course.id));
    const { error: saveError } = await sb.from("courses").upsert(chosen.map((course) => ({
      user_id: user.id,
      canvas_course_id: course.id,
      course_code: course.course_code || null,
      course_name: course.name,
      selected_for_rag: true,
    })), { onConflict: "user_id,canvas_course_id" });
    if (saveError) throw saveError;

    const { error: completeError } = await sb.from("users")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);
    if (completeError) throw completeError;

    const sync = await syncCanvas(user);
    const { data: pending, error: pendingError } = await sb.from("courses")
      .select("id, canvas_course_id, course_name")
      .eq("user_id", user.id)
      .eq("selected_for_rag", true)
      .is("rag_indexed_at", null);
    if (pendingError) throw pendingError;

    let additionalFailures = 0;
    for (const course of pending ?? []) {
      try {
        const result = await ingestCanvasCourse({
          userId: user.id,
          courseKey: course.id,
          canvasCourseId: course.canvas_course_id,
          canvasBaseUrl: credentials.baseUrl,
          canvasAccessToken: credentials.token,
        });
        const { error: updateError } = await sb.from("courses").update({
          rag_indexed_at: new Date().toISOString(),
          rag_document_count: result.documents,
          rag_chunk_count: result.chunks,
          rag_failure_count: result.failures,
        }).eq("id", course.id).eq("user_id", user.id);
        if (updateError) throw updateError;
        additionalFailures += result.failures;
      } catch {
        additionalFailures += 1;
      }
    }
    const { data: indexedRows, error: indexedError } = await sb.from("courses")
      .select("id").eq("user_id", user.id).eq("selected_for_rag", true).not("rag_indexed_at", "is", null);
    if (indexedError) throw indexedError;
    invalidateUserCache(user.id);
    return NextResponse.json({
      complete: true,
      selected: requested.length,
      indexed: indexedRows?.length ?? 0,
      errors: sync.errors.length || additionalFailures ? ["Some courses may need another sync to finish indexing."] : [],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("onboarding completion failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not finish setup. Please retry." }, { status: 500 });
  }
}
