import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export type JobKind = "onboarding" | "sync" | "course_sync" | "study_prep";

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
