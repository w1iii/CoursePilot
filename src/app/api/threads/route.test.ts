import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), cacheUserRead: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.requireUser, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/cache", () => ({ cacheUserRead: mocks.cacheUserRead }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: vi.fn() }));

import { UnauthorizedError } from "@/lib/user";
import { GET } from "./route";

describe("thread list route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.cacheUserRead.mockResolvedValue({ data: [{ id: "thread-1", title: "Hello", updated_at: "today" }], error: null });
  });

  it("returns private user threads", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual([{ id: "thread-1", title: "Hello", updatedAt: "today" }]);
    expect(mocks.cacheUserRead).toHaveBeenCalledWith("thread-list", "user-1", 15, expect.any(Function));
  });

  it("rejects unauthenticated requests without querying", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError());
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.cacheUserRead).not.toHaveBeenCalled();
  });

  it("returns a safe error and matching diagnostic ID on database failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.cacheUserRead.mockResolvedValue({ data: null, error: { message: "secret database detail" } });
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load chat threads" });
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "threads.list", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret database detail");
    log.mockRestore();
  });
});
