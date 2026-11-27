import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export type JobKind = "onboarding" | "sync" | "course_sync" | "study_prep";

export class StudyQueueError extends Error {
  constructor(message: string, readonly status: 429 | 503, readonly retryAfterSeconds: number) {
    super(message);
  }
}

export async function enqueueStudyPrepJob(userId: string, payload: Record<string, unknown>) {
  // Sorting module selection makes checkbox order irrelevant to deduplication.
  const canonical = { ...payload, moduleIds: [...payload.moduleIds as number[]].sort((a, b) => a - b) };
  const dedupe = `study:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`;
  const { data, error } = await supabaseAdmin().rpc("enqueue_study_prep_job", {
    p_user_id: userId, p_payload: canonical, p_dedupe_key: dedupe,
  });
  if (error) throw error;
  const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (!row || !Number.isSafeInteger(row.retry_after_seconds) || row.retry_after_seconds < 0) {
    throw new StudyQueueError("Study generation is temporarily unavailable. Please retry.", 503, 10);
  }
  if (typeof row.job_id === "string" && row.job_id && row.rejection === "busy" && row.retry_after_seconds === 0) {
    return { jobId: row.job_id, queued: true, alreadyActive: true };
  }
  if (row.job_id === null && row.rejection === "worker_unavailable" && row.retry_after_seconds > 0) {
    throw new StudyQueueError("Study generation is temporarily unavailable. Your choices are saved on this screen; please retry shortly.", 503, row.retry_after_seconds);
  }
  if (row.job_id === null && row.rejection === "limit" && row.retry_after_seconds > 0) {
    throw new StudyQueueError("Study generation limit reached. Please try again after the cooldown.", 429, row.retry_after_seconds);
  }
  if (typeof row.job_id !== "string" || !row.job_id || row.rejection !== null || row.retry_after_seconds !== 0) {
    throw new StudyQueueError("Study generation is temporarily unavailable. Please retry.", 503, 10);
  }
  return { jobId: row.job_id, queued: true };
}

export async function enqueueJob(userId: string, kind: JobKind, payload: Record<string, unknown> = {}) {
  const dedupe = kind === "study_prep"
    ? `study:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`
    : kind === "course_sync" ? `course:${payload.courseId}` : "sync";
  const { data, error } = await supabaseAdmin().rpc("enqueue_background_job", {
    p_user_id: userId, p_kind: kind, p_payload: payload, p_dedupe_key: dedupe,
  });
  if (error) throw error;
  return { jobId: data as string, queued: true };
}
