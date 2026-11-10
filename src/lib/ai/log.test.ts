import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: () => ({ from: vi.fn(() => ({ insert })) }),
}));

import { logAiRequest } from "@/lib/ai/log";

describe("logAiRequest cache telemetry", () => {
  beforeEach(() => insert.mockReset().mockResolvedValue({ error: null }));

  it("persists cache hit status without recording question content", async () => {
    await logAiRequest({
      userId: "user-1",
      feature: "ask",
      status: "ok",
      latencyMs: 12,
      model: "test-model",
      cacheHit: true,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      feature: "ask",
      cache_hit: true,
      latency_ms: 12,
    }));
    const logged = insert.mock.calls[0][0];
    expect(logged).not.toHaveProperty("question");
    expect(logged).not.toHaveProperty("answer");
  });

  it("defaults cache_hit to false for non-cache AI calls", async () => {
    await logAiRequest({
      userId: "user-1",
      feature: "ask",
      status: "ok",
      latencyMs: 20,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ cache_hit: false }));
  });
});
