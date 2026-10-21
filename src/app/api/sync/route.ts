import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { syncCanvas } from "@/lib/sync";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await syncCanvas(user);
    return NextResponse.json(result, {
      status: result.errors.length > 0 && result.courses === 0 ? 502 : 200,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("sync error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
