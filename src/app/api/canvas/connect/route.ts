import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CanvasAuthError, normalizeCanvasBaseUrl } from "@/lib/canvas";
import {
  saveCanvasAccount,
  validateCanvasToken,
} from "@/lib/canvas-account";
import { requireUser, UnauthorizedError } from "@/lib/user";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as
      | { canvas_base_url?: unknown; access_token?: unknown }
      | null;

    const rawUrl = typeof body?.canvas_base_url === "string" ? body.canvas_base_url : "";
    const rawToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";

    if (!rawToken) {
      return NextResponse.json({ error: "Canvas access token is required" }, { status: 400 });
    }
    if (rawToken.length > 500) {
      return NextResponse.json({ error: "Canvas access token is too long" }, { status: 400 });
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeCanvasBaseUrl(rawUrl);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    let canvasUser;
    try {
      canvasUser = await validateCanvasToken(baseUrl, rawToken);
    } catch (err) {
      if (err instanceof CanvasAuthError) {
        return NextResponse.json(
          { error: "Canvas rejected that access token. Check the token and try again." },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: `Could not reach Canvas: ${(err as Error).message}` },
        { status: 502 },
      );
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
    console.error("canvas connect error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
