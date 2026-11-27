import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { supabaseAdmin } from "@/lib/supabase";
import { syncCanvas } from "@/lib/sync";
import { jobContext } from "@/lib/job-context";
import { listStudyPrepCourses } from "@/lib/ai/study-prep-courses";
import { generateStudyPack, moduleMetadata, StudyPrepServiceError } from "@/lib/ai/study-prep";
import { CanvasNotConnectedError } from "@/lib/canvas-account";
import type { JobKind } from "@/lib/jobs";
import type { AppUser } from "@/lib/user";
import { logServerError } from "@/lib/server-error";

type Job = { id: string; user_id: string; kind: JobKind; payload: Record<string, unknown>; attempts: number };
class PermanentJobError extends Error {}

export async function executeJob(job: Job, token: string) {
  const db = supabaseAdmin();
  if (job.kind === "study_prep") {
    const { data: saved, error: savedError } = await db.from("study_packs").select("id")
      .eq("background_job_id", job.id).maybeSingle();
    if (savedError) throw savedError;
    if (saved) return { status: "succeeded", result: { packId: saved.id }, error: null };
    const course = (await listStudyPrepCourses(job.user_id)).find((c) => c.id === job.payload.courseId);
    if (!course?.rag_indexed_at) throw new PermanentJobError("Course is not indexed. Sync it before trying again.");
    // Old queue payloads may contain moduleId or whole-course scope. Never
    // silently broaden generation: ask those users to submit with the new UI.
    const ids = job.payload.moduleIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2 ||
      ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length ||
      !Number.isInteger(job.payload.count) || (job.payload.count as number) < 1 || (job.payload.count as number) > 15 ||
      !["flashcards", "quiz", "mixed"].includes(String(job.payload.mode)) ||
      !["easy", "medium", "hard", "mixed"].includes(String(job.payload.difficulty)) ||
      (job.payload.topic != null && (typeof job.payload.topic !== "string" || job.payload.topic.length > 300))) {
      throw new PermanentJobError("Study request needs updating. Select one or two modules and create a new pack.");
    }
    const modules = await moduleMetadata(job.user_id, course);
    const selectedModules = ids.map((id) => modules.find((module) => module.id === id && module.chunks > 0));
    if (selectedModules.some((module) => !module)) {
      throw new PermanentJobError("Selected module is no longer indexed. Sync the course and create a new pack.");
    }
    const input = job.payload as Parameters<typeof generateStudyPack>[2];
    const generated = await generateStudyPack(job.user_id, course, input, job.id);
    if (!generated.grounded || !Array.isArray(generated.items) || generated.items.length !== input.count ||
      generated.items.some((item) => !item || typeof item !== "object" ||
        !Array.isArray((item as { citations?: unknown }).citations) || !(item as { citations: unknown[] }).citations.length)) {
      throw new PermanentJobError("Not enough cited course material. Try a different scope.");
    }
    const { data: packId, error } = await db.rpc("save_background_study_pack", {
      p_job_id: job.id, p_token: token,
      p_pack: { course_id: course.id, title: generated.title, mode: input.mode, topic: input.topic ?? null,
        module: selectedModules.map((module) => module!.name).join(", ").slice(0, 200),
        difficulty: input.difficulty, source_index_version: generated.source_index_version },
      p_items: generated.items,
    });
    if (error) throw error;
    return { status: "succeeded", result: { packId }, error: null };
  }
  const { data: user, error } = await db.from("users").select("*").eq("id", job.user_id).single();
  if (error) throw error;
  const result = await syncCanvas(user as AppUser, {
    selectedCoursesOnly: job.payload.scheduled !== true,
    selectedCourseId: job.kind === "course_sync" ? String(job.payload.courseId) : undefined,
    allSelectedCourses: job.kind === "onboarding",
  });
  // Detailed upstream errors remain server-side, not in user-facing job JSON.
  const hasErrors = result.errors.length > 0 || result.ragFailures > 0;
  return {
    status: hasErrors ? result.courses === 0 ? "failed" : "partial_failure" : "succeeded",
    result: { ...result, errors: hasErrors ? ["Some data could not be synchronized. Resync affected courses."] : [],
      ragFailureDetails: [], ragSkippedDetails: [] },
    error: hasErrors ? "Some data could not be synchronized. Check Canvas connection and resync affected courses." : null,
  };
}

export async function runWorker() {
  let stopping = false;
  process.on("SIGTERM", () => { stopping = true; });
  process.on("SIGINT", () => { stopping = true; });
  const workerId = randomUUID();
  let lastReadiness = 0;
  while (!stopping) {
    const db = supabaseAdmin();
    if (Date.now() - lastReadiness >= 20_000) {
      const { error } = await db.rpc("report_study_worker_ready", { p_worker_id: workerId });
      if (error) { console.error("study worker readiness failed", error.code); await delay(5000); continue; }
      lastReadiness = Date.now();
    }
    const token = randomUUID();
    const { data, error } = await db.rpc("claim_background_job", { p_token: token, p_study_protocol: 2 });
    if (error) { console.error("job claim failed", error.code); await delay(5000); continue; }
    const job = data?.[0] as Job | undefined;
    if (!job) { await delay(2000); continue; }
    let progress = job.kind === "study_prep" ? "Generating study pack" : "Syncing Canvas";
    let heartbeatBusy = false;
    const heartbeat = setInterval(async () => {
      if (heartbeatBusy) return;
      heartbeatBusy = true;
      try {
        const { data: owned, error: leaseError } = await db.rpc("heartbeat_background_job", {
          p_id: job.id, p_token: token, p_progress: progress,
        });
        // Stop all local writes if ownership is uncertain; supervisor restarts.
        if (leaseError || !owned) process.exit(1);
        const { error: readinessError } = await db.rpc("report_study_worker_ready", { p_worker_id: workerId });
        if (readinessError) console.error("study worker readiness failed", readinessError.code);
      } catch { process.exit(1); }
      finally { heartbeatBusy = false; }
    }, 20_000);
    const deadline = setTimeout(() => process.exit(1), 2 * 60 * 60 * 1000);
    try {
      const completed = await jobContext.run({ id: job.id, progress: (message) => { progress = message; } },
        () => executeJob(job, token));
      const { error: finishError } = await db.rpc("finish_background_job", {
        p_id: job.id, p_token: token, p_status: completed.status,
        p_result: completed.result, p_error: completed.error,
      });
      if (finishError) throw finishError;
    } catch (err) {
      logServerError(`background-job.${job.kind}`, err, job.id);
      const permanent = err instanceof PermanentJobError || err instanceof CanvasNotConnectedError ||
        (err instanceof StudyPrepServiceError && [400, 403, 404, 409, 422].includes(err.status));
      const message = err instanceof PermanentJobError || err instanceof StudyPrepServiceError || err instanceof CanvasNotConnectedError
        ? err.message : "Work could not be completed. Please try again.";
      const { error: finishError } = await db.rpc("finish_background_job", {
        p_id: job.id, p_token: token, p_status: !permanent && job.attempts < 3 ? "queued" : "failed",
        p_result: null, p_error: message,
      });
      if (finishError) console.error("job result could not be saved", job.id);
    } finally {
      clearInterval(heartbeat);
      clearTimeout(deadline);
    }
  }
}
