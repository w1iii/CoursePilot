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
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
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
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
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
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const results: Array<{
    userId: string;
    courses?: number;
    tasks?: number;
    announcements?: number;
    ragDocuments?: number;
    error?: string;
  }> = [];

  for (const user of (users ?? []) as AppUser[]) {
    try {
      const summary = await syncCanvas(user);
      results.push({
        userId: user.id,
        courses: summary.courses,
        tasks: summary.tasks,
        announcements: summary.announcements,
        ragDocuments: summary.ragDocuments,
        ...(summary.errors.length > 0 ? { error: summary.errors[0] } : {}),
      });
    } catch (err) {
      results.push({ userId: user.id, error: (err as Error).message });
    } finally {
      invalidateUserCache(user.id);
    }
  }

  return NextResponse.json({ users: results.length, results });
}
