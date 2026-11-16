import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), checkRateLimit: vi.fn(), maybeSingle: vi.fn(),
  eq: vi.fn(), select: vi.fn(), from: vi.fn(), getCanvasCredentials: vi.fn(),
  backfill: vi.fn(), shared: vi.fn(),
}));
vi.mock("@/lib/user", () => ({ requireUser: mocks.requireUser, UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit, rateLimitMessage: () => "Rate limited" }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/canvas-account", () => ({ getCanvasCredentials: mocks.getCanvasCredentials }));
vi.mock("@/lib/ai/ingest", () => ({ backfillModuleMetadata: mocks.backfill, sharedIndexEnabled: mocks.shared }));

import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const call = (courseId = id) => POST(new Request("https://example.test", { method: "POST", headers: { origin: "https://example.test" } }), { params: Promise.resolve({ courseId }) });

describe("module metadata refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.shared.mockReturnValue(false);
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { id, canvas_course_id: 42 }, error: null });
    mocks.getCanvasCredentials.mockResolvedValue({ source: "user", credentials: { baseUrl: "https://canvas.test", token: "secret" } });
    mocks.backfill.mockResolvedValue(undefined);
  });

  it("scopes the lookup and backfill to the signed-in owner", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(mocks.eq).toHaveBeenCalledWith("selected_for_rag", true);
    expect(mocks.backfill).toHaveBeenCalledWith({ userId: "user-a", courseKey: id, canvasCourseId: 42, canvasBaseUrl: "https://canvas.test", canvasAccessToken: "secret" });
  });

  it("rejects unowned courses before accessing credentials", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await call()).status).toBe(404);
    expect(mocks.getCanvasCredentials).not.toHaveBeenCalled();
    expect(mocks.backfill).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(new Request("https://example.test", { method: "POST", headers: { origin: "https://attacker.test" } }), { params: Promise.resolve({ courseId: id }) });
    expect(response.status).toBe(403);
    expect(mocks.backfill).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs, shared indexes and rate limits", async () => {
    expect((await call("bad")).status).toBe(400);
    mocks.shared.mockReturnValue(true);
    expect((await call()).status).toBe(409);
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, enforced: true, retryAfterSeconds: 10 });
    expect((await call()).status).toBe(429);
    expect(mocks.backfill).not.toHaveBeenCalled();
  });
});
