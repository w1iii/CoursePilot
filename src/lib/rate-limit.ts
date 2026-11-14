import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULT_PER_MINUTE = 10;
const DEFAULT_PER_DAY = 200;

export type RateLimitScope = "minute" | "day";

export interface RateLimitDecision {
  allowed: boolean;
  scope: RateLimitScope | null;
  retryAfterSeconds: number;
  /** False when infrastructure unavailable; callers return 503, not 429. */
  enforced: boolean;
}

export interface RateLimitUsage {
  count: number;
  limit: number;
  warning: boolean;
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

/** Read current daily usage after a request has been accepted. */
export async function getRateLimitUsage(userId: string): Promise<RateLimitUsage | null> {
  const { perDay } = rateLimitConfig();
  try {
    const { data, error } = await supabaseAdmin().rpc("get_rate_limit_usage", {
      p_user_id: userId,
    });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { daily_count?: number } | null | undefined;
    if (!row || typeof row.daily_count !== "number" || !Number.isFinite(row.daily_count)) return null;
    return { count: row.daily_count, limit: perDay, warning: row.daily_count >= perDay * 0.8 };
  } catch {
    return null;
  }
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
 * instances share the same counters.
 *
 * Infrastructure failures now fail closed: if the RPC call itself errors,
 * the request is denied (not allowed through as before).
 */
export async function checkRateLimit(userId: string): Promise<RateLimitDecision> {
  const { perMinute, perDay } = rateLimitConfig();

  let allowed = false;
  let scope: RateLimitScope | null = null;
  let retryAfterSeconds = 0;

  try {
    const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
      p_user_id: userId,
      p_minute_limit: perMinute,
      p_day_limit: perDay,
    });

    if (error) {
      console.error("rate limit check failed", error.message);
      // Fail closed – deny the request rather than letting it through.
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: false };
    }

    const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null | undefined;
    if (!row) {
      // No row returned – deny closed rather than allow open.
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: false };
    }

    if (typeof row.allowed !== "boolean" ||
        (row.exceeded_scope !== null && row.exceeded_scope !== "minute" && row.exceeded_scope !== "day") ||
        typeof row.retry_after_seconds !== "number" || !Number.isFinite(row.retry_after_seconds)) {
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: false };
    }
    allowed = row.allowed;
    scope = row.exceeded_scope ?? null;
    retryAfterSeconds = Math.max(0, Math.floor(row.retry_after_seconds ?? 0));
    if (!allowed && (!scope || retryAfterSeconds < 1)) {
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: false };
    }
  } catch (err) {
    // Unexpected exception – fail closed.
    console.error("rate limit unexpected error", err);
    return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: false };
  }

  return {
    allowed,
    scope,
    retryAfterSeconds,
    enforced: true,
  };
}

export function rateLimitMessage(scope: RateLimitScope | null): string {
  if (!scope) return "";
  if (scope === "day") return "Daily limit exceeded – retry after";
  if (scope === "minute") return "Too many requests – retry after";
  return "";
}
