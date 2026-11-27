/** POST-compatible SSE. Frames may span reads and UTF-8 codepoints. */
export type ChatEvent = { event: string; data: Record<string, unknown> };
export function encodeChatEvent(event: string, data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function* readChatEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let consumed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 128_000) throw new Error("Stream frame too large");
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        let event = "message";
        const data: string[] = [];
        for (const line of frame.split(/\r?\n/)) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (!data.length) continue;
        const parsed: unknown = JSON.parse(data.join("\n"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid stream event");
        yield { event, data: parsed as Record<string, unknown> };
      }
      if (done) {
        if (buffer.trim()) throw new Error("Incomplete stream frame");
        consumed = true;
        return;
      }
    }
  } finally {
    if (!consumed) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
