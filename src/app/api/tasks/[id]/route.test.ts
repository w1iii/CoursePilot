import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ user: vi.fn(), lookup: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit, rateLimitMessage: () => "Rate limited" }));
vi.mock("@/lib/cache", () => ({ invalidateUserResourceCache: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }) }) }) }));
import { DELETE, PATCH } from "./route";

const id = "86f039b2-6993-4e98-a11b-c89e1bf3b407";
const params = { params: Promise.resolve({ id }) };
const request = () => new Request("http://localhost/api/tasks/id", { method: "PATCH", body: JSON.stringify({ status: "completed" }) }) as NextRequest;

describe("task item route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user-1" });
    mocks.limit.mockResolvedValue({ allowed: true });
  });

  it("returns not found for absent and other users' tasks", async () => {
    mocks.lookup.mockResolvedValueOnce({ data: null, error: null });
    expect((await PATCH(request(), params)).status).toBe(404);
    mocks.lookup.mockResolvedValueOnce({ data: { courses: { user_id: "other" } }, error: null });
    expect((await DELETE(request(), params)).status).toBe(404);
  });

  it("does not allow deletion of Canvas tasks", async () => {
    mocks.lookup.mockResolvedValue({ data: { is_manual: false, courses: { user_id: "user-1" } }, error: null });
    expect((await DELETE(request(), params)).status).toBe(400);
  });

  it("logs lookup failures without leaking details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.lookup.mockResolvedValue({ data: null, error: { message: "secret" } });
    const response = await PATCH(request(), params);
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "tasks.update", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    log.mockRestore();
  });
});
