import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { CanvasNotConnectedError } from "@/lib/canvas-account";
import { enqueueJob } from "@/lib/jobs";
import { SyncInProgressError } from "@/lib/sync-lock";

// Canvas + RAG ingestion can exceed the default serverless budget.
export const maxDuration = 300;

export async function POST() {
  try {
    const user = await requireUser();

    // Shared per-user budget across limited routes (configured in rate-limit.ts).
    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) {
      if (!limit.enforced) {
        return NextResponse.json({ error: "Rate limiter unavailable" }, {
          status: 503, headers: { "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json(
        {
          error: rateLimitMessage(limit.scope),
          scope: limit.scope,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
            // Prevent caching of rate‑limit responses.
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return NextResponse.json(await enqueueJob(user.id, "sync"), {
      status: 202, headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof CanvasNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof SyncInProgressError) {
      return NextResponse.json({ error: err.message }, { status: 409, headers: { "Retry-After": "30" } });
    }
    console.error("sync failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Canvas synchronization failed" }, { status: 500 });
  }
}
