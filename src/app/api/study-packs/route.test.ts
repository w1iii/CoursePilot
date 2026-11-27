import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), courses: vi.fn(), metadata: vi.fn(), enqueue: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/ai/study-prep-courses", () => ({ listStudyPrepCourses: mocks.courses }));
vi.mock("@/lib/ai/study-prep", () => ({ moduleMetadata: mocks.metadata, StudyPrepServiceError: class extends Error {} }));
vi.mock("@/lib/jobs", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/jobs")>(), enqueueStudyPrepJob: mocks.enqueue }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: vi.fn() }));
import { POST } from "./route";
import { UnauthorizedError } from "@/lib/user";
import { StudyQueueError } from "@/lib/jobs";

const courseId = "11111111-1111-4111-8111-111111111111";
const valid = { courseId, moduleIds: [1, 2], count: 15, mode: "quiz", difficulty: "mixed", topic: "key terms" };
const request = (body: unknown) => new Request("http://localhost/api/study-packs", { method: "POST", body: JSON.stringify(body) });

describe("study pack validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.enqueue.mockResolvedValue({ queued: true, jobId: "job" });
    mocks.courses.mockResolvedValue([{ id: courseId, rag_indexed_at: "2026-01-01" }]);
    mocks.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
    mocks.metadata.mockResolvedValue([{ id: 1, name: "One", chunks: 2 }, { id: 2, name: "Two", chunks: 3 }]);
  });
  it.each([{ moduleIds: [] }, { moduleIds: [1, 2, 3] }, { moduleIds: [1, 1] }, { moduleIds: [true] }, { moduleIds: [-1] }, { count: 16 }, { topic: "x".repeat(301) }, { moduleId: 1 }])("rejects invalid input %o", async (invalid) => {
    expect((await POST(request({ ...valid, ...invalid }))).status).toBe(400);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("rejects a module not indexed for the selected course", async () => {
    expect((await POST(request({ ...valid, moduleIds: [1, 99] }))).status).toBe(422);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("queues both modules and focus without generating or writing a pack in the request", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ queued: true, jobId: "job" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(mocks.enqueue).toHaveBeenCalledWith("user", valid);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([404, 409])("rejects unavailable course (%s) without enqueueing", async (status) => {
    if (status === 404) mocks.courses.mockResolvedValue([]);
    if (status === 409) mocks.courses.mockResolvedValue([{ id: courseId, rag_indexed_at: null }]);
    expect((await POST(request(valid))).status).toBe(status);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it.each([429, 503] as const)("returns actionable queue rejection (%s) with retry timing", async (status) => {
    mocks.enqueue.mockRejectedValue(new StudyQueueError("Please retry shortly.", status, 30));
    const response = await POST(request(valid));
    expect(response.status).toBe(status);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "Please retry shortly.", retryAfterSeconds: 30 });
  });
  it("does not enqueue unauthenticated requests", async () => {
    mocks.user.mockRejectedValue(new UnauthorizedError());
    expect((await POST(request(valid))).status).toBe(401);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("rejects modules with no indexed chunks", async () => {
    mocks.metadata.mockResolvedValue([{ id: 1, name: "One", chunks: 0 }]);
    expect((await POST(request({ ...valid, moduleIds: [1] }))).status).toBe(422);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
