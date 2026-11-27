import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

const LEASE_SECONDS = 600;

export class SyncInProgressError extends Error {
  constructor() {
    super("A sync is already running for this user.");
    this.name = "SyncInProgressError";
  }
}

/** Run one user's sync under a Postgres-backed lease shared by app instances. */
export async function withUserSyncLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const token = randomUUID();
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("try_acquire_sync_lock", {
    p_user_id: userId,
    p_lock_token: token,
    p_lease_seconds: LEASE_SECONDS,
  });

  if (error) throw new Error(`Sync lock unavailable: ${error.message}`);
  if (data !== true) throw new SyncInProgressError();

  // Background indexing may outlive the original ten-minute lease.
  const heartbeat = setInterval(async () => {
    try {
      const { data: renewed, error } = await sb.rpc("renew_sync_lock", {
        p_user_id: userId, p_lock_token: token, p_lease_seconds: LEASE_SECONDS,
      });
      if (error || !renewed) {
        console.error("sync lock renewal failed");
        // Dedicated worker must not continue writing after losing its lock.
        if (process.env.COURSEPILOT_WORKER === "true") process.exit(1);
      }
    } catch {
      if (process.env.COURSEPILOT_WORKER === "true") process.exit(1);
    }
  }, 60_000);
  try {
    return await work();
  } finally {
    clearInterval(heartbeat);
    const { error: releaseError } = await sb.rpc("release_sync_lock", {
      p_user_id: userId,
      p_lock_token: token,
    });
    if (releaseError) console.error("sync lock release failed", releaseError.message);
  }
}
