import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { listCoursesForUser } from "@/lib/ai/rag";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listCoursesForUser(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Could not load selected courses" }, { status: 500 });
  }
}
