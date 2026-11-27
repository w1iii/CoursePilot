"use client";

import { createContext, useContext, useRef } from "react";
import type { ThreadTurn } from "@/lib/thread-turns";
import { readChatEvents } from "@/lib/chat-stream";
import { CHAT_BROWSER_MS, CHAT_MAX_ANSWER_CHARS } from "@/lib/chat-budget";

type Listener = () => void;
type Entry = { turns: ThreadTurn[]; listeners: Set<Listener>; controller: AbortController | null; pending: ThreadTurn[] | null; saving: boolean; saveError: boolean };

// Owned by the dashboard layout, not by a thread page: requests survive route changes.
export class ChatStore {
  private entries = new Map<string, Entry>();

  initialize(id: string, turns: ThreadTurn[]) {
    if (this.entries.has(id)) return;
    this.entries.set(id, { turns: turns.map((turn) => turn.status === "loading"
      ? { ...turn, status: "error", error: "Response interrupted. Please try again." } : turn), listeners: new Set(), controller: null, pending: null, saving: false, saveError: false });
  }

  get(id: string) { return this.entries.get(id)!; }
  subscribe(id: string, listener: Listener) {
    const entry = this.get(id);
    entry.listeners.add(listener);
    return () => { entry.listeners.delete(listener); };
  }
  private notify(entry: Entry) { entry.listeners.forEach((listener) => listener()); }
  private update(id: string, turns: ThreadTurn[], persist = true) {
    const entry = this.get(id);
    entry.turns = turns;
    if (persist) entry.pending = turns;
    this.notify(entry);
    if (persist) void this.save(id);
  }
  async save(id: string) {
    const entry = this.get(id);
    if (entry.saving || !entry.pending) return;
    entry.saving = true;
    try {
      while (entry.pending) {
        const turns = entry.pending;
        entry.pending = null;
        const res = await fetch(`/api/threads/${encodeURIComponent(id)}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: turns.at(-1)?.courseId || null, turns }),
        });
        if (!res.ok) {
          entry.pending ??= turns;
          throw new Error("Failed to save chat thread");
        }
        entry.saveError = false;
        if (typeof window !== "undefined") window.dispatchEvent(new Event("coursa:threads-changed"));
      }
    } catch {
      entry.saveError = true;
    } finally {
      entry.saving = false;
      this.notify(entry);
    }
  }
  async request(id: string, turn: ThreadTurn, replace = false, continueAnswer = false) {
    const entry = this.get(id);
    if (entry.controller) return;
    const controller = new AbortController();
    entry.controller = controller;
    let answer = continueAnswer && typeof turn.response?.answer === "string" ? turn.response.answer : "";
    let response: Record<string, unknown> | undefined = answer ? { ...turn.response, answer } : undefined;
    let message = "I couldn’t complete that request. Please try again.";
    let lastPaint = 0;
    let checkpointSaved = false;
    const startedAt = Date.now();
    const loading = { ...turn, status: "loading" as const, response, error: undefined, progress: "Checking course access…" };
    this.update(id, replace ? entry.turns.map((item) => item.id === turn.id ? loading : item) : [...entry.turns, loading]);
    const timer = setTimeout(() => {
      message = "This answer took too long. Try a shorter question.";
      controller.abort(new DOMException("Timed out", "TimeoutError"));
    }, CHAT_BROWSER_MS);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ question: turn.question, course_id: turn.courseId || undefined, ...(continueAnswer ? { continuation: answer } : {}) }), signal: controller.signal });
      if (!res.ok) {
        message = res.status === 401 ? "Your session expired. Sign in again to continue."
          : res.status === 429 ? "Request limit reached. Wait before trying again."
            : res.status === 504 ? "This answer took too long. Try a shorter question." : message;
        throw new Error("request failed");
      }
      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        if (!res.body) throw new Error("Missing stream");
        for await (const item of readChatEvents(res.body)) {
          if (entry.controller !== controller || controller.signal.aborted) return;
          if (item.event === "error") {
            message = item.data.code === "rag_timeout" ? "This answer took too long. Try a shorter question."
              : item.data.code === "course_access" ? "Check your selected course and Canvas connection."
                : "Connection interrupted. Your partial answer is kept below.";
            throw new Error("Stream failed");
          }
          if (item.event === "status") {
            const phase = item.data.phase;
            const progress = phase === "retrieving" ? "Finding course material…"
              : phase === "generating" ? "Writing answer…" : "Checking course access…";
            this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, progress } : item), false);
          }
          if (item.event === "delta") {
            if (typeof item.data.text !== "string") throw new Error("Invalid answer text");
            answer += item.data.text;
            if (answer.length > CHAT_MAX_ANSWER_CHARS) throw new Error("Answer too large");
            response = { ...response, answer, sources: [], grounded: false, model: "", course: { id: turn.courseId, name: "" } };
            if (Date.now() - lastPaint >= 50) {
              // Existing thread writes share rate-limit accounting. Allow at
              // most one interim checkpoint, not a write for each token/second.
              const checkpoint = !checkpointSaved && Date.now() - startedAt >= 2000;
              this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, response } : item), checkpoint);
              lastPaint = Date.now();
              if (checkpoint) checkpointSaved = true;
            }
          }
          if (item.event === "done") {
            if (typeof item.data.answer !== "string" || item.data.answer.length > CHAT_MAX_ANSWER_CHARS || !Array.isArray(item.data.sources)) {
              throw new Error("Invalid final answer");
            }
            const final = item.data;
            this.update(id, entry.turns.map((turn) => turn.id === loading.id ? { ...turn, status: "done", progress: undefined, response: final } : turn));
            return;
          }
          if (Date.now() - startedAt > CHAT_BROWSER_MS) throw new Error("Timed out");
        }
        throw new Error("Stream interrupted");
      }
      const json = await res.json();
      if (entry.controller !== controller || controller.signal.aborted) return;
      this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, status: "done", progress: undefined, response: json } : item));
    } catch {
      if (entry.controller === controller) this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, status: "error", progress: undefined, response, error: message } : item));
    } finally {
      clearTimeout(timer);
      if (entry.controller === controller) entry.controller = null;
    }
  }
  stop(id: string) {
    const entry = this.get(id);
    if (!entry.controller) return;
    entry.controller.abort();
    entry.controller = null;
    this.update(id, entry.turns.map((turn) => turn.status === "loading" ? { ...turn, status: "error", error: "Response stopped. Please try again." } : turn));
  }
}

const ChatContext = createContext<ChatStore | null>(null);
export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const store = useRef<ChatStore | null>(null);
  store.current ??= new ChatStore();
  return <ChatContext.Provider value={store.current}>{children}</ChatContext.Provider>;
}
export function useChatStore() {
  const store = useContext(ChatContext);
  if (!store) throw new Error("ChatProvider missing");
  return store;
}
