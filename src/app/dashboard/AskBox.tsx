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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    <section id="ask-habi" className="relative mx-auto flex w-full max-w-[900px] justify-center">
      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="flex w-full max-w-[820px] flex-col justify-between space-y-space-lg">
          <div className="grid items-center gap-space-sm sm:grid-cols-[minmax(220px,300px)_1fr]">
            <div className="flex items-center justify-center">
              <LoomOrbit
                compact
                courses={courses}
                activeCourseId={courseId}
                onSelectCourse={selectCourse}
                onHubClick={focusInput}
              />
            </div>
            <div className="space-y-space-sm text-center sm:text-left">
              <h1 className="mb-2 font-display text-[32px] leading-tight tracking-tight text-primary-container sm:text-[36px] lg:text-[40px]">
                Magandang araw, {userName}
              </h1>
            </div>
          </div>

          <form
            onSubmit={ask}
            className="relative z-10 mx-auto mt-space-xl flex min-h-[112px] w-full max-w-[740px] flex-col justify-between rounded-[24px] border border-border bg-surface p-space-sm shadow-[0_8px_28px_rgba(21,55,13,0.08)]"
          >
            <textarea
              ref={inputRef}
              value={question}
              maxLength={2000}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(event);
                }
              }}
              placeholder={
                courses.length === 0
                  ? "Connect Canvas and sync so Habi can search your course material…"
                  : "Ask Habi about your courses, problem sets, or notices…"
              }
              rows={2}
              className="min-h-[52px] w-full min-w-0 flex-1 resize-none bg-transparent px-space-md py-space-sm font-body-sm text-body-sm text-on-surface outline-none placeholder:text-text-muted"
            />
            <div className="flex items-center justify-between gap-space-sm border-t border-border px-1 pt-space-sm">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-container hover:text-primary-container"
                title="Attach file"
                aria-label="Attach file"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
              <div className="flex items-center gap-space-sm">
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  disabled={courses.length === 0}
                  className="max-w-[180px] bg-transparent px-2 py-1.5 font-label-sm text-label-sm text-text-muted outline-none"
                  aria-label="Course scope"
                >
                  {courses.length === 0 && <option value="">No course</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ?? course.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={courses.length === 0 || !question.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-dark-text transition-all hover:scale-105 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-outline-variant disabled:opacity-70"
                  aria-label="Send message"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {courses.length === 0 && (
        <p className="absolute top-full mt-space-sm w-full text-center font-body-sm text-body-sm text-text-muted">
          <a href="#canvas" className="underline decoration-tertiary-container underline-offset-4">
            Connect Canvas
          </a>{" "}
          below to import courses, tasks, and announcements.
        </p>
      )}

    </section>
  );
}
