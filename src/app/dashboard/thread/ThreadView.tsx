"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoomOrbit, { type OrbitCourse } from "../LoomOrbit";
import DashboardShell from "../DashboardShell";
import {
  THREAD_INDEX_KEY,
  THREADS_CHANGED_EVENT,
  type SavedThread,
} from "../ThreadSidebar";

export interface ThreadCourse extends OrbitCourse {
  instructor: string | null;
}

interface RagSource {
  id: string;
  label: string;
  title: string;
  source_type: string;
  chunk_index: number;
}

interface RagResponse {
  answer: string;
  sources: RagSource[];
  model: string;
  grounded: boolean;
  course: { id: string; name: string };
}

interface Turn {
  id: string;
  question: string;
  courseId: string;
  createdAt: string;
  status: "loading" | "done" | "error";
  response?: RagResponse;
  error?: string;
}

interface Props {
  userName: string;
  userEmail: string;
  courses: ThreadCourse[];
  initialQuestion: string;
  initialCourseId: string;
  initialThreadId: string;
}

function renderText(text: string) {
  return text.split("\n").map((line, index) => {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);
    const content = heading?.[1] ?? bullet?.[1] ?? numbered?.[1] ?? line;
    const formatted = content.split(/(`[^`]+`)/g).map((part, partIndex) =>
      part.startsWith("`") ? (
        <code key={partIndex} className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[0.9em] text-primary-container">
          {part.slice(1, -1)}
        </code>
      ) : (
        part
      ),
    );
    if (heading) return <h3 key={index} className="mt-5 font-headline-sm text-headline-sm">{formatted}</h3>;
    if (bullet || numbered) return <li key={index} className="ml-5 list-disc pl-1">{formatted}</li>;
    return <p key={index} className="min-h-[1.65em]">{formatted}</p>;
  });
}

export default function ThreadView({
  userName,
  userEmail,
  courses,
  initialQuestion,
  initialCourseId,
  initialThreadId,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState(initialCourseId || courses[0]?.id || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const didInit = useRef(false);
  const storageKey = `habi:thread:${initialThreadId}`;

  const persist = useCallback((nextTurns: Turn[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextTurns));
      const saved = JSON.parse(localStorage.getItem(THREAD_INDEX_KEY) ?? "[]") as SavedThread[];
      const next = [
        {
          id: initialThreadId,
          title: nextTurns[0]?.question.slice(0, 52) || "New chat",
          updatedAt: nextTurns[nextTurns.length - 1]?.createdAt ?? new Date().toISOString(),
        },
        ...saved.filter((thread) => thread.id !== initialThreadId),
      ].slice(0, 50);
      localStorage.setItem(THREAD_INDEX_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(THREADS_CHANGED_EVENT));
    } catch {
      // The conversation remains available in component state if storage is unavailable.
    }
  }, [initialThreadId, storageKey]);

  const requestAnswer = useCallback(async (turnId: string, prompt: string, cid: string) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, course_id: cid || undefined }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setTurns((current) => {
        const next = current.map((turn) =>
          turn.id === turnId ? { ...turn, status: "done" as const, response: json as RagResponse } : turn,
        );
        persist(next);
        return next;
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId ? { ...turn, status: "error" as const, error: (error as Error).message } : turn,
        ),
      );
    } finally {
      controllerRef.current = null;
    }
  }, [persist]);

  const startTurn = useCallback((prompt: string, cid: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const turn: Turn = { id, question: prompt, courseId: cid, createdAt: new Date().toISOString(), status: "loading" };
    setTurns((current) => [...current, turn]);
    persist([...turns, turn]);
    void requestAnswer(id, prompt, cid);
  }, [persist, requestAnswer, turns]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as Turn[];
      if (Array.isArray(saved) && saved.length > 0) {
        setTurns(saved);
        setCourseId(saved[saved.length - 1].courseId || courseId);
        return;
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    if (initialQuestion) startTurn(initialQuestion, initialCourseId || courses[0]?.id || "");
  }, [courseId, courses, initialCourseId, initialQuestion, startTurn, storageKey]);

  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || !courseId || busy) return;
    startTurn(prompt, courseId);
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  function updateQuestion(value: string) {
    setQuestion(value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
    }
  }

  async function copyAnswer(turn: Turn) {
    if (!turn.response) return;
    await navigator.clipboard.writeText(turn.response.answer);
    setCopiedId(turn.id);
    setTimeout(() => setCopiedId(null), 1400);
  }

  function retry(turn: Turn) {
    setTurns((current) => current.map((item) => item.id === turn.id ? { ...item, status: "loading" as const, error: undefined } : item));
    void requestAnswer(turn.id, turn.question, turn.courseId);
  }

  const busy = turns.some((turn) => turn.status === "loading");
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const suggestions = ["What’s due this week?", "Summarize my latest announcements", "What should I study first?"];

  return (
    <DashboardShell
        activeThreadId={initialThreadId}
        userName={userName}
        userEmail={userEmail}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          <span className="truncate font-label-sm text-label-sm text-text-muted">
            {turns[0]?.question.slice(0, 48) || "New chat"}
          </span>
          <Link href="/dashboard" className="rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-muted hover:bg-surface-container">
            Dashboard
          </Link>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className={`mx-auto flex w-full max-w-[720px] flex-col bg-background px-4 md:px-6 ${
            turns.length === 0 ? "min-h-full justify-center py-8" : "pb-8 pt-4"
          }`}>
          {turns.length === 0 ? (
            <div className="flex w-full flex-col items-center">
              <section className="grid w-full max-w-[620px] grid-cols-1 items-center gap-6 md:grid-cols-[minmax(220px,300px)_1fr] md:gap-8">
                <LoomOrbit
                  compact
                  courses={courses}
                  activeCourseId={courseId}
                  onSelectCourse={(course) => {
                    setCourseId(course.id);
                    updateQuestion(`What's due in ${course.code ?? course.name} this week?`);
                    inputRef.current?.focus();
                  }}
                  onHubClick={() => inputRef.current?.focus()}
                />
                <div className="text-center md:text-left">
                  <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-display text-base text-dark-text">
                    h
                  </span>
                  <h1 className="font-display text-[38px] leading-tight tracking-[-0.02em] text-primary-container md:text-[46px]">
                    {greeting}, {userName.split(" ")[0]}
                  </h1>
                  <p className="mt-3 font-body-sm text-body-sm text-text-muted">
                    How can I help you today?
                  </p>
                </div>
              </section>
              <div className="mt-6 w-full max-w-[680px] text-center">
                <p className="font-code-tag text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  Choose a course or start a new thread
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8 pb-8 pt-8">
              {turns.map((turn) => (
                <div key={turn.id} className="space-y-5">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-surface-container-high px-4 py-3 font-body-md text-body-md leading-relaxed text-on-surface">
                      {turn.question}
                    </div>
                  </div>
                  {turn.status === "loading" && (
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container font-display text-sm text-dark-text">h</span>
                      <div className="flex items-center gap-1 pt-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-tertiary-container" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-tertiary-container [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-tertiary-container [animation-delay:240ms]" />
                      </div>
                    </div>
                  )}
                  {turn.status === "error" && (
                    <div className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">
                      {turn.error}
                      <button type="button" onClick={() => retry(turn)} className="ml-3 underline">Try again</button>
                    </div>
                  )}
                  {turn.response && (
                    <div className="group flex gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container font-display text-sm text-dark-text">h</span>
                      <div className="min-w-0 flex-1 font-body-md text-body-md leading-[1.7] text-on-surface">
                        <div>{renderText(turn.response.answer)}</div>
                        <div className="mt-3 flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => void copyAnswer(turn)} className="rounded-md p-1.5 hover:bg-surface-container" title="Copy">
                            <span className="material-symbols-outlined text-[17px]">{copiedId === turn.id ? "check" : "content_copy"}</span>
                          </button>
                          <button type="button" onClick={() => retry(turn)} className="rounded-md p-1.5 hover:bg-surface-container" title="Regenerate"><span className="material-symbols-outlined text-[17px]">refresh</span></button>
                          <button type="button" className="rounded-md p-1.5 hover:bg-surface-container" title="Helpful"><span className="material-symbols-outlined text-[17px]">thumb_up</span></button>
                          <button type="button" className="rounded-md p-1.5 hover:bg-surface-container" title="Not helpful"><span className="material-symbols-outlined text-[17px]">thumb_down</span></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}

          </div>
        </div>
        <div className="shrink-0 border-border bg-background px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:px-6">
          <form onSubmit={submit} className="mx-auto w-full max-w-[720px]">
            <div className="rounded-[20px] border border-border bg-surface p-2 shadow-[0_8px_28px_rgba(21,55,13,0.08)]">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(event) => updateQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit(event);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Message Habi..."
                className="max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-3 py-3 font-body-md text-body-md leading-relaxed text-on-surface outline-none placeholder:text-text-muted"
              />
              <div className="flex items-center justify-between px-1 pb-1">
                <button type="button" className="rounded-full p-2 text-text-muted hover:bg-surface-container" title="Attach file">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                <div className="flex items-center gap-2">
                  <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="max-w-[150px] bg-transparent px-2 py-2 font-label-sm text-label-sm text-text-muted outline-none">
                    {courses.length === 0 && <option value="">No course</option>}
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.code ?? course.name}</option>)}
                  </select>
                  {busy ? (
                    <button type="button" onClick={() => controllerRef.current?.abort()} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary" title="Stop">
                      <span className="material-symbols-outlined text-[18px]">stop</span>
                    </button>
                  ) : (
                    <button type="submit" disabled={!question.trim() || !courseId} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-dark-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-outline-variant" title="Send">
                      <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {turns.length === 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => updateQuestion(suggestion)} className="rounded-full border border-border bg-surface px-3 py-2 font-label-sm text-label-sm text-text-muted transition-colors hover:border-tertiary-container hover:bg-surface-container hover:text-primary-container">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-center font-code-tag text-[10px] text-text-muted">Enter to send · Shift + Enter for a new line</p>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
