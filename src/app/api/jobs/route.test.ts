import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(), from: vi.fn(), invalidate: vi.fn(), eq: vi.fn(), limit: vi.fn(),
}));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: mocks.invalidate }));
import { GET, POST } from "./route";
import { UnauthorizedError } from "@/lib/user";

describe("job status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: "user-a" });
    const query = { select: vi.fn().mockReturnThis(), eq: mocks.eq, or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: mocks.limit };
    mocks.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    mocks.limit.mockResolvedValue({ data: [{ id: "job-a", status: "failed" }], error: null });
  });
  it("scopes status and persistent notifications to signed-in owner", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-a");
    const projection = mocks.from.mock.results[0].value.select.mock.calls[0][0];
    expect(projection).not.toContain("payload");
    expect(projection).not.toContain("lease_token");
  });
  it("rejects unauthenticated status reads and cache refreshes", async () => {
    mocks.user.mockRejectedValue(new UnauthorizedError());
    expect((await GET()).status).toBe(401);
    expect((await POST()).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("revalidates only current user's Next cache", async () => {
    expect((await POST()).status).toBe(200);
    expect(mocks.invalidate).toHaveBeenCalledWith("user-a");
  });
});
