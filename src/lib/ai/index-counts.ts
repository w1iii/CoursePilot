import { sharedIndexEnabled } from "@/lib/ai/ingest";
import { normalizeCanvasInstance, sharedCourseKey } from "@/lib/ai/course-index";
import { signRagToken } from "@/lib/ai/rag-token";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { listCourses } from "@/lib/canvas";
import { env } from "@/lib/env";

type CourseRow = { id: string; canvas_course_id: number; selected_for_rag: boolean; rag_document_count: number | null; rag_chunk_count: number | null };

/** Fetch live shared totals only after verifying current Canvas enrollment. */
export async function withSharedIndexCounts<T extends CourseRow>(userId: string, courses: T[]): Promise<T[]> {
  if (!sharedIndexEnabled() || !courses.some((course) => course.selected_for_rag)) return courses;
  try {
    const { credentials, account } = await getCanvasCredentials(userId);
    if (account?.invalid_at) return courses;
    const active = new Set((await listCourses(credentials)).map((course) => course.id));
    const instance = normalizeCanvasInstance(credentials.baseUrl);
    const base = (env("RAG_API_URL") ?? "http://localhost:8000").replace(/\/$/, "");
    return await Promise.all(courses.map(async (course) => {
      if (!course.selected_for_rag || !active.has(course.canvas_course_id)) return course;
      try {
        const key = sharedCourseKey(instance, course.canvas_course_id);
        const token = signRagToken({ userId, courseKey: key, scope: "metadata", canvasCourseId: course.canvas_course_id, canvasInstance: instance });
        const response = await fetch(`${base}/api/v1/courses/${encodeURIComponent(key)}/index-counts`, {
          headers: { "X-RAG-Token": token }, signal: AbortSignal.timeout(10000), cache: "no-store",
        });
        if (!response.ok) return course;
        const counts = await response.json() as { documents?: unknown; chunks?: unknown };
        if (!Number.isSafeInteger(counts.documents) || !Number.isSafeInteger(counts.chunks) || (counts.documents as number) < 0 || (counts.chunks as number) < 0) return course;
        return { ...course, rag_document_count: counts.documents as number, rag_chunk_count: counts.chunks as number };
      } catch { return course; }
    }));
  } catch { return courses; }
}
