"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoomOrbit, { type OrbitCourse } from "./LoomOrbit";

type CourseOption = OrbitCourse;

interface Props {
  userName: string;
  courses: CourseOption[];
}

export default function AskBox({ userName, courses }: Props) {
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || courses.length === 0) return;

    const params = new URLSearchParams({
      tid:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      q: question.trim(),
      course: courseId || courses[0]?.id || "",
    });
    router.push(`/dashboard/thread?${params.toString()}`);
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
          <form
            onSubmit={ask}
            className="relative z-10 mt-space-xl flex flex-col items-stretch gap-space-sm rounded-2xl p-2 sm:flex-row sm:items-center"
          >
            <input
              ref={inputRef}
              value={question}
              maxLength={2000}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  ask(event);
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
              disabled={courses.length === 0 || !question.trim()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-container px-space-lg py-2.5 font-label-md text-label-md text-dark-text shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </button>
          </form>
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

      

      {courses.length === 0 && (
        <p className="relative z-10 mt-space-sm text-center font-body-sm text-body-sm text-text-muted">
          <a href="#canvas" className="underline decoration-tertiary-container underline-offset-4">
            Connect Canvas
          </a>{" "}
          below to import courses, tasks, and announcements.
        </p>
      )}

    </section>
  );
}
