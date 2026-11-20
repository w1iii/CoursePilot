import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), deleteUser: vi.fn(), rpc: vi.fn(), maybeSingle: vi.fn(), invalidate: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: async () => ({ users: { deleteUser: mocks.deleteUser } }),
}));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: mocks.invalidate }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
    rpc: mocks.rpc,
  }),
}));

import { DELETE } from "./route";

function request(confirmation = "DELETE") {
  return new Request("http://localhost/api/account", { method: "DELETE", body: JSON.stringify({ confirmation }) });
}

describe("account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk-1" });
    mocks.maybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.deleteUser.mockResolvedValue({});
  });

  it("requires authentication and confirmation", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await DELETE(request())).status).toBe(401);
    expect((await DELETE(request("no"))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("deletes application data before Clerk identity without deleting course indexes", async () => {
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_account_data", { p_clerk_user_id: "clerk-1" });
    expect(mocks.deleteUser).toHaveBeenCalledWith("clerk-1");
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
    expect(mocks.invalidate).toHaveBeenCalledWith("user-1");
  });

  it("keeps Clerk identity when application data deletion fails", async () => {
    mocks.rpc.mockResolvedValue({ error: new Error("database unavailable") });
    expect((await DELETE(request())).status).toBe(500);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("can retry Clerk deletion after application data is removed", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledWith("clerk-1");
  });
});
