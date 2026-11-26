"use client";

import { createContext, useContext, useRef } from "react";
import type { ThreadTurn } from "@/lib/thread-turns";

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
  private update(id: string, turns: ThreadTurn[]) {
    const entry = this.get(id);
    entry.turns = turns;
    entry.pending = turns;
    this.notify(entry);
    void this.save(id);
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
  async request(id: string, turn: ThreadTurn, replace = false) {
    const entry = this.get(id);
    if (entry.controller) return;
    const controller = new AbortController();
    entry.controller = controller;
    const loading = { ...turn, status: "loading" as const, response: undefined, error: undefined };
    this.update(id, replace ? entry.turns.map((item) => item.id === turn.id ? loading : item) : [...entry.turns, loading]);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: turn.question, course_id: turn.courseId || undefined }), signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error("request failed");
      if (controller.signal.aborted) return;
      this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, status: "done", response: json } : item));
    } catch {
      if (!controller.signal.aborted) this.update(id, entry.turns.map((item) => item.id === turn.id ? { ...item, status: "error", error: "I couldn’t complete that request. Please try again." } : item));
    } finally {
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
