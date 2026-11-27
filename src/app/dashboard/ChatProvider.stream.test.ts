import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatStore } from "./ChatProvider";
import { encodeChatEvent } from "@/lib/chat-stream";
import { CHAT_BROWSER_MS } from "@/lib/chat-budget";
import type { ThreadTurn } from "@/lib/thread-turns";

const turn: ThreadTurn = { id: "turn", question: "Explain cells", courseId: "course", createdAt: "2026-01-01T00:00:00Z", status: "loading" };
const final = { answer: "Cells grow.", sources: [], model: "unchanged", grounded: true, course: { id: "course", name: "Biology" } };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function setup() {
  let output!: ReadableStreamDefaultController<Uint8Array>;
  let signal!: AbortSignal;
  const body = new ReadableStream<Uint8Array>({ start(c) { output = c; } });
  const saves: unknown[] = [];
  const fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (url === "/api/ask") {
      signal = options!.signal!;
      signal.addEventListener("abort", () => { try { output.error(signal.reason); } catch { /* already closed */ } });
      return Promise.resolve(new Response(body, { headers: { "Content-Type": "text/event-stream" } }));
    }
    saves.push(JSON.parse(options?.body as string));
    return Promise.resolve(new Response("{}"));
  });
  vi.stubGlobal("fetch", fetchMock);
  const store = new ChatStore();
  store.initialize("thread", []);
  const emit = (event: string, data: Record<string, unknown>) => output.enqueue(encodeChatEvent(event, data));
  return { store, emit, output: () => output, saves, fetchMock };
}
describe("streamed chat state", () => {
  it("renders partial text before completion without saving each token", async () => {
    const { store, emit, saves } = setup();
    const work = store.request("thread", turn);
    emit("status", { phase: "retrieving" });
    emit("delta", { text: "Cells " });
    await vi.waitFor(() => expect(store.get("thread").turns[0].response?.answer).toBe("Cells "));
    expect(store.get("thread").turns[0].status).toBe("loading");
    const savesBefore = saves.length;
    emit("delta", { text: "grow." });
    emit("done", final);
    await work;
    expect(store.get("thread").turns[0]).toMatchObject({ status: "done", response: final });
    await vi.waitFor(() => expect(saves.length).toBeGreaterThan(savesBefore));
    expect(saves.length).toBeLessThanOrEqual(2);
  });
  it("keeps partial text after typed timeout without retrying automatically", async () => {
    const { store, emit, fetchMock } = setup();
    const work = store.request("thread", turn);
    emit("delta", { text: "Cells " });
    emit("error", { code: "rag_timeout", message: "do not display arbitrary upstream details" });
    await work;
    expect(store.get("thread").turns[0]).toMatchObject({
      status: "error", response: { answer: "Cells " }, error: "This answer took too long. Try a shorter question.",
    });
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ask")).toHaveLength(1);
  });
  it("keeps partial text when Stop is pressed", async () => {
    const { store, emit } = setup();
    const work = store.request("thread", turn);
    emit("delta", { text: "Cells " });
    await vi.waitFor(() => expect(store.get("thread").turns[0].response?.answer).toBe("Cells "));
    store.stop("thread");
    await work;
    expect(store.get("thread").turns[0]).toMatchObject({ status: "error", response: { answer: "Cells " }, error: "Response stopped. Please try again." });
  });
  it("rejects EOF without final metadata rather than marking an incomplete answer done", async () => {
    const { store, emit, output } = setup();
    const work = store.request("thread", turn);
    emit("delta", { text: "Cells " });
    output().close();
    await work;
    expect(store.get("thread").turns[0]).toMatchObject({ status: "error", response: { answer: "Cells " } });
  });
  it("keeps requests alive across unsubscribe/navigation", async () => {
    const { store, emit } = setup();
    const unsubscribe = store.subscribe("thread", vi.fn());
    const work = store.request("thread", turn);
    unsubscribe();
    emit("done", final);
    await work;
    expect(store.get("thread").turns[0].status).toBe("done");
  });
  it("times out a stalled request using total budget", async () => {
    vi.useFakeTimers();
    const { store } = setup();
    const work = store.request("thread", turn);
    await vi.advanceTimersByTimeAsync(CHAT_BROWSER_MS);
    await work;
    expect(store.get("thread").turns[0].error).toContain("took too long");
  });
  it("continues explicitly without discarding or duplicating the partial answer", async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/ask") expect(JSON.parse(options!.body as string).continuation).toBe("Cells ");
      const data = `event: delta\ndata: {"text":"grow."}\n\nevent: done\ndata: ${JSON.stringify(final)}\n\n`;
      return Promise.resolve(url === "/api/ask"
        ? new Response(data, { headers: { "Content-Type": "text/event-stream" } })
        : new Response("{}"));
    });
    vi.stubGlobal("fetch", fetchMock);
    const partial: ThreadTurn = { ...turn, status: "done", response: { ...final, answer: "Cells ", incomplete: true } };
    const store = new ChatStore();
    store.initialize("thread", [partial]);
    await store.request("thread", partial, true, true);
    const ask = fetchMock.mock.calls.find(([url]) => url === "/api/ask");
    expect(ask).toBeTruthy();
    expect(JSON.parse(ask![1]!.body as string).continuation).toBe("Cells ");
    expect(store.get("thread").turns).toHaveLength(1);
    expect(store.get("thread").turns[0].response?.answer).toBe("Cells grow.");
  });
});
