import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatStore } from "./ChatProvider";
import type { ThreadTurn } from "@/lib/thread-turns";

const turn: ThreadTurn = { id: "turn", question: "Question?", courseId: "course", createdAt: "2026-01-01T00:00:00Z", status: "loading" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const ok = () => new Response(JSON.stringify({ answer: "Answer" }), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("ChatStore", () => {
  it("keeps a request alive without page subscribers and restores the result", async () => {
    const answer = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((url: string) => url === "/api/ask" ? answer.promise : Promise.resolve(ok())));
    const store = new ChatStore();
    store.initialize("thread", []);
    const listener = vi.fn();
    const unsubscribe = store.subscribe("thread", listener);
    const request = store.request("thread", turn);
    unsubscribe();
    expect(store.get("thread").turns[0].status).toBe("loading");
    answer.resolve(ok());
    await request;
    store.initialize("thread", [turn]);
    expect(store.get("thread").turns[0]).toMatchObject({ status: "done", response: { answer: "Answer" } });
  });

  it("stops a request and ignores late responses", async () => {
    const answer = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((url: string) => url === "/api/ask" ? answer.promise : Promise.resolve(ok())));
    const store = new ChatStore();
    store.initialize("thread", []);
    const request = store.request("thread", turn);
    store.stop("thread");
    answer.resolve(ok());
    await request;
    expect(store.get("thread").turns[0]).toMatchObject({ status: "error", error: "Response stopped. Please try again." });
  });

  it("recovers orphaned loading turns without writing on open", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const store = new ChatStore();
    store.initialize("thread", [turn]);
    expect(store.get("thread").turns[0]).toMatchObject({ status: "error", error: "Response interrupted. Please try again." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("serializes saves and writes the completed answer after the loading state", async () => {
    const firstSave = deferred<Response>();
    const bodies: string[] = [];
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/ask") return Promise.resolve(ok());
      bodies.push(String(init?.body));
      return bodies.length === 1 ? firstSave.promise : Promise.resolve(ok());
    });
    vi.stubGlobal("fetch", fetch);
    const store = new ChatStore();
    store.initialize("thread", []);
    await store.request("thread", turn);
    expect(bodies).toHaveLength(1);
    firstSave.resolve(ok());
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
    expect(JSON.parse(bodies[0]).turns[0].status).toBe("loading");
    expect(JSON.parse(bodies[1]).turns[0].status).toBe("done");
  });

  it("surfaces failed saves and allows retry", async () => {
    const fetch = vi.fn((url: string) => Promise.resolve(url === "/api/ask" ? ok() : new Response(null, { status: 500 })));
    vi.stubGlobal("fetch", fetch);
    const store = new ChatStore();
    store.initialize("thread", []);
    await store.request("thread", turn);
    await vi.waitFor(() => expect(store.get("thread").saveError).toBe(true));
    fetch.mockResolvedValue(ok());
    await store.save("thread");
    expect(store.get("thread").saveError).toBe(false);
    expect(store.get("thread").pending).toBeNull();
  });
});
