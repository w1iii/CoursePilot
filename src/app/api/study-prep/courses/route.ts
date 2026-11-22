import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { listStudyPrepCourses } from "@/lib/ai/study-prep-courses";
import { apiFailure } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listStudyPrepCourses(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return apiFailure("study-prep.courses", error, "Could not load selected courses");
  }
}
