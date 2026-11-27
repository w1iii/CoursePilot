import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), from: vi.fn(), getCredentials: vi.fn(), listCourses: vi.fn(),
  ingest: vi.fn(), enqueue: vi.fn(), invalidate: vi.fn(), update: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock("@/lib/user", () => ({ requireUser: mocks.requireUser, UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/canvas-account", () => ({ getCanvasCredentials: mocks.getCredentials }));
vi.mock("@/lib/canvas", () => ({ listCourses: mocks.listCourses }));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: mocks.invalidate }));
vi.mock("@/lib/jobs", () => ({ enqueueJob: mocks.enqueue }));
vi.mock("@/lib/ai/ingest", () => ({ ingestCanvasCourse: mocks.ingest, deleteRagCourse: vi.fn(), ragIndexStatus: () => ({ rag_document_count: 1 }) }));

import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
function call(courseId = id) {
  return POST(new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, selected: true }) }));
}

describe("course selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    const lookup = { eq: vi.fn().mockReturnThis(), maybeSingle: mocks.maybeSingle };
    const updateQuery = { eq: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
    mocks.from.mockReturnValue({ select: () => lookup, update: mocks.update });
    mocks.update.mockReturnValue(updateQuery);
    mocks.maybeSingle.mockResolvedValue({ data: { id, canvas_course_id: 42 }, error: null });
    mocks.getCredentials.mockResolvedValue({ credentials: { baseUrl: "https://canvas.test", token: "secret" }, account: {} });
    mocks.listCourses.mockResolvedValue([{ id: 42 }]);
    mocks.ingest.mockResolvedValue({});
    mocks.enqueue.mockResolvedValue({ jobId: "job", queued: true });
  });

  it("selects and queues an active owned course without waiting for indexing", async () => {
    expect((await call()).status).toBe(202);
    expect(mocks.update).toHaveBeenCalledWith({ selected_for_rag: true });
    expect(mocks.enqueue).toHaveBeenCalledWith("user-a", "course_sync", { courseId: id });
    expect(mocks.ingest).not.toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalledWith("user-a");
  });

  it("rejects invalid, unowned, and inactive courses", async () => {
    expect((await call("invalid")).status).toBe(400);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await call()).status).toBe(404);
    mocks.listCourses.mockResolvedValueOnce([]);
    expect((await call()).status).toBe(403);
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("invalidates cached selection even when queue publication fails", async () => {
    mocks.enqueue.mockRejectedValueOnce(new Error("queue unavailable"));
    expect((await call()).status).toBe(500);
    expect(mocks.invalidate).toHaveBeenCalledWith("user-a");
  });
});
