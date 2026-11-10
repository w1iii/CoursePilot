import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { safeErrorMessage } from "@/lib/error-safety";
import {
  answerQuestion,
  CourseSelectionError,
  RagServiceError,
} from "@/lib/ai/rag";
import { elapsedMs, logAiRequest } from "@/lib/ai/log";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

const MAX_QUESTION_CHARS = 2000;

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
      if (!limit.enforced) {
        return NextResponse.json({ error: "Rate limiter unavailable" }, {
          status: 503, headers: { "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json(
        {
          error: rateLimitMessage(limit.scope),
          scope: limit.scope,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
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
        error: safeErrorMessage(),
        cacheHit: false,
      });
      throw err;
    }

    await logAiRequest({
      userId: user.id,
      feature: "ask",
      status: "ok",
      latencyMs: elapsedMs(startedAt),
      model: result.model,
      cacheHit: result.cacheHit ?? false,
    });

    const response = { ...result };
    delete response.cacheHit;
    return NextResponse.json(response);
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
      console.error("ask RAG service status", err.status);
      return NextResponse.json({ error: "Assistant unavailable" }, { status: 502 });
    }
    console.error("ask error", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: safeErrorMessage() }, { status: 500 });
  }
}
