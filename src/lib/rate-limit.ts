import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULT_PER_MINUTE = 10;
const DEFAULT_PER_DAY = 200;

export type RateLimitScope = "minute" | "day";

export interface RateLimitDecision {
  allowed: boolean;
  scope: RateLimitScope | null;
  retryAfterSeconds: number;
  /** False when the limiter could not run and the request was allowed through. */
  enforced: boolean;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function rateLimitConfig(): { perMinute: number; perDay: number } {
  return {
    perMinute: positiveInt(env("RATE_LIMIT_PER_MINUTE"), DEFAULT_PER_MINUTE),
    perDay: positiveInt(env("RATE_LIMIT_PER_DAY"), DEFAULT_PER_DAY),
  };
}

interface RateLimitRow {
  allowed: boolean;
  exceeded_scope: RateLimitScope | null;
  retry_after_seconds: number;
}

/**
 * Count one request for the user and decide whether it is within limits.
 *
 * Uses the Postgres `check_rate_limit` function so concurrent serverless
 * instances share the same counters. Infrastructure failures fail open: the
 * user is never locked out because the limiter itself broke.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitDecision> {
  const { perMinute, perDay } = rateLimitConfig();

  const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
    p_user_id: userId,
    p_minute_limit: perMinute,
    p_day_limit: perDay,
  });

  if (error) {
    console.error("rate limit check failed", error.message);
    return { allowed: true, scope: null, retryAfterSeconds: 0, enforced: false };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null | undefined;
  if (!row) {
    return { allowed: true, scope: null, retryAfterSeconds: 0, enforced: false };
  }

  return {
    allowed: row.allowed,
    scope: row.allowed ? null : row.exceeded_scope,
    retryAfterSeconds: Math.max(0, Math.floor(row.retry_after_seconds ?? 0)),
    enforced: true,
  };
}

export function rateLimitMessage(scope: RateLimitScope | null): string {
  return scope === "day"
    ? "Daily question limit reached. Try again tomorrow."
    : "Too many questions in a short time. Wait a moment and try again.";
}
