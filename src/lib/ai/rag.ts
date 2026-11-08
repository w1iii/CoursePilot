import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { signRagToken } from "@/lib/ai/rag-token";

export interface CourseOption {
  id: string;
  canvas_course_id: number;
  course_name: string;
  course_code: string | null;
}

interface RagCitation {
  label: string;
  chunk_id: string;
  document_id: string;
  title: string;
  source_type: string;
  chunk_index: number;
}

interface RagChatResponse {
  answer: string;
  citations: RagCitation[];
  model: string;
  grounded: boolean;
}

export interface RagSource {
  id: string;
  label: string;
  title: string;
  source_type: string;
  chunk_index: number;
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
  model: string;
  grounded: boolean;
  course: { id: string; name: string };
}

export class CourseSelectionError extends Error {
  constructor(
    message: string,
    readonly courses: CourseOption[],
  ) {
    super(message);
    this.name = "CourseSelectionError";
  }
}

export class RagServiceError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "RagServiceError";
  }
}

function ragBaseUrl(): string {
  const url = (env("RAG_API_URL") ?? "http://localhost:8000").replace(/\/$/, "");
  const parsed = new URL(url);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:" &&
      !(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
    throw new Error("RAG service requires HTTPS in production");
  }
  return url;
}

function ragTimeoutMs(): number {
  const configured = Number(env("RAG_TIMEOUT_MS"));
  return Number.isFinite(configured) && configured > 0 ? configured : 30_000;
}

export async function listCoursesForUser(userId: string): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin()
    .from("courses")
    .select("id, canvas_course_id, course_name, course_code")
    .eq("user_id", userId)
    .order("course_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load courses: ${error.message}`);
  }

  return (data ?? []) as CourseOption[];
}

async function readErrorDetail(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `RAG service error ${res.status}`;

  try {
    const body = JSON.parse(text) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.error === "string") return body.error;
    if (Array.isArray(body.detail)) return JSON.stringify(body.detail);
  } catch {
    // Fall through to raw text.
  }

  return text;
}

async function resolveCourse(
  userId: string,
  courseId: string | undefined,
): Promise<CourseOption> {
  const courses = await listCoursesForUser(userId);

  if (courses.length === 0) {
    throw new CourseSelectionError(
      "No synced courses found. Sync Canvas before asking the assistant.",
      [],
    );
  }

  if (courseId) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      throw new CourseSelectionError("Course not found for this user.", courses);
    }
    return course;
  }

  if (courses.length > 1) {
    throw new CourseSelectionError("Select a course before asking.", courses);
  }

  return courses[0];
}

export async function answerQuestion(
  userId: string,
  question: string,
  courseId?: string,
): Promise<RagAnswer> {
  const course = await resolveCourse(userId, courseId);

  let res: Response;
  try {
    const token = signRagToken({
      userId,
      courseKey: course.id,
      scope: "chat",
    });
    res = await fetch(`${ragBaseUrl()}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RAG-Token": token,
      },
      body: JSON.stringify({
        course_key: course.id,
        question,
      }),
      signal: AbortSignal.timeout(ragTimeoutMs()),
      cache: "no-store",
    });
  } catch (err) {
    const reason = (err as Error).name === "TimeoutError" ? "timed out" : "unreachable";
    throw new RagServiceError(`RAG service ${reason} at ${ragBaseUrl()}.`);
  }

  if (!res.ok) {
    throw new RagServiceError(await readErrorDetail(res), res.status);
  }

  const body = (await res.json()) as RagChatResponse;

  return {
    answer: body.answer,
    grounded: body.grounded,
    model: body.model,
    course: { id: course.id, name: course.course_name },
    sources: body.citations.map((citation) => ({
      id: citation.chunk_id,
      label: citation.label,
      title: citation.title,
      source_type: citation.source_type,
      chunk_index: citation.chunk_index,
    })),
  };
}
