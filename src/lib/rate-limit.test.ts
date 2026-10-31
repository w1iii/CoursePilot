import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseAdminMock, rpcMock } = vi.hoisted(() => ({
  supabaseAdminMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabaseAdmin: supabaseAdminMock }));

import { checkRateLimit, rateLimitConfig, rateLimitMessage } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    supabaseAdminMock.mockReturnValue({ rpc: rpcMock });
    process.env.RATE_LIMIT_PER_MINUTE = "4";
    process.env.RATE_LIMIT_PER_DAY = "40";
  });

  it("passes the configured budgets to the SQL function", async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, exceeded_scope: null, retry_after_seconds: 0 }],
      error: null,
    });

    const decision = await checkRateLimit("user-a");

    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_user_id: "user-a",
      p_minute_limit: 4,
      p_day_limit: 40,
    });
    expect(decision).toEqual({
      allowed: true,
      scope: null,
      retryAfterSeconds: 0,
      enforced: true,
    });
  });

  it("reports the blocked scope and retry delay", async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: false, exceeded_scope: "minute", retry_after_seconds: 27 }],
      error: null,
    });

    const decision = await checkRateLimit("user-a");

    expect(decision.allowed).toBe(false);
    expect(decision.scope).toBe("minute");
    expect(decision.retryAfterSeconds).toBe(27);
  });

  it("fails open when the limiter is unavailable", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    const decision = await checkRateLimit("user-a");

    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
  });

  it("falls back to safe defaults for invalid env values", () => {
    process.env.RATE_LIMIT_PER_MINUTE = "0";
    process.env.RATE_LIMIT_PER_DAY = "abc";

    expect(rateLimitConfig()).toEqual({ perMinute: 10, perDay: 200 });
  });

  it("explains the exhausted window", () => {
    expect(rateLimitMessage("day")).toContain("Daily");
    expect(rateLimitMessage("minute")).toContain("Too many");
  });
});
