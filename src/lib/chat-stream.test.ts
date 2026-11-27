import { describe, expect, it, vi } from "vitest";
import { encodeChatEvent, readChatEvents } from "./chat-stream";

async function collect(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({ start(c) { chunks.forEach((chunk) => c.enqueue(chunk)); c.close(); } });
  const events = [];
  for await (const event of readChatEvents(stream)) events.push(event);
  return events;
}
describe("chat stream framing", () => {
  it("handles byte-sized chunks, split UTF-8, CRLF, and comments", async () => {
    const text = ": heartbeat\r\n\r\nevent: delta\r\ndata: {\"text\":\"植物 🌱\"}\r\n\r\n";
    const bytes = new TextEncoder().encode(text);
    expect(await collect(Array.from(bytes, (byte) => Uint8Array.of(byte)))).toEqual([
      { event: "delta", data: { text: "植物 🌱" } },
    ]);
  });
  it("decodes multiple events in one read", async () => {
    expect(await collect([encodeChatEvent("status", { phase: "retrieving" }), encodeChatEvent("done", { answer: "ok" })])).toHaveLength(2);
  });
  it.each(['data: []\n\n', 'data: not-json\n\n', 'data: {"text":"incomplete"}'])("rejects malformed or truncated frames (%s)", async (text) => {
    await expect(collect([new TextEncoder().encode(text)])).rejects.toThrow();
  });
  it("cancels unread upstream data on early exit", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(encodeChatEvent("done", { answer: "ok" })); }, cancel,
    });
    for await (const event of readChatEvents(stream)) { expect(event.event).toBe("done"); break; }
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
