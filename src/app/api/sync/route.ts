import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { CanvasNotConnectedError } from "@/lib/canvas-account";
import { syncCanvas } from "@/lib/sync";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await syncCanvas(user);
    const failed = result.errors.length > 0 && result.courses === 0;
    return NextResponse.json(
      failed ? { error: result.errors[0], ...result } : result,
      { status: failed ? 502 : 200 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof CanvasNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("sync error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
