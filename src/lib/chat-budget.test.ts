import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { abortable, CHAT_RAG_MS, CHAT_REQUEST_MS, CHAT_BROWSER_MS } from "./chat-budget";

describe("chat deadline contract", () => {
  it("leaves slack between upstream, proxy, browser, and hosting deadlines", () => {
    const route = readFileSync("src/app/api/ask/route.ts", "utf8");
    const functionSeconds = Number(route.match(/export const maxDuration = (\d+)/)?.[1]);
    expect(CHAT_RAG_MS).toBeLessThan(CHAT_REQUEST_MS);
    expect(CHAT_REQUEST_MS).toBeLessThan(CHAT_BROWSER_MS);
    expect(CHAT_BROWSER_MS).toBeLessThan(functionSeconds * 1000);
  });
  it("handles already aborted requests and consumes late rejection safely", async () => {
    const controller = new AbortController();
    controller.abort(new Error("deadline"));
    await expect(abortable(Promise.reject(new Error("late provider rejection")), controller.signal)).rejects.toThrow("deadline");
  });
  it("rejects promptly on cancellation even while an operation is pending", async () => {
    const controller = new AbortController();
    const promise = abortable(new Promise(() => {}), controller.signal);
    controller.abort(new Error("deadline"));
    await expect(promise).rejects.toThrow("deadline");
  });
});
