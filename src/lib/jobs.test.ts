import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc }) }));
import { enqueueJob, enqueueStudyPrepJob } from "./jobs";

describe("durable job publication", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: "job-1", error: null }); });
  it("deduplicates full sync and onboarding into the same active slot", async () => {
    await enqueueJob("user", "sync");
    await enqueueJob("user", "onboarding");
    expect(rpc.mock.calls.map((call) => call[1].p_dedupe_key)).toEqual(["sync", "sync"]);
  });
  it("isolates course and study request dedupe keys", async () => {
    expect(await enqueueJob("user", "course_sync", { courseId: "c1" })).toEqual({ queued: true, jobId: "job-1" });
    expect(rpc.mock.lastCall?.[1].p_dedupe_key).toBe("course:c1");
    await enqueueJob("user", "study_prep", { courseId: "c1", count: 10 });
    const first = rpc.mock.lastCall?.[1].p_dedupe_key;
    await enqueueJob("user", "study_prep", { courseId: "c1", count: 10 });
    expect(rpc.mock.lastCall?.[1].p_dedupe_key).toBe(first);
    await enqueueJob("user", "study_prep", { courseId: "c1", count: 20 });
    expect(rpc.mock.lastCall?.[1].p_dedupe_key).not.toBe(first);
  });
  it("does not report acceptance when persistence fails", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("database unavailable") });
    await expect(enqueueJob("user", "sync")).rejects.toThrow("database unavailable");
  });
});

describe("atomic study quota and worker readiness", () => {
  const payload = { courseId: "course", mode: "quiz", difficulty: "mixed", count: 10, moduleIds: [2, 1] };
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [{ job_id: "job", rejection: null, retry_after_seconds: 0 }], error: null });
  });
  it("uses the atomic RPC and canonicalizes module selection for dedupe", async () => {
    expect(await enqueueStudyPrepJob("user", payload)).toEqual({ queued: true, jobId: "job" });
    const first = rpc.mock.lastCall?.[1].p_dedupe_key;
    expect(rpc.mock.lastCall?.[0]).toBe("enqueue_study_prep_job");
    expect(rpc.mock.lastCall?.[1].p_payload.moduleIds).toEqual([1, 2]);
    await enqueueStudyPrepJob("user", { ...payload, moduleIds: [1, 2] });
    expect(rpc.mock.lastCall?.[1].p_dedupe_key).toBe(first);
    expect(payload.moduleIds).toEqual([2, 1]);
  });
  it.each([
    ["limit", 429], ["worker_unavailable", 503],
  ])("reports %s without claiming acceptance", async (rejection, status) => {
    rpc.mockResolvedValue({ data: [{ job_id: null, rejection, retry_after_seconds: 20 }], error: null });
    await expect(enqueueStudyPrepJob("user", payload)).rejects.toMatchObject({ status, retryAfterSeconds: 20 });
  });
  it("reuses the user's active study job even for a different scope", async () => {
    rpc.mockResolvedValue({ data: [{ job_id: "existing", rejection: "busy", retry_after_seconds: 0 }], error: null });
    expect(await enqueueStudyPrepJob("user", payload)).toEqual({ queued: true, jobId: "existing", alreadyActive: true });
  });
  it.each([null, [], {}, [{ job_id: "job" }], [{ job_id: null, rejection: "unexpected", retry_after_seconds: 0 }], [{ job_id: "job", rejection: null, retry_after_seconds: -1 }]])("fails closed on malformed RPC data: %j", async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(enqueueStudyPrepJob("user", payload)).rejects.toMatchObject({ status: 503 });
  });
});
