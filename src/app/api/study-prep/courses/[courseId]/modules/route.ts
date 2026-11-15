import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { listStudyPrepCourses } from "@/lib/ai/study-prep-courses";

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const user = await requireUser();
    const { courseId } = await params;
    const course = (await listStudyPrepCourses(user.id)).find((item) => item.id === courseId);
    if (!course) return NextResponse.json({ error: "Selected course not found" }, { status: 404 });
    if (!course.rag_indexed_at) return NextResponse.json({ error: "Course is not indexed yet", modules: [] }, { status: 409 });
    // Module metadata endpoint is added to the RAG service; empty list is a valid unstructured-course fallback.
    const { moduleMetadata } = await import("@/lib/ai/study-prep");
    return NextResponse.json({ modules: await moduleMetadata(user.id, course) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Could not load course modules" }, { status: 502 });
  }
}
