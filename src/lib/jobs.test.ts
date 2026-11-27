import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc }) }));
import { enqueueJob } from "./jobs";

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
