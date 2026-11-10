import { NextResponse } from "next/server";

import { disconnectCanvasAccount } from "@/lib/canvas-account";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { invalidateUserCache } from "@/lib/cache";

export async function POST() {
  try {
    const user = await requireUser();
    await disconnectCanvasAccount(user.id);
    invalidateUserCache(user.id);
    return NextResponse.json({ connected: false });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
