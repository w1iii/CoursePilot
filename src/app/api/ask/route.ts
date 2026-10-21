import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { answerQuestion } from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: "question too long (max 2000 chars)" }, { status: 400 });
    }

    const result = await answerQuestion(user.id, question);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("ask error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
