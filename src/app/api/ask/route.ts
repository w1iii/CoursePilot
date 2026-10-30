import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import {
  answerQuestion,
  CourseSelectionError,
  RagServiceError,
} from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const courseId =
      typeof body?.course_id === "string" && body.course_id.trim()
        ? body.course_id.trim()
        : undefined;

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: "question too long (max 2000 chars)" }, { status: 400 });
    }

    const result = await answerQuestion(user.id, question, courseId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof CourseSelectionError) {
      return NextResponse.json(
        { error: err.message, courses: err.courses },
        { status: 400 },
      );
    }
    if (err instanceof RagServiceError) {
      console.error("ask RAG service error", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ask error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
