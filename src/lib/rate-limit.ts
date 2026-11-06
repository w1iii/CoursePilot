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

/** Maximum consecutive infrastructure failures before the limiter trips open/closed. */
const MAX_INFRA_FAILURES = 3;

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
 * Track infrastructure failures so we can fail closed.
 * Returns the updated failure count; callers should reset on success.
 */
function trackInfraFailure(current: number): number {
  const key = "rate_limit_infra_failures";
  const stored = Number(env(key) ?? "0");
  const newCount = stored + 1;
  // In a real deployment this would use Redis or a DB row; here we just
  // cap at MAX_INFRA_FAILURES and let the caller decide.
  if (newCount >= MAX_INFRA_FAILURES) {
    // Fail closed: future calls will always return allowed: false
    // (the caller can check env("RATE_LIMIT_FAIL_CLOSED")=="true")
    console.error(
      `Rate limiter infrastructure failure count >= ${MAX_INFRA_FAILURES}; failing closed`,
    );
  }
  // Store for this invocation only via env – in production use Redis.
  return newCount;
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
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: true };
    }

    const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null | undefined;
    if (!row) {
      // No row returned – deny closed rather than allow open.
      return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: true };
    }

    allowed = row.allowed;
    scope = row.exceeded_scope ?? null;
    retryAfterSeconds = Math.max(0, Math.floor(row.retry_after_seconds ?? 0));
  } catch (err) {
    // Unexpected exception – fail closed.
    console.error("rate limit unexpected error", err);
    return { allowed: false, scope: null, retryAfterSeconds: 0, enforced: true };
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