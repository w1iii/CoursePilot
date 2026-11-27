import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn(), answer: vi.fn(), stream: vi.fn(), log: vi.fn(), usage: vi.fn() }));
vi.mock("@/lib/ai/chat-response", () => ({ chatStreamResponse: mocks.stream }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/ai/rag", () => ({ answerQuestion: mocks.answer, CourseSelectionError: class CourseSelectionError extends Error {}, RagServiceError: class RagServiceError extends Error {} }));
vi.mock("@/lib/ai/log", () => ({ logAiRequest: mocks.log, elapsedMs: () => 1 }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit, getRateLimitUsage: mocks.usage, rateLimitMessage: () => "Rate limited" }));
import { UnauthorizedError } from "@/lib/user";
import { RagServiceError } from "@/lib/ai/rag";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/ask", { method: "POST", body: JSON.stringify(body) }) as NextRequest;
}

describe("ask route", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.limit.mockResolvedValue({ allowed: true });
    mocks.answer.mockResolvedValue({ answer: "answer", model: "test", cacheHit: true });
    mocks.usage.mockResolvedValue({ used: 1 });
  });

  it("checks auth and input before calling the assistant", async () => {
    mocks.user.mockRejectedValueOnce(new UnauthorizedError());
    expect((await POST(request({ question: "hello" }))).status).toBe(401);
    expect((await POST(request({ question: "" }))).status).toBe(400);
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("returns an answer without internal cache metadata", async () => {
    const response = await POST(request({ question: "hello" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ answer: "answer", model: "test", dailyUsage: { used: 1 } });
  });

  it("enforces the 500 word limit before calling the assistant", async () => {
    expect((await POST(request({ question: Array(501).fill("word").join(" ") }))).status).toBe(400);
    expect(mocks.answer).not.toHaveBeenCalled();
    expect((await POST(request({ question: Array(500).fill("word").join(" ") }))).status).toBe(200);
  });

  it("reports upstream failure with a safe correlated response", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.answer.mockRejectedValue(new RagServiceError("secret detail", 500));
    const response = await POST(request({ question: "hello" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Assistant unavailable" });
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "ask.rag", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret detail");
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ status: "error", error: "An unexpected error occurred" }));
    log.mockRestore();
  });
  it("opts into streaming only behind the server flag after authorization/rate checks", async () => {
    vi.stubEnv("RAG_CHAT_STREAM_ENABLED", "true");
    mocks.stream.mockReturnValue(new Response("stream", { headers: { "Content-Type": "text/event-stream" } }));
    const req = new Request("http://localhost/api/ask", { method: "POST", headers: { Accept: "text/event-stream" }, body: JSON.stringify({ question: "hello" }) }) as NextRequest;
    const response = await POST(req);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(mocks.stream).toHaveBeenCalled();
    expect(mocks.answer).not.toHaveBeenCalled();
  });
  it("does not open streaming for rate-limited requests", async () => {
    vi.stubEnv("RAG_CHAT_STREAM_ENABLED", "true");
    mocks.limit.mockResolvedValue({ allowed: false, enforced: true, scope: "minute" });
    const req = new Request("http://localhost/api/ask", { method: "POST", headers: { Accept: "text/event-stream" }, body: JSON.stringify({ question: "hello" }) }) as NextRequest;
    expect((await POST(req)).status).toBe(429);
    expect(mocks.stream).not.toHaveBeenCalled();
  });
});
