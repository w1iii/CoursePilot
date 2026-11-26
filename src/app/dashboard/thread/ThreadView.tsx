"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoomOrbit, { type OrbitCourse } from "../LoomOrbit";
import DashboardShell from "../DashboardShell";
import { useChatStore } from "../ChatProvider";
import { countQuestionWords, MAX_QUESTION_CHARS, MAX_QUESTION_WORDS, validQuestion } from "@/lib/question-limit";

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

interface RagResponse extends Record<string, unknown> {
  answer: string;
  sources: RagSource[];
  model: string;
  grounded: boolean;
  course: { id: string; name: string };
  dailyUsage?: { count: number; limit: number; warning: boolean } | null;
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
  initialTurns?: Turn[];
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("`")) return <code key={key} className="rounded bg-surface-container px-1 py-0.5 font-mono text-[0.9em] text-primary-container">{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={key} className="font-semibold text-on-surface">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderText(text: string) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; lines: string[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const List = list.ordered ? "ol" : "ul";
    blocks.push(<List key={`list-${blocks.length}`} className={`my-2 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
      {list.lines.map((line, index) => <li key={index} className="pl-1">{renderInline(line, `li-${blocks.length}-${index}`)}</li>)}
    </List>);
    list = null;
  };

  text.split("\n").forEach((line, index) => {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    const item = line.match(/^\s*(?:(- |\* )|(\d+\. ))(.+)/);
    if (item) {
      const ordered = Boolean(item[2]);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, lines: [] };
      list.lines.push(item[3]);
      return;
    }
    flushList();
    if (!line.trim()) return;
    if (heading) blocks.push(<h3 key={`heading-${index}`} className="mb-1 mt-4 text-[14px] font-semibold leading-snug text-on-surface">{renderInline(heading[1], `heading-${index}`)}</h3>);
    else blocks.push(<p key={`paragraph-${index}`} className="my-2">{renderInline(line, `paragraph-${index}`)}</p>);
  });
  flushList();
  return blocks;
}

function cleanCitationMarkers(text: string) {
  return text.replace(/\s*\[[^\[\]]+\]/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

export default function ThreadView({
  userName,
  userEmail,
  courses,
  initialQuestion,
  initialCourseId,
  initialThreadId,
  initialTurns,
}: Props) {
  const store = useChatStore();
  store.initialize(initialThreadId, initialTurns ?? []);
  const [, refresh] = useState(0);
  const entry = store.get(initialThreadId);
  const turns = entry.turns as Turn[];
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState(turns.at(-1)?.courseId || initialCourseId || courses[0]?.id || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  function startTurn(prompt: string, cid: string) {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const turn: Turn = { id, question: prompt, courseId: cid, createdAt: new Date().toISOString(), status: "loading" };
    void store.request(initialThreadId, turn);
  }

  useEffect(() => {
    const unsubscribe = store.subscribe(initialThreadId, () => refresh((n) => n + 1));
    refresh((n) => n + 1);
    return unsubscribe;
  }, [store, initialThreadId]);

  useEffect(() => {
    if (initialQuestion && validQuestion(initialQuestion) && store.get(initialThreadId).turns.length === 0 && (initialCourseId || courses[0]?.id)) {
      const id = crypto.randomUUID();
      void store.request(initialThreadId, { id, question: initialQuestion, courseId: initialCourseId || courses[0].id, createdAt: new Date().toISOString(), status: "loading" });
    }
  }, [store, initialThreadId, initialQuestion, initialCourseId, courses]);

  useEffect(() => {
    if (turns.length > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || !courseId || busy || !validQuestion(prompt)) return;
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
    if (!busy) void store.request(initialThreadId, turn, true);
  }

  const busy = turns.some((turn) => turn.status === "loading");
  const dailyUsage = turns.at(-1)?.response?.dailyUsage?.warning ? turns.at(-1)?.response?.dailyUsage : null;
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
          {dailyUsage && (
            <div className="mb-4 rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 px-4 py-3 text-sm text-on-surface">
              You are near your daily request limit: {dailyUsage.count} of {dailyUsage.limit} requests used.
            </div>
          )}
          {entry.saveError && (
            <div role="alert" className="mb-4 rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">
              Chat could not be saved. <button type="button" className="underline" onClick={() => void store.save(initialThreadId)}>Retry saving</button>
            </div>
          )}
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
                  <svg aria-label="Coursa" role="img" viewBox="0 0 32 32" className="mb-4 inline-block h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.1 10.2a8 8 0 1 0 0 11.6" stroke="var(--color-rule)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="22.5" cy="16" r="2" fill="var(--color-accent)" />
                  </svg>
                  <h1 className="font-display text-[38px] leading-tight tracking-[-0.02em] text-primary-container md:text-[46px]">
                    {greeting}, {userName.split(" ")[0]}
                  </h1>
                  <p className="mt-3 font-body-sm text-body-sm text-text-muted">
                    How can I help you today?
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col gap-8 pb-8 pt-8">
              {turns.map((turn) => (
                <div key={turn.id} className="space-y-5">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-surface-container-high px-4 py-3 text-[13px] leading-relaxed text-on-surface">
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
                      {turn.error || "I couldn’t complete that request. Please try again."}
                      <button type="button" disabled={busy} onClick={() => retry(turn)} className="ml-3 underline disabled:opacity-50">Try again</button>
                    </div>
                  )}
                  {turn.response && (
                    <div className="group flex gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container font-display text-sm text-dark-text">h</span>
                      <div className="min-w-0 flex-1 break-words text-[13px] leading-[1.65] text-on-surface">
                        <div>{renderText(cleanCitationMarkers(turn.response.answer))}</div>
                        {turn.response.sources.length > 0 && (
                          <div className="mt-3 border-t border-border/70 pt-2.5">
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {turn.response.sources.map((source) => (
                                <span key={source.id} title={source.title} className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface-container px-2 py-1 text-[11px] leading-snug text-text-muted">
                                  <span className="material-symbols-outlined text-[13px]">description</span>
                                  <span className="truncate">{source.label || source.title}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
            <div className="rounded-[20px] border border-border bg-surface p-1.5 shadow-[0_8px_28px_var(--shadow-color)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={question}
                  aria-label="Message Coursa"
                  aria-invalid={!validQuestion(question)}
                  onChange={(event) => updateQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit(event);
                    }
                  }}
                  rows={1}
                  maxLength={MAX_QUESTION_CHARS}
                  placeholder="Message Coursa..."
                  className="max-h-[180px] min-h-[32px] min-w-0 flex-1 resize-none bg-transparent px-2.5 py-1.5 font-body-md text-body-md leading-relaxed text-on-surface outline-none placeholder:text-text-muted"
                />
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="max-w-[120px] bg-transparent px-1 py-1.5 font-label-sm text-label-sm text-text-muted outline-none"
                  aria-label="Select module"
                >
                  {courses.length === 0 && <option value="">No module</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ?? course.name}
                    </option>
                  ))}
                </select>
                {busy ? (
                  <button type="button" onClick={() => store.stop(initialThreadId)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary" title="Stop" aria-label="Stop response">
                    <span className="material-symbols-outlined text-[16px]">stop</span>
                  </button>
                ) : (
                  <button type="submit" disabled={!question.trim() || !courseId || !validQuestion(question)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-outline-variant" title="Send">
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                )}
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
            <p aria-live="polite" className="mt-2 text-center font-code-tag text-[10px] text-text-muted">{countQuestionWords(question)} / {MAX_QUESTION_WORDS} words{!validQuestion(question) ? " · Word limit exceeded" : " · Enter to send · Shift + Enter for a new line"}</p>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
