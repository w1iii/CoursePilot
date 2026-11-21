import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn(), read: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit, rateLimitMessage: () => "Too many requests" }));
vi.mock("@/lib/cache", () => ({ cacheUserRead: mocks.read, invalidateUserResourceCache: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }) }) }) }) }));
import { UnauthorizedError } from "@/lib/user";
import { GET, POST } from "./route";
import type { NextRequest } from "next/server";

function createRequest(body: unknown) {
  return new Request("http://localhost/api/tasks", { method: "POST", body: JSON.stringify(body) }) as NextRequest;
}
const courseId = "86f039b2-6993-4e98-a11b-c89e1bf3b407";

describe("task routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user-1" });
    mocks.limit.mockResolvedValue({ allowed: true, enforced: true });
    mocks.read.mockResolvedValue({ data: [], error: null });
    mocks.lookup.mockResolvedValue({ data: null, error: null });
  });

  it("rejects unauthenticated and rate-limited requests", async () => {
    mocks.user.mockRejectedValueOnce(new UnauthorizedError());
    expect((await GET()).status).toBe(401);
    mocks.limit.mockResolvedValueOnce({ allowed: false, enforced: true, scope: "minute", retryAfterSeconds: 20 });
    const response = await GET();
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("20");
  });

  it("returns empty tasks when user has no courses", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ tasks: [] });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("validates input and distinguishes missing courses from database failure", async () => {
    expect((await POST(createRequest({ title: "", courseId }))).status).toBe(400);
    expect((await POST(createRequest({ title: "Task", courseId }))).status).toBe(404);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.lookup.mockResolvedValue({ data: null, error: { message: "secret database detail" } });
    const response = await POST(createRequest({ title: "Task", courseId }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create task" });
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "tasks.create", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret database detail");
    log.mockRestore();
  });
});
