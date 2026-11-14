import { NextResponse } from "next/server";

import { invalidateUserCache } from "@/lib/cache";
import { deleteRagCourse, ingestCanvasCourse } from "@/lib/ai/ingest";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { listCourses } from "@/lib/canvas";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { courseId?: unknown; selected?: unknown } | null;
    if (typeof body?.courseId !== "string" || typeof body.selected !== "boolean") {
      return NextResponse.json({ error: "Invalid course selection" }, { status: 400 });
    }
    const sb = supabaseAdmin();
    const { data: course, error: findError } = await sb.from("courses")
      .select("id, canvas_course_id").eq("id", body.courseId).eq("user_id", user.id).maybeSingle();
    if (findError) throw findError;
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    if (!body.selected) {
      // Student deselection revokes their access, not the shared index.
      await deleteRagCourse({ userId: user.id, courseKey: course.id, canvasCourseId: course.canvas_course_id });
      const { error } = await sb.from("courses").update({
        selected_for_rag: false,
        rag_indexed_at: null,
        rag_document_count: 0,
        rag_chunk_count: 0,
        rag_failure_count: 0,
      }).eq("id", course.id).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { credentials, account } = await getCanvasCredentials(user.id);
      if (account?.invalid_at || !(await listCourses(credentials)).some((item) => item.id === course.canvas_course_id)) {
        return NextResponse.json({ error: "Course is not active in this Canvas account" }, { status: 403 });
      }
      const { error } = await sb.from("courses").update({ selected_for_rag: true })
        .eq("id", course.id).eq("user_id", user.id);
      if (error) throw error;
      const ingestion = await ingestCanvasCourse({
        userId: user.id,
        courseKey: course.id,
        canvasCourseId: course.canvas_course_id,
        canvasBaseUrl: credentials.baseUrl,
        canvasAccessToken: credentials.token,
      });
      const { error: statusError } = await sb.from("courses").update({
        rag_indexed_at: new Date().toISOString(),
        rag_document_count: ingestion.documents,
        rag_chunk_count: ingestion.chunks,
        rag_failure_count: ingestion.failures,
      }).eq("id", course.id).eq("user_id", user.id);
      if (statusError) throw statusError;
    }
    invalidateUserCache(user.id);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("course selection update failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not update course index" }, { status: 500 });
  }
}
