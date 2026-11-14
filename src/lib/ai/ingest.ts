import { env } from "@/lib/env";
import { signRagToken } from "@/lib/ai/rag-token";
import { normalizeCanvasInstance, sharedCourseKey } from "@/lib/ai/course-index";

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_ATTEMPTS = 2;

export interface RagCourseIngestion {
  documents: number;
  chunks: number;
  failures: number;
  skipped: number;
  failureDetails: string[];
  skippedDetails: string[];
}

export function ragIngestionEnabled(): boolean {
  return env("RAG_INGESTION_ENABLED") !== "false";
}

export function sharedIndexEnabled(): boolean {
  return env("RAG_SHARED_INDEX_ENABLED") === "true";
}

export function ragIngestMaxCourses(): number {
  const raw = Number(env("RAG_INGEST_MAX_COURSES") ?? "3");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3;
}

export function ragReindexHours(): number {
  const raw = Number(env("RAG_REINDEX_HOURS") ?? "24");
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

function ragBaseUrl(): string {
  const url = (env("RAG_API_URL") ?? "http://localhost:8000").replace(/\/$/, "");
  const parsed = new URL(url);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:" &&
      !(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
    throw new Error("RAG ingestion requires HTTPS in production");
  }
  return url;
}

function timeoutMs(): number {
  const raw = Number(env("RAG_INGEST_TIMEOUT_MS") ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function maxAttempts(): number {
  const raw = Number(env("RAG_INGEST_MAX_ATTEMPTS") ?? DEFAULT_MAX_ATTEMPTS);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_MAX_ATTEMPTS;
}

async function errorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { detail?: unknown; error?: unknown };
    if (typeof json.detail === "string") return json.detail;
    if (typeof json.error === "string") return json.error;
  } catch {
    // fall through to raw text
  }
  return text.slice(0, 200);
}

/**
 * Ingest a Canvas course's module Files/Pages into the RAG knowledge base.
 *
 * The user's Canvas credentials are sent per request and are never stored by
 * the RAG service.
 */
export async function ingestCanvasCourse(input: {
  userId: string;
  courseKey: string;
  canvasCourseId: number;
  canvasBaseUrl: string;
  canvasAccessToken: string;
}): Promise<RagCourseIngestion> {
  const canvasInstance = normalizeCanvasInstance(input.canvasBaseUrl);
  const shared = sharedIndexEnabled();
  const indexKey = shared ? sharedCourseKey(canvasInstance, input.canvasCourseId) : input.courseKey;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts(); attempt += 1) {
    // Re-sign per attempt: ingestion can outlive a single short-lived token.
    const token = signRagToken({
      userId: input.userId,
      courseKey: indexKey,
      ...(shared ? { canvasInstance } : {}),
      scope: "ingest",
      canvasCourseId: input.canvasCourseId,
      ttlSeconds: 300,
    });

    let res: Response;
    try {
      res = await fetch(`${ragBaseUrl()}/api/v1/ingestion/canvas-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RAG-Token": token,
        },
        body: JSON.stringify({
          course_key: indexKey,
          canvas_course_id: input.canvasCourseId,
          canvas_base_url: input.canvasBaseUrl,
          canvas_access_token: input.canvasAccessToken,
        }),
        signal: AbortSignal.timeout(timeoutMs()),
        cache: "no-store",
      });
    } catch (err) {
      lastError = new Error(`RAG ingestion request failed: ${(err as Error).message}`);
      continue;
    }

    if (!res.ok) {
      const detail = await errorDetail(res);
      const retryable = res.status >= 500 || res.status === 429;
      lastError = new Error(`RAG ingestion failed (${res.status}): ${detail}`);
      if (!retryable) throw lastError;
      continue;
    }

    const json = (await res.json()) as {
      modules?: Array<{
        failures?: Array<{ source_key?: string; error?: string }>;
        skipped?: string[];
      }>;
      document_count?: number;
      chunk_count?: number;
      failure_count?: number;
      skipped_count?: number;
    };

    return {
      documents: json.document_count ?? 0,
      chunks: json.chunk_count ?? 0,
      failures: json.failure_count ?? 0,
      skipped: json.skipped_count ?? 0,
      failureDetails: (json.modules ?? []).flatMap((module) =>
        (module.failures ?? []).map((failure) =>
          `${failure.source_key ?? "Canvas item"}: ${failure.error ?? "unknown error"}`,
        ),
      ),
      skippedDetails: (json.modules ?? []).flatMap((module) => module.skipped ?? []),
    };
  }

  throw lastError ?? new Error("RAG ingestion failed");
}

export async function deleteRagCourse(input: {
  userId: string;
  courseKey: string;
  canvasCourseId: number;
}): Promise<void> {
  if (sharedIndexEnabled()) return; // Student disconnect must not delete shared vectors.
  const token = signRagToken({
    userId: input.userId, courseKey: input.courseKey, scope: "delete",
    canvasCourseId: input.canvasCourseId,
  });
  const response = await fetch(`${ragBaseUrl()}/api/v1/ingestion/course/${encodeURIComponent(input.courseKey)}`, {
    method: "DELETE", headers: { "X-RAG-Token": token },
    signal: AbortSignal.timeout(timeoutMs()), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not remove course material from the index");
}
