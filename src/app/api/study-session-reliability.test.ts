import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: mocks.eq }) }),
  }),
}));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: mocks.invalidate }));
import { POST as start } from "./study-packs/[id]/sessions/route";
import { GET as load, PATCH as update } from "./study-sessions/[id]/route";
import { POST as attempt } from "./study-sessions/[id]/attempts/route";
import { GET as loadPack } from "./study-packs/[id]/route";

const id = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";
const params = { params: Promise.resolve({ id }) };
const request = (body: unknown = {}) => new Request("https://example.test/api/study", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
});

describe("study session atomic routes", () => {
  it("starts or resumes using the owner-bound atomic RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, status: "paused" }, error: null });
    const response = await start(request(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("start_study_session", { p_user_id: "owner", p_pack_id: id });
    expect(mocks.invalidate).toHaveBeenCalledWith("owner");
  });
  it("does not start another user's or missing pack", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect((await start(request(), params)).status).toBe(404);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("loads saved attempts with an explicit owner filter", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id, study_attempts: [{ item_id: itemId }] }, error: null });
    const response = await load(request(), params);
    expect(response.status).toBe(200);
    expect(mocks.eq.mock.calls).toEqual([["id", id], ["user_id", "owner"]]);
    expect((await response.json()).study_attempts).toHaveLength(1);
  });
  it("returns 404 for inaccessible sessions", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await load(request(), params)).status).toBe(404);
  });
  it("saves answer and grading via one owner-bound transaction", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, is_correct: false }, error: null });
    const response = await attempt(request({ itemId, answer: "Wrong", isCorrect: true }), params);
    expect(response.status).toBe(201);
    expect((await response.json()).is_correct).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith("save_study_attempt", {
      p_user_id: "owner", p_session_id: id, p_item_id: itemId, p_answer: "Wrong", p_is_correct: true, p_confidence: null,
    });
  });
  it("does not mutate completed or inaccessible sessions", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect((await attempt(request({ itemId, answer: "A", isCorrect: true }), params)).status).toBe(404);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it.each([{ answer: "x".repeat(4001) }, { itemId: "bad" }, { isCorrect: "true" }, { confidence: 6 }])("rejects invalid attempts: %j", async (invalid) => {
    expect((await attempt(request({ itemId, answer: "A", isCorrect: true, ...invalid }), params)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("updates progress and final score using one transaction", async () => {
    mocks.rpc.mockResolvedValue({ data: { id, status: "completed", score: 1 }, error: null });
    const response = await update(request({ status: "completed", current_item: 1 }), params);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("update_study_session", {
      p_user_id: "owner", p_session_id: id, p_current_item: 1, p_status: "completed",
    });
  });
  it("reports invalid/skipped progress as a recoverable conflict", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "private DB detail" } });
    const response = await update(request({ current_item: 1000 }), params);
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain("private DB detail");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("sorts pack items by their saved order before starting or resuming", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id, study_pack_items: [{ item_order: 2 }, { item_order: 0 }, { item_order: 1 }] }, error: null });
    const response = await loadPack(request(), params);
    expect((await response.json()).study_pack_items.map((item: { item_order: number }) => item.item_order)).toEqual([0, 1, 2]);
  });
});
