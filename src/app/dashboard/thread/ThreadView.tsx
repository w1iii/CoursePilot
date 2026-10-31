"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import LoomOrbit, { type OrbitCourse } from "../LoomOrbit";

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

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceIcon(type: string): string {
  const value = type.toLowerCase();
  if (value.includes("announce")) return "campaign";
  if (value.includes("slide") || value.includes("lecture")) return "slideshow";
  if (value.includes("code") || value.includes("tex")) return "code";
  if (value.includes("syllab") || value.includes("pdf")) return "description";
  return "menu_book";
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
  const [courseId, setCourseId] = useState(
    initialCourseId || courses[0]?.id || "",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const storageKey = `habi:thread:${initialThreadId}`;

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === courseId) ?? courses[0],
    [courses, courseId],
  );

  const requestAnswer = useCallback(async (turnId: string, q: string, cid: string) => {
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, course_id: cid || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? { ...turn, status: "done" as const, response: json as RagResponse }
            : turn,
        ),
      );
    } catch (err) {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? { ...turn, status: "error" as const, error: (err as Error).message }
            : turn,
        ),
      );
    }
  }, []);

  const startTurn = useCallback(
    (q: string, cid: string) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const turn: Turn = {
        id,
        question: q,
        courseId: cid,
        createdAt: new Date().toISOString(),
        status: "loading",
      };
      setTurns((current) => [...current, turn]);
      setCourseId(cid);
      void requestAnswer(id, q, cid);
      return id;
    },
    [requestAnswer],
  );

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Turn[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurns(parsed);
          setCourseId(parsed[0].courseId || courseId);
          return;
        }
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }

    if (initialQuestion) {
      startTurn(initialQuestion, initialCourseId || courses[0]?.id || "");
    }
  }, [courseId, courses, initialCourseId, initialQuestion, startTurn, storageKey]);

  useEffect(() => {
    if (!didInit.current || turns.length === 0) return;
    if (turns.some((turn) => turn.status === "loading")) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(turns));
    } catch {
      // Storage can be unavailable in private mode; the thread still works in memory.
    }
  }, [storageKey, turns]);

  useEffect(() => {
    if (turns.length > 1) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [turns.length]);

  const busy = turns.some((turn) => turn.status === "loading");
  const totalSources = turns.reduce(
    (count, turn) => count + (turn.response?.sources.length ?? 0),
    0,
  );
  const groundedTurns = turns.filter((turn) => turn.response?.grounded).length;

  const followUps = [
    "Summarize the key points",
    "What should I study first?",
    "Check for schedule conflicts this week",
  ];

  function focusInput() {
    inputRef.current?.focus();
  }

  function submitFollowUp(event: React.FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (!value || !courseId || busy) return;
    startTurn(value, courseId);
    setQuestion("");
  }

  function chooseFollowUp(value: string) {
    setQuestion(value);
    focusInput();
  }

  function selectCourse(course: OrbitCourse) {
    setCourseId(course.id);
    setQuestion(`What's due in ${course.code ?? course.name} this week?`);
    focusInput();
  }

  async function copyAnswer(turn: Turn) {
    if (!turn.response) return;
    try {
      await navigator.clipboard.writeText(turn.response.answer);
      setCopiedId(turn.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  function retry(turn: Turn) {
    setTurns((current) =>
      current.map((item) =>
        item.id === turn.id ? { ...item, status: "loading" as const, error: undefined } : item,
      ),
    );
    void requestAnswer(turn.id, turn.question, turn.courseId);
  }

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded bg-surface-container-low hover:bg-surface transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">
            {sidebarOpen ? "arrow_left" : "arrow_right"}
          </span>
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 font-label-sm text-label-sm transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
        <span className="h-1 w-1 bg-outline-variant" />
        <span className="font-code-tag text-code-tag">
          Thread {initialThreadId.slice(0, 8)}
        </span>
      </div>

      {turns.length === 0 && !initialQuestion && (
        <section className="rounded-xl bg-surface p-space-xl shadow-sm">
          <h1 className="font-headline-md text-headline-md text-primary-container">
            No thread selected
          </h1>
          <p className="mt-1 font-body-sm text-body-sm text-text-muted">
            Ask Habi from the dashboard to start a new woven conversation.
          </p>
          <Link
            href="/dashboard"
            className="mt-space-md inline-flex items-center gap-2 rounded-lg bg-primary-container px-space-lg py-2.5 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Ask Habi
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        <div className={`flex flex-col gap-space-xl lg:col-span-${sidebarOpen ? 7 : 12}`}>
          {turns.map((turn) => {
            const course = courses.find((item) => item.id === turn.courseId) ?? activeCourse;
            const paragraphs = turn.response?.answer
              .split(/\n{2,}/)
              .filter((paragraph) => paragraph.trim().length > 0);

            return (
              <div key={turn.id} className="flex flex-col gap-space-xl">
                <section className="relative overflow-hidden rounded-xl bg-surface p-space-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary-container via-tertiary to-secondary" />
                  <div className="flex flex-col justify-between gap-space-md pl-space-sm sm:flex-row sm:items-center">
                    <div className="flex items-start gap-space-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary-container">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="font-label-md text-label-md text-on-surface">
                            {userName}
                          </span>
                          <span className="font-code-tag text-code-tag text-text-muted">
                            {timeLabel(turn.createdAt)}
                          </span>
                        </div>
                        <p className="font-headline-sm text-headline-sm leading-snug text-primary">
                          &ldquo;{turn.question}&rdquo;
                        </p>
                        <p className="mt-1 font-code-tag text-code-tag text-text-muted">
                          {course?.code ?? course?.name ?? "Course"} · {userEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {turn.status === "loading" && (
                  <article className="relative overflow-hidden rounded-xl bg-surface p-space-xl shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-container via-tertiary-container to-secondary-container" />
                    <div className="flex items-center gap-space-md">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-dark-text">
                        <span className="font-headline-md text-[18px] leading-none">h</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-primary-container">
                          Weaving an answer
                        </p>
                        <p className="font-code-tag text-code-tag text-text-muted">
                          Reading {course?.code ?? course?.name ?? "your course"} sources…
                        </p>
                      </div>
                      <span className="ml-auto material-symbols-outlined animate-spin text-[20px] text-secondary">
                        progress_activity
                      </span>
                    </div>
                    <div className="mt-space-lg space-y-space-sm">
                      <div className="h-4 w-11/12 animate-pulse rounded bg-surface-container" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-surface-container" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-low" />
                    </div>
                  </article>
                )}

                {turn.status === "error" && (
                  <article className="rounded-xl border border-error/30 bg-error-container/50 p-space-lg shadow-sm">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-[22px] text-on-error-container">
                        error
                      </span>
                      <div>
                        <p className="font-label-md text-label-md text-on-error-container">
                          Could not weave this answer
                        </p>
                        <p className="mt-1 font-body-sm text-body-sm text-on-error-container">
                          {turn.error}
                        </p>
                        <button
                          type="button"
                          onClick={() => retry(turn)}
                          className="mt-space-sm rounded-lg bg-primary-container px-space-md py-1.5 font-label-sm text-label-sm text-dark-text"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </article>
                )}

                {turn.response && (
                  <article className="relative overflow-hidden rounded-xl bg-surface p-space-xl shadow-sm md:p-space-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-container via-tertiary-container to-secondary-container" />
                    <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg">
                      <div className="flex items-center gap-space-md">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-dark-text shadow-sm">
                          <span className="font-headline-md text-[18px] leading-none">h</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-primary-container">
                            Habi Academic Intelligence
                          </p>
                          <p className="font-code-tag text-code-tag text-text-muted">
                            {turn.response.course.name} · {turn.response.sources.length} source
                            {turn.response.sources.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-text-muted">
                        <span
                          className={`rounded-full px-space-sm py-0.5 font-code-tag text-code-tag ${
                            turn.response.grounded
                              ? "bg-primary-fixed text-on-primary-fixed-variant"
                              : "bg-surface-container-high"
                          }`}
                        >
                          {turn.response.grounded ? "Grounded" : "General"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copyAnswer(turn)}
                          className="rounded p-1.5 transition-colors hover:bg-surface-container-low"
                          title="Copy answer"
                          aria-label="Copy answer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {copiedId === turn.id ? "check" : "content_copy"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={focusInput}
                          className="rounded p-1.5 transition-colors hover:bg-surface-container-low"
                          title="Ask a follow-up"
                          aria-label="Ask a follow-up"
                        >
                          <span className="material-symbols-outlined text-[18px]">reply</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-surface-container-low p-space-lg">
                      <div className="mb-space-sm flex items-center gap-space-sm">
                        <span className="material-symbols-outlined text-[20px] text-primary-hover">
                          auto_awesome
                        </span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary">
                          Synthesized answer
                        </span>
                      </div>
                      <div className="flex flex-col gap-space-sm">
                        {(paragraphs ?? [turn.response.answer]).map((paragraph, index) => (
                          <p
                            key={`${turn.id}-p-${index}`}
                            className="whitespace-pre-wrap font-body-md text-body-md leading-relaxed text-on-surface"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>

                    {turn.response.sources.length > 0 && (
                      <div className="pb-space-sm pt-space-lg">
                        <span className="mb-space-sm block font-code-tag text-[11px] uppercase tracking-wider text-text-muted">
                          {turn.response.sources.length} source
                          {turn.response.sources.length === 1 ? "" : "s"} verified &amp;
                          interwoven
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {turn.response.sources.map((source) => (
                            <span
                              key={`${turn.id}-${source.id}-${source.label}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-code-tag text-[11px] text-on-surface shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px] text-primary">
                                {sourceIcon(source.source_type)}
                              </span>
                              [{source.label}] {source.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-space-md border-t border-border pt-space-md">
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <button
                          type="button"
                          onClick={() => void copyAnswer(turn)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-space-lg py-2 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            content_copy
                          </span>
                          Copy answer
                        </button>
                        <button
                          type="button"
                          onClick={focusInput}
                          className="inline-flex items-center gap-2 rounded-lg bg-surface px-space-md py-2 font-label-md text-label-md text-primary-container transition-colors hover:bg-surface-container-low"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            forum
                          </span>
                          Ask follow-up
                        </button>
                      </div>
                      <span className="font-code-tag text-code-tag text-text-muted">
                        {turn.response.model}
                      </span>
                    </div>
                  </article>
                )}
              </div>
            );
          })}

          <div ref={endRef} />

          <form
            onSubmit={submitFollowUp}
            className="flex flex-col gap-space-md rounded-xl bg-surface p-space-lg shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-text-muted">auto_awesome</span>
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  Weave next query
                </span>
              </div>
              <label className="flex items-center gap-2 font-code-tag text-code-tag text-text-muted">
                <span>Scope</span>
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  disabled={courses.length === 0}
                  className="max-w-[190px] rounded-lg border border-border bg-surface-container-lowest px-2 py-1 font-code-tag text-code-tag text-primary focus:outline-none disabled:opacity-50"
                >
                  {courses.length === 0 && <option value="">No courses</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ?? course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={inputRef}
                value={question}
                maxLength={2000}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a clarifying question or request specific notes…"
                className="w-full flex-1 rounded-lg bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface shadow-sm outline-none placeholder:text-text-muted focus:bg-surface"
              />
              <button
                type="submit"
                disabled={!question.trim() || !courseId || busy}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-container px-space-lg py-2.5 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Weaving…" : "Ask"}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-code-tag text-[11px] text-text-muted">Follow-ups:</span>
              {followUps.map((followUp) => (
                <button
                  key={followUp}
                  type="button"
                  onClick={() => chooseFollowUp(followUp)}
                  className="rounded-full bg-surface-container-low px-2.5 py-1 font-label-sm text-[12px] text-primary-container transition-colors hover:bg-surface-container"
                >
                  {followUp}
                </button>
              ))}
            </div>
          </form>
        </div>

        {sidebarOpen && (
          <aside className="flex flex-col gap-space-xl lg:col-span-5">
            <div className="flex items-center justify-center rounded-xl bg-surface/70 p-space-sm shadow-sm">
              <LoomOrbit
                courses={courses}
                activeCourseId={courseId}
                onSelectCourse={selectCourse}
                onHubClick={focusInput}
              />
            </div>

            <section className="rounded-xl bg-surface p-space-lg shadow-sm">
              <p className="font-code-tag text-[11px] uppercase tracking-wider text-text-muted">
                Thread context
              </p>
              <h2 className="font-headline-sm text-headline-sm text-primary-container">
                {activeCourse?.code ?? activeCourse?.name ?? "No course selected"}
              </h2>
              <p className="mt-1 font-body-sm text-body-sm text-text-muted">
                {activeCourse?.name ?? "Sync Canvas to load course material."}
              </p>
              {activeCourse?.instructor && (
                <p className="mt-1 font-body-sm text-body-sm text-text-muted">
                  {activeCourse.instructor}
                </p>
              )}
              <div className="mt-space-md grid grid-cols-2 gap-space-sm">
                <div className="rounded-lg bg-surface-container-low p-space-sm">
                  <p className="font-headline-sm text-headline-sm text-primary-container">
                    {totalSources}
                  </p>
                  <p className="font-code-tag text-code-tag text-text-muted">Sources used</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-space-sm">
                  <p className="font-headline-sm text-headline-sm text-primary-container">
                    {groundedTurns}/{Math.max(turns.filter((turn) => turn.status === "done").length, 1)}
                  </p>
                  <p className="font-code-tag text-code-tag text-text-muted">Grounded answers</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-surface p-space-lg shadow-sm">
              <p className="font-code-tag text-[11px] uppercase tracking-wider text-text-muted">
                Keep weaving
              </p>
              <div className="mt-space-sm flex flex-col gap-2">
                {courses.slice(0, 3).map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => selectCourse(course)}
                    className={`flex items-center justify-between gap-space-sm rounded-lg px-space-sm py-2 text-left transition-colors ${
                      course.id === courseId
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <span className="truncate font-label-sm text-label-sm">
                      {course.code ?? course.name}
                    </span>
                    <span className="material-symbols-outlined text-[16px]">north_east</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
