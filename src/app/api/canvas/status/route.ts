import { NextResponse } from "next/server";

import { getCanvasStatus } from "@/lib/canvas-account";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { cacheUserRead } from "@/lib/cache";

export async function GET() {
  try {
    const user = await requireUser();
    const status = await cacheUserRead("canvas-status", user.id, 60, () => getCanvasStatus(user.id));
    return NextResponse.json(status, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("canvas status failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to load Canvas status" }, { status: 500 });
  }
}
