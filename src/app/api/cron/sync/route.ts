import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { syncCanvas } from "@/lib/sync";
import type { AppUser } from "@/lib/user";
import { invalidateUserCache } from "@/lib/cache";

// A batch of Canvas syncs plus RAG ingestion can exceed the default budget.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = env("CRON_SECRET");
  if (!secret) return false;

  const header = req.headers.get("authorization");
  const provided =
    header?.toLowerCase().startsWith("bearer ")
      ? header.slice(7)
      : req.headers.get("x-cron-secret");

  if (!provided) return false;

  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

function maxUsers(): number {
  const raw = Number(env("CRON_SYNC_MAX_USERS") ?? "5");
  return Number.isFinite(raw) && raw > 0 ? Math.min(200, Math.floor(raw)) : 5;
}

/**
 * Scheduled sync for users with a healthy Canvas connection.
 *
 * Meant for Vercel Cron (or any scheduler) and protected by `CRON_SECRET`.
 * Users without stored credentials or with an invalid token are skipped.
 */
export async function GET(req: NextRequest) {
  if (!env("CRON_SECRET")) {
    return NextResponse.json(
      { error: "Scheduled sync is not configured. Set CRON_SECRET." },
      { status: 503 },
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data: accounts, error: accountsError } = await sb
    .from("canvas_accounts")
    .select("user_id")
    .is("invalid_at", null)
    .order("updated_at", { ascending: true })
    .limit(200);

  if (accountsError) {
    console.error("cron account query failed", accountsError.code ?? "unknown");
    return NextResponse.json({ error: "Scheduled sync unavailable" }, { status: 500 });
  }

  const userIds = [...new Set((accounts ?? []).map((account) => account.user_id))].slice(
    0,
    maxUsers(),
  );

  if (userIds.length === 0) {
    return NextResponse.json({ users: 0, results: [] });
  }

  const { data: users, error: usersError } = await sb
    .from("users")
    .select("id, clerk_user_id, email, full_name")
    .in("id", userIds);

  if (usersError) {
    console.error("cron user query failed", usersError.code ?? "unknown");
    return NextResponse.json({ error: "Scheduled sync unavailable" }, { status: 500 });
  }

  let succeeded = 0;
  let failed = 0;

  for (const user of (users ?? []) as AppUser[]) {
    try {
      const summary = await syncCanvas(user);
      if (summary.errors.length > 0) failed += 1;
      else succeeded += 1;
    } catch (err) {
      failed += 1;
      console.error("cron user sync failed", err instanceof Error ? err.name : "unknown");
    } finally {
      invalidateUserCache(user.id);
    }
  }

  return NextResponse.json({ users: succeeded + failed, succeeded, failed }, {
    headers: { "Cache-Control": "no-store" },
  });
}
