import { describe, expect, it } from "vitest";
import { summarizeCacheMetrics } from "@/lib/ai/metrics";

describe("summarizeCacheMetrics", () => {
  it("calculates hit rate, errors, and latency percentiles", () => {
    const result = summarizeCacheMetrics([
      { cache_hit: true, latency_ms: 10, status: "ok" },
      { cache_hit: false, latency_ms: 20, status: "ok" },
      { cache_hit: false, latency_ms: 30, status: "error" },
      { cache_hit: true, latency_ms: 40, status: "ok" },
    ]);

    expect(result).toEqual({
      requests: 4,
      cacheHits: 2,
      cacheMisses: 2,
      cacheHitRatePercent: 50,
      errors: 1,
      latencyP50Ms: 20,
      latencyP95Ms: 40,
      latencyP99Ms: 40,
    });
  });

  it("returns null metrics for an empty window", () => {
    expect(summarizeCacheMetrics([])).toEqual({
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRatePercent: null,
      errors: 0,
      latencyP50Ms: null,
      latencyP95Ms: null,
      latencyP99Ms: null,
    });
  });
});
