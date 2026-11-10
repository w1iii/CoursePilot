import { supabaseAdmin } from "@/lib/supabase";

export interface AiMetricRow {
  cache_hit: boolean;
  latency_ms: number;
  status: "ok" | "error";
}

export interface CacheMetrics {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatePercent: number | null;
  errors: number;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  latencyP99Ms: number | null;
}

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  return values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
}

export function summarizeCacheMetrics(rows: AiMetricRow[]): CacheMetrics {
  const latencies = rows.map((row) => Math.max(0, row.latency_ms)).sort((a, b) => a - b);
  const cacheHits = rows.filter((row) => row.cache_hit).length;
  const errors = rows.filter((row) => row.status === "error").length;

  return {
    requests: rows.length,
    cacheHits,
    cacheMisses: rows.length - cacheHits,
    cacheHitRatePercent: rows.length ? Number(((cacheHits / rows.length) * 100).toFixed(2)) : null,
    errors,
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    latencyP99Ms: percentile(latencies, 0.99),
  };
}

export async function loadAskCacheMetrics(windowDays: number): Promise<CacheMetrics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("ai_requests")
    .select("cache_hit, latency_ms, status")
    .eq("feature", "ask")
    .gte("created_at", since)
    .limit(10_000);

  if (error) throw new Error(`Failed to load cache metrics: ${error.message}`);
  return summarizeCacheMetrics((data ?? []) as AiMetricRow[]);
}
