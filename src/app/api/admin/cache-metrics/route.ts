import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { loadAskCacheMetrics } from "@/lib/ai/metrics";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = env("CACHE_METRICS_SECRET") ?? env("CRON_SECRET");
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const provided = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7)
    : req.headers.get("x-cache-metrics-secret");
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const rawDays = params.get("days") ?? "30";
  if ([...params.keys()].some((key) => key !== "days") || params.getAll("days").length > 1 || !/^\d+$/.test(rawDays) || Number(rawDays) < 1 || Number(rawDays) > 90) {
    return NextResponse.json({ error: "days must be an integer from 1 to 90" }, { status: 400 });
  }
  const windowDays = Number(rawDays);

  try {
    const metrics = await loadAskCacheMetrics(windowDays);
    return NextResponse.json({
      windowDays,
      cacheEnabled: env("RAG_ANSWER_CACHE_ENABLED") === "true",
      allowlistConfigured: Boolean(env("RAG_ANSWER_CACHE_USER_IDS")),
      rolloutPercent: Number(env("RAG_ANSWER_CACHE_ROLLOUT_PERCENT") ?? "0"),
      metrics,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const requestId = logServerError("cache-metrics.load", error);
    return NextResponse.json({ error: "Metrics unavailable" }, { status: 503, headers: { "X-Request-ID": requestId } });
  }
}
