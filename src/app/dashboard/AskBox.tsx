"use client";

import { useMemo, useRef, useState } from "react";
import LoomOrbit, { type OrbitCourse } from "./LoomOrbit";

type CourseOption = OrbitCourse;

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

interface Props {
  userName: string;
  courses: CourseOption[];
}

export default function AskBox({ userName, courses }: Props) {
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === courseId) ?? courses[0],
    [courses, courseId],
  );

  const prompts = useMemo(() => {
    const code = (activeCourse?.code ?? activeCourse?.name ?? "my courses").split(" ")[0];
    return [
      {
        icon: "event_upcoming",
        label: `What's due in ${code}?`,
        question: `What's due in ${code} this week?`,
      },
      {
        icon: "campaign",
        label: "Summarize announcements",
        question: "Summarize the latest announcements and flag anything that needs action.",
      },
      {
        icon: "functions",
        label: "Explain latest problem set",
        question: "Explain the key concepts in my latest problem set.",
      },
      {
        icon: "balance",
        label: "Compare next week's deadlines",
        question: "Compare deadlines scheduled for next week and what I should prioritize.",
      },
    ];
  }, [activeCourse]);

  function focusInput() {
    inputRef.current?.focus();
  }

  function applyPrompt(prompt: { question: string; label: string }) {
    setQuestion(prompt.question);
    focusInput();
  }

  function selectCourse(course: OrbitCourse) {
    setCourseId(course.id);
    setQuestion(`What's due in ${course.code ?? course.name} this week?`);
    focusInput();
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || courses.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, course_id: courseId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="ask-habi" className="relative">
      <div className="relative z-10 grid grid-cols-1 items-center gap-space-2xl lg:grid-cols-12 lg:gap-space-3xl">
        <div className="flex flex-col justify-between space-y-space-lg lg:col-span-6">
          <div className="space-y-space-sm">
            <p className="flex items-center gap-space-sm font-code-tag text-code-tag text-text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
              {courses.length > 0
                ? `${courses.length} course${courses.length === 1 ? "" : "s"} woven from Canvas`
                : "Waiting for your first Canvas sync"}
            </p>
            <h1 className="mb-2 font-display text-[38px] leading-none tracking-tight text-primary-container sm:text-[42px] lg:text-[46px] xl:text-[50px]">
              Magandang araw, {userName}
            </h1>
            <h2 className="font-headline-md text-headline-md leading-snug text-primary-container">
              Query your woven knowledge base instantly.
            </h2>
          </div>

          <div className="space-y-space-xs pt-1">
            <p className="font-label-sm text-label-sm text-text-muted">Start with a thread</p>
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => applyPrompt(prompt)}
                  className="flex items-center gap-2 rounded-xl bg-surface-container px-space-md py-2 text-left font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-high hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    {prompt.icon}
                  </span>
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-space-sm lg:col-span-6">
          <LoomOrbit
            courses={courses}
            activeCourseId={courseId}
            onSelectCourse={selectCourse}
            onHubClick={focusInput}
          />
        </div>
      </div>

      <form
        onSubmit={ask}
        className="relative z-10 mt-space-xl flex flex-col items-stretch gap-space-sm rounded-2xl border border-border bg-surface-container-low/90 p-2 shadow-inner sm:flex-row sm:items-center"
      >
        <div className="flex shrink-0 items-center">
          <label className="sr-only" htmlFor="ragCourseScope">
            Course scope
          </label>
          <select
            id="ragCourseScope"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={courses.length === 0}
            className="w-full max-w-[240px] cursor-pointer truncate rounded-lg border border-border bg-surface px-space-sm py-2 font-code-tag text-code-tag text-primary shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:text-text-muted sm:w-auto"
          >
            {courses.length === 0 && <option value="">No courses synced</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code ?? course.name}
              </option>
            ))}
          </select>
        </div>
        <input
          ref={inputRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void ask(event);
            }
          }}
          placeholder={
            courses.length === 0
              ? "Connect Canvas and sync so Habi can search your course material…"
              : "Ask Habi about your courses, problem sets, or notices…"
          }
          className="w-full min-w-0 flex-1 rounded-full border border-border bg-white px-space-md py-2 font-body-sm text-body-sm text-on-surface placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || courses.length === 0 || !question.trim()}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-container px-space-lg py-2.5 font-label-md text-label-md text-dark-text shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{loading ? "Weaving…" : "Send"}</span>
          <span
            className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}
          >
            {loading ? "progress_activity" : "arrow_upward"}
          </span>
        </button>
      </form>

      {courses.length === 0 && (
        <p className="relative z-10 mt-space-sm text-center font-body-sm text-body-sm text-text-muted">
          <a href="#canvas" className="underline decoration-tertiary-container underline-offset-4">
            Connect Canvas
          </a>{" "}
          below to import courses, tasks, and announcements.
        </p>
      )}

      {error && (
        <p className="relative z-10 mt-space-md rounded-xl border border-error/30 bg-error-container/50 px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">
          {error}
        </p>
      )}

      {data && (
        <article className="rag-fade-in relative z-10 mt-space-xl overflow-hidden rounded-2xl border border-border bg-surface/90 p-space-lg shadow-sm backdrop-blur-sm">
          <header className="mb-space-sm flex flex-wrap items-center gap-space-sm border-b border-border pb-space-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container font-display text-sm text-dark-text">
              h
            </span>
            <h3 className="font-headline-sm text-headline-sm text-primary-container">
              Habi&apos;s weave
            </h3>
            <span className="rounded-full bg-secondary-container px-space-sm py-0.5 font-code-tag text-code-tag text-on-secondary-container">
              {data.course.name}
            </span>
            <span
              className={`ml-auto rounded-full px-space-sm py-0.5 font-code-tag text-code-tag ${
                data.grounded
                  ? "bg-primary-fixed text-on-primary-fixed-variant"
                  : "bg-surface-container-high text-text-muted"
              }`}
            >
              {data.grounded ? "Grounded" : "General"}
            </span>
          </header>
          <p className="whitespace-pre-wrap font-body-md text-body-md leading-relaxed text-on-surface">
            {data.answer}
          </p>
          {data.sources.length > 0 && (
            <div className="mt-space-md border-t border-border pt-space-sm">
              <p className="mb-space-xs font-code-tag text-code-tag uppercase tracking-wide text-text-muted">
                Threads pulled from your courses
              </p>
              <ul className="flex flex-wrap gap-2">
                {data.sources.map((source) => (
                  <li
                    key={`${source.id}-${source.label}`}
                    className="rounded-lg bg-surface-container px-space-sm py-1 font-body-sm text-body-sm text-on-surface-variant"
                  >
                    <span className="font-code-tag text-code-tag text-primary">
                      [{source.label}]
                    </span>{" "}
                    {source.title} · {source.source_type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
