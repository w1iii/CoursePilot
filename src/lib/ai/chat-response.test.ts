import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readChatEvents } from "@/lib/chat-stream";
const mocks = vi.hoisted(() => ({ stream: vi.fn(), log: vi.fn(), usage: vi.fn() }));
vi.mock("./rag", () => ({
  streamAnswerQuestion: mocks.stream,
  CourseSelectionError: class extends Error {},
  RagServiceError: class extends Error { code = "rag_timeout"; },
}));
vi.mock("./log", () => ({ logAiRequest: mocks.log }));
vi.mock("@/lib/rate-limit", () => ({ getRateLimitUsage: mocks.usage }));
import { chatStreamResponse } from "./chat-response";
import { RagServiceError } from "./rag";

async function events(response: Response) {
  const values = [];
  for await (const item of readChatEvents(response.body!)) values.push(item);
  return values;
}
describe("Next.js chat stream response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.usage.mockResolvedValue(null);
    mocks.log.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());
  it("forwards deltas before generator finishes and correlates all events", async () => {
    let finish!: () => void;
    const wait = new Promise<void>((resolve) => { finish = resolve; });
    mocks.stream.mockImplementation(async function* () {
      yield { event: "delta", data: { text: "hello" } };
      await wait;
      yield { event: "done", data: { answer: "hello", sources: [] } };
    });
    const response = chatStreamResponse(new Request("http://local"), "user", "question", "course", Date.now());
    expect(response.headers.get("cache-control")).toContain("no-transform");
    const iterator = readChatEvents(response.body!);
    const status = await iterator.next();
    const delta = await iterator.next();
    expect(status.value?.event).toBe("status");
    expect(delta.value?.data.text).toBe("hello");
    expect(delta.value?.data.requestId).toBe(response.headers.get("x-request-id"));
    const options = mocks.stream.mock.calls[0][3];
    expect(options.requestId).toBe(response.headers.get("x-request-id"));
    expect(options.deadline).toBeGreaterThan(Date.now());
    finish();
    expect((await iterator.next()).value?.event).toBe("done");
    await iterator.return(undefined);
  });
  it("emits safe typed errors after stream headers are sent", async () => {
    mocks.stream.mockImplementation(async function* () {
      yield { event: "delta", data: { text: "partial" } };
      throw new RagServiceError("secret provider error");
    });
    const response = chatStreamResponse(new Request("http://local"), "user", "question", "course", Date.now());
    const received = await events(response);
    expect(received.at(-1)).toMatchObject({ event: "error", data: { code: "rag_timeout" } });
    expect(JSON.stringify(received)).not.toContain("secret");
  });
  it("aborts upstream signal on downstream cancellation", async () => {
    let signal!: AbortSignal;
    mocks.stream.mockImplementation(async function* (_user, _question, _course, options) {
      signal = options.signal;
      yield { event: "delta", data: { text: "hello" } };
      await new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    });
    const response = chatStreamResponse(new Request("http://local"), "user", "question", "course", Date.now());
    const reader = response.body!.getReader();
    await reader.read();
    await reader.read();
    await reader.cancel();
    expect(signal.aborted).toBe(true);
  });
});
