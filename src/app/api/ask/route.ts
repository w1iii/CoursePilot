import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import {
  answerQuestion,
  CourseSelectionError,
  RagServiceError,
} from "@/lib/ai/rag";
import { elapsedMs, logAiRequest } from "@/lib/ai/log";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

const MAX_QUESTION_CHARS = 12000;

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
    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json(
        { error: `question too long (max ${MAX_QUESTION_CHARS} chars)` },
        { status: 400 },
      );
    }

    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: rateLimitMessage(limit.scope),
          scope: limit.scope,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const startedAt = Date.now();
    let result;
    try {
      result = await answerQuestion(user.id, question, courseId);
    } catch (err) {
      await logAiRequest({
        userId: user.id,
        feature: "ask",
        status: "error",
        latencyMs: elapsedMs(startedAt),
        error: (err as Error).message,
      });
      throw err;
    }

    await logAiRequest({
      userId: user.id,
      feature: "ask",
      status: "ok",
      latencyMs: elapsedMs(startedAt),
      model: result.model,
    });

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
