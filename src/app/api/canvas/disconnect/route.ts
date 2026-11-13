import { NextResponse } from "next/server";

import { disconnectCanvasAccount } from "@/lib/canvas-account";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { invalidateUserResourceCache } from "@/lib/cache";

export async function POST() {
  try {
    const user = await requireUser();
    await disconnectCanvasAccount(user.id);
    invalidateUserResourceCache(user.id, "canvas-status");
    return NextResponse.json({ connected: false });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("canvas disconnect failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to disconnect Canvas" }, { status: 500 });
  }
}
