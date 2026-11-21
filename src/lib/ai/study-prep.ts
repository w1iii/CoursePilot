import { env } from "@/lib/env";
import { signRagToken } from "@/lib/ai/rag-token";
import { sharedCourseKey } from "@/lib/ai/course-index";
import type { CourseOption } from "@/lib/ai/rag";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { normalizeCanvasInstance } from "@/lib/ai/course-index";

const base = () => (env("RAG_API_URL") ?? "http://localhost:8000").replace(/\/$/, "");
const STUDY_PREP_TIMEOUT_MS = 120_000;

export class StudyPrepServiceError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function moduleMetadata(userId: string, course: CourseOption): Promise<Array<{ id: number; name: string; documents: number; chunks: number }>> {
  const shared = Boolean(env("RAG_SHARED_INDEX_ENABLED") === "true");
  const credentials = shared ? await getCanvasCredentials(userId) : null;
  const instance = credentials ? normalizeCanvasInstance(credentials.credentials.baseUrl) : undefined;
  const key = shared ? sharedCourseKey(instance!, course.canvas_course_id) : course.id;
  const token = signRagToken({ userId, courseKey: key, scope: "metadata", ...(shared ? { canvasCourseId: course.canvas_course_id, canvasInstance: instance } : {}) });
  const response = await fetch(`${base()}/api/v1/courses/${encodeURIComponent(key)}/modules`, { headers: { "X-RAG-Token": token }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!response.ok) throw new StudyPrepServiceError("Module lookup failed", response.status);
  const body = await response.json() as { modules?: Array<{ id: number; name: string; documents: number; chunks: number }> };
  return Array.isArray(body.modules) ? body.modules : [];
}

export async function generateStudyPack(userId: string, course: CourseOption, input: { module?: string; moduleId?: number; topic?: string; mode: "flashcards" | "quiz" | "mixed"; count: number; difficulty: "easy" | "medium" | "hard" | "mixed" }, requestId?: string) {
  const shared = env("RAG_SHARED_INDEX_ENABLED") === "true";
  const credentials = shared ? await getCanvasCredentials(userId) : null;
  const instance = credentials ? normalizeCanvasInstance(credentials.credentials.baseUrl) : undefined;
  const key = shared ? sharedCourseKey(instance!, course.canvas_course_id) : course.id;
  const token = signRagToken({ userId, courseKey: key, scope: "study-prep", ...(shared ? { canvasCourseId: course.canvas_course_id, canvasInstance: instance } : {}) });
  const response = await fetch(`${base()}/api/v1/study-prep`, { method: "POST", headers: { "Content-Type": "application/json", "X-RAG-Token": token, ...(requestId ? { "X-Request-ID": requestId } : {}) }, body: JSON.stringify({ course_key: key, module: input.module || null, module_id: input.moduleId ?? null, topic: input.topic || null, mode: input.mode, count: input.count, difficulty: input.difficulty }), signal: AbortSignal.timeout(STUDY_PREP_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) {
    const message = response.status === 422
      ? "Invalid study request. Check the selected course and module."
      : response.status === 504
        ? "Study generation took too long. Try fewer items or a narrower scope."
        : "Study content generation failed.";
    throw new StudyPrepServiceError(message, response.status);
  }
  try { return await response.json() as { title: string; items: unknown[]; grounded: boolean; source_index_version: string }; }
  catch { throw new StudyPrepServiceError("Study content service returned an invalid response.", 502); }
}
