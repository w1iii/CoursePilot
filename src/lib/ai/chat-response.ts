import { randomUUID } from "node:crypto";
import { streamAnswerQuestion, CourseSelectionError, RagServiceError } from "./rag";
import { logAiRequest } from "./log";
import { encodeChatEvent } from "@/lib/chat-stream";
import { CHAT_REQUEST_MS } from "@/lib/chat-budget";
import { getRateLimitUsage } from "@/lib/rate-limit";
import { CanvasNotConnectedError } from "@/lib/canvas-account";

export function chatStreamResponse(
  request: Request, userId: string, question: string, courseId: string | undefined,
  startedAt: number, continuation?: string,
): Response {
  const requestId = randomUUID();
  const deadline = startedAt + CHAT_REQUEST_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")),
    Math.max(1, deadline - Date.now()));
  const signal = AbortSignal.any([request.signal, controller.signal]);
  let cancelled = false;
  let firstTokenMs: number | null = null;
  let outcome = "cancelled";
  let model: string | undefined;
  const body = new ReadableStream<Uint8Array>({
    async start(output) {
      const write = (event: string, data: Record<string, unknown>) => {
        if (!cancelled) output.enqueue(encodeChatEvent(event, { ...data, requestId }));
      };
      try {
        write("status", { phase: "checking_access" });
        for await (const item of streamAnswerQuestion(userId, question, courseId,
          { signal, requestId, deadline, continuation })) {
          if (signal.aborted) throw signal.reason;
          if (item.event === "delta" && item.data.text && firstTokenMs === null) firstTokenMs = Date.now() - startedAt;
          if (item.event === "done") {
            // Usage lookup is auxiliary; do not turn a completed answer into an error.
            let usageTimer: ReturnType<typeof setTimeout> | undefined;
            const dailyUsage = await Promise.race([
              getRateLimitUsage(userId).catch(() => null),
              new Promise<null>((resolve) => { usageTimer = setTimeout(() => resolve(null), 500); usageTimer.unref?.(); }),
            ]).finally(() => clearTimeout(usageTimer));
            if (signal.aborted) throw signal.reason;
            model = typeof item.data.model === "string" ? item.data.model : undefined;
            outcome = item.data.incomplete ? "incomplete" : "ok";
            write("done", { ...item.data, dailyUsage });
            break;
          }
          write(item.event, item.data);
        }
      } catch (error) {
        const code = signal.aborted ? (request.signal.aborted || cancelled ? "cancelled" : "rag_timeout")
          : error instanceof CourseSelectionError || error instanceof CanvasNotConnectedError ? "course_access"
            : error instanceof RagServiceError ? error.code : "request_failed";
        outcome = code;
        const message = code === "rag_timeout" ? "This answer took too long. Try a shorter question."
          : code === "course_access" ? "Check your selected course and Canvas connection."
            : "Connection to the assistant was interrupted. Please retry.";
        write("error", { code, message });
      } finally {
        clearTimeout(timer);
        controller.abort();
        if (!cancelled) output.close();
        console.info("chat_request", { requestId, outcome, model, totalMs: Date.now() - startedAt, firstTokenMs });
        await logAiRequest({ userId, feature: "ask", status: outcome === "ok" || outcome === "incomplete" ? "ok" : "error",
          latencyMs: Date.now() - startedAt, model, error: outcome === "ok" ? undefined : outcome, cacheHit: false });
      }
    },
    cancel() { cancelled = true; controller.abort(); clearTimeout(timer); },
  });
  return new Response(body, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "private, no-store, no-transform",
    "X-Accel-Buffering": "no", "X-Request-ID": requestId,
  } });
}
