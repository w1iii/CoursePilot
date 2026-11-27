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
import { checkRateLimit, getRateLimitUsage, rateLimitMessage } from "@/lib/rate-limit";
import { isUuid, readJsonObject } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";
import { MAX_QUESTION_CHARS, MAX_QUESTION_WORDS, countQuestionWords } from "@/lib/question-limit";
import { env } from "@/lib/env";
import { chatStreamResponse } from "@/lib/ai/chat-response";
import { abortable, CHAT_REQUEST_MS, CHAT_MAX_ANSWER_CHARS } from "@/lib/chat-budget";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(CHAT_REQUEST_MS)]);
  try {
    const user = await abortable(requireUser(), signal);
    const body = await abortable(readJsonObject(req), signal);
    if (!body || Object.keys(body).some((key) => !["question", "course_id", "continuation"].includes(key)) ||
      (body.continuation !== undefined && (typeof body.continuation !== "string" || !body.continuation.trim() ||
        body.continuation.length > CHAT_MAX_ANSWER_CHARS))) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const courseId =
      typeof body?.course_id === "string" && body.course_id.trim()
        ? body.course_id.trim()
        : undefined;

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (body.course_id !== undefined && !isUuid(body.course_id)) {
      return NextResponse.json({ error: "course_id must be a valid course ID" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json(
        { error: `question too long (max ${MAX_QUESTION_CHARS} chars)` },
        { status: 400 },
      );
    }
    if (countQuestionWords(question) > MAX_QUESTION_WORDS) {
      return NextResponse.json({ error: `question too long (max ${MAX_QUESTION_WORDS} words)` }, { status: 400 });
    }

    const limit = await abortable(checkRateLimit(user.id), signal);
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

    if (env("RAG_CHAT_STREAM_ENABLED") === "true" && req.headers.get("accept")?.includes("text/event-stream")) {
      return chatStreamResponse(req, user.id, question, courseId, requestStartedAt, body.continuation as string | undefined);
    }
    if (body.continuation !== undefined) return NextResponse.json({ error: "Continuation requires streaming chat" }, { status: 400 });
    const startedAt = Date.now();
    let result;
    try {
      result = await abortable(answerQuestion(user.id, question, courseId), signal);
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

    const response = { ...result, dailyUsage: await getRateLimitUsage(user.id) };
    delete response.cacheHit;
    return NextResponse.json(response);
  } catch (err) {
    if (signal.aborted) return apiFailure("ask.timeout", err, "This answer took too long. Please try again.", 504);
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
      if (err.code === "rag_timeout") return apiFailure("ask.rag_timeout", err, "This answer took too long. Please try again.", 504);
      return apiFailure("ask.rag", err, "Assistant unavailable", 502);
    }
    return apiFailure("ask.request", err, safeErrorMessage());
  }
}
