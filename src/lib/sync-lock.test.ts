import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc }) }));

import { SyncInProgressError, withUserSyncLock } from "@/lib/sync-lock";

describe("withUserSyncLock", () => {
  beforeEach(() => rpc.mockReset());

  it("acquires and releases lock around work", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: true, error: null });
    const work = vi.fn().mockResolvedValue("complete");

    await expect(withUserSyncLock("user-1", work)).resolves.toBe("complete");
    expect(work).toHaveBeenCalledOnce();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["try_acquire_sync_lock", "release_sync_lock"]);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_user_id: "user-1", p_lease_seconds: 600 });
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_user_id: "user-1" });
    expect(rpc.mock.calls[1][1].p_lock_token).toBe(rpc.mock.calls[0][1].p_lock_token);
  });

  it("rejects overlapping sync without running work", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    const work = vi.fn();

    await expect(withUserSyncLock("user-1", work)).rejects.toBeInstanceOf(SyncInProgressError);
    expect(work).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("releases lock when work fails", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: true, error: null });

    await expect(withUserSyncLock("user-1", async () => { throw new Error("sync failed"); }))
      .rejects.toThrow("sync failed");
    expect(rpc.mock.calls[1][0]).toBe("release_sync_lock");
  });

  it("fails closed when lock RPC is unavailable", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "function missing" } });
    const work = vi.fn();

    await expect(withUserSyncLock("user-1", work)).rejects.toThrow("Sync lock unavailable");
    expect(work).not.toHaveBeenCalled();
  });
});
