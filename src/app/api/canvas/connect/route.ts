import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  CanvasAuthError,
  hardenedCanvasBaseUrl,
  normalizeCanvasAccessToken,
} from "@/lib/canvas";
import {
  saveCanvasAccount,
  validateCanvasToken,
} from "@/lib/canvas-account";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { requireUser, UnauthorizedError } from "@/lib/user";

export async function POST(req: NextRequest) {
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
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { canvas_base_url?: unknown; access_token?: unknown }
      | null;

    const rawUrl = typeof body?.canvas_base_url === "string" ? body.canvas_base_url : "";
    const rawToken = typeof body?.access_token === "string"
      ? normalizeCanvasAccessToken(body.access_token)
      : "";

    if (!rawToken) {
      return NextResponse.json({ error: "Canvas access token is required" }, { status: 400 });
    }
    if (rawToken.length > 500) {
      return NextResponse.json({ error: "Canvas access token is too long" }, { status: 400 });
    }

    let baseUrl: string;
    try {
      baseUrl = await hardenedCanvasBaseUrl(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid or disallowed Canvas URL" }, { status: 400 });
    }

    let canvasUser;
    try {
      canvasUser = await validateCanvasToken(baseUrl, rawToken);
    } catch (err) {
      if (err instanceof CanvasAuthError) {
        console.warn("Canvas token validation rejected", {
          host: new URL(baseUrl).host,
          tokenLength: rawToken.length,
          status: err.statusCode,
        });
        return NextResponse.json(
          { error: "Canvas rejected that access token. Check the token and try again." },
          { status: 401 },
        );
      }
      return NextResponse.json({ error: "Could not reach Canvas" }, { status: 502 });
    }

    const account = await saveCanvasAccount({
      userId: user.id,
      baseUrl,
      token: rawToken,
      canvasUser,
    });

    return NextResponse.json({
      connected: true,
      baseUrl: account.canvas_base_url,
      canvasUserName: account.canvas_user_name,
      canvasUserId: account.canvas_user_id,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("canvas connect error", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Canvas connection failed" }, { status: 500 });
  }
}
