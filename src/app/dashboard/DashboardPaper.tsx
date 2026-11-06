"use client";

import { useMemo, useState } from "react";
import {
  computeStats,
  dueCopy,
  nextUp,
  topPriorities,
} from "@/lib/dashboard";
import StatStrip from "./StatStrip";
import SectionNav from "./SectionNav";
import TaskLedger from "./TaskLedger";
import type { CanvasAccountStatus } from "@/lib/canvas-account";
import type { Course, DashboardTask } from "./types";

interface Props {
  initialTasks: DashboardTask[];
  courses: Course[];
  today: string;
  edition: string;
  canvas: CanvasAccountStatus;
  masthead: React.ReactNode;
  news: React.ReactNode;
  rail: React.ReactNode;
}

const PRIORITY_TONE: Record<DashboardTask["priority"], string> = {
  high: "text-error border-error/50",
  medium: "text-tertiary border-tertiary/60",
  low: "text-text-muted border-border",
};

function shortTimestamp(value: string | null): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPaper({
  initialTasks,
  courses,
  today,
  edition,
  canvas,
  masthead,
  news,
  rail,
}: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(today), [today]);
  const stats = useMemo(() => computeStats(tasks, now), [tasks, now]);
  const priorities = useMemo(() => topPriorities(tasks, 5), [tasks]);
  const lead = useMemo(() => nextUp(tasks, now), [tasks, now]);
  const indexedCourses = useMemo(
    () => courses.filter((course) => Boolean(course.ragIndexedAt)).length,
    [courses],
  );
  const openCount = useMemo(
    () => tasks.filter((task) => task.status !== "completed").length,
    [tasks],
  );
  const documentCount = useMemo(
    () => courses.reduce((total, course) => total + (course.ragDocumentCount ?? 0), 0),
    [courses],
  );
  const failureCount = useMemo(
    () => courses.reduce((total, course) => total + (course.ragFailureCount ?? 0), 0),
    [courses],
  );

  async function updateTask(id: string, updates: Record<string, string>) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not update task");
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...json.task } : task)),
    );
  }

  async function toggleTask(task: DashboardTask) {
    setError(null);
    try {
      await updateTask(task.id, {
        status: task.status === "completed" ? "pending" : "completed",
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function setPriority(
    id: string,
    priority: DashboardTask["priority"],
  ) {
    setError(null);
    try {
      await updateTask(id, { priority });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createTask(input: {
    title: string;
    courseId: string;
    dueDate: string | null;
    priority: DashboardTask["priority"];
  }) {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not create task");

    const course = courses.find((item) => item.id === input.courseId);
    setTasks((current) => [
      ...current,
      {
        ...json.task,
        courses: course ? { course_name: course.name, course_code: course.code } : null,
      },
    ]);
  }

  const leadDue = lead ? dueCopy(lead.due_date, now) : null;

  return (
    <div className="paper-texture min-h-full w-full">
      <div className="mx-auto w-full max-w-[1440px] px-gutter-mobile py-space-lg md:px-gutter lg:px-margin-desktop lg:py-space-xl">
        {masthead}

        <StatStrip
          stats={[
            {
              label: "Open tasks",
              value: stats.open,
              detail: `across ${courses.length} course${courses.length === 1 ? "" : "s"}`,
            },
            {
              label: "Due this week",
              value: stats.dueThisWeek,
              detail: "next 7 days",
            },
            {
              label: "High priority",
              value: stats.high,
              detail: "needs focus",
            },
            {
              label: "Courses",
              value: courses.length,
              detail: `${indexedCourses} indexed for AI`,
            },
          ]}
        />

        <SectionNav />

        <div className="mt-space-lg grid grid-cols-1 gap-space-lg lg:grid-cols-12 lg:gap-0">
          <section className="lg:col-span-7 lg:pr-space-lg xl:col-span-6" aria-labelledby="lead-heading">
            <div className="flex items-baseline justify-between gap-2 border-b border-primary-container/25 pb-1">
              <h2 id="lead-heading" className="paper-kicker text-tertiary">
                Today&apos;s lead
              </h2>
            </div>

            {lead ? (
              <article className="mt-space-sm">
                <h3 className="mt-2 font-display text-[34px] leading-[1.04] tracking-tight text-primary-container sm:text-[40px]">
                  {lead.title}
                </h3>
                <p className="paper-dropcap mt-2 max-w-prose font-body-md text-body-md text-text-muted">
                  {lead.description?.trim() ||
                    "The next item on the loom. Clear it, then the page turns."}
                </p>
                <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
                  <span className="font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    {lead.courses?.course_code ??
                      lead.courses?.course_name ??
                      "Course"}
                  </span>
                  <span className="h-3 w-px bg-border" aria-hidden="true" />
                  <span
                    className={`font-code-tag text-[11px] ${
                      leadDue?.tone === "overdue"
                        ? "text-error"
                        : leadDue?.tone === "today"
                          ? "text-tertiary"
                          : "text-text-muted"
                    }`}
                  >
                    {leadDue?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleTask(lead)}
                    className="ml-auto border border-primary-container px-3 py-1.5 font-code-tag text-[10px] uppercase tracking-[0.14em] text-primary-container transition-colors hover:bg-primary-container hover:text-dark-text"
                  >
                    Mark complete
                  </button>
                </div>
              </article>
            ) : (
              <div className="mt-space-sm border border-dashed border-primary-container/25 px-4 py-8">
                <p className="font-display text-[28px] leading-tight text-primary-container">
                  The page is clear.
                </p>
                <p className="mt-1 font-body-sm text-body-sm text-text-muted">
                  No open tasks. Add one below or sync Canvas for the next edition.
                </p>
              </div>
            )}

            <div className="mt-space-lg border-t border-border pt-space-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-headline-sm text-headline-sm text-primary-container">
                  Priority queue
                </h2>
                <span className="paper-kicker text-text-muted">
                  Five to watch
                </span>
              </div>

              {priorities.length === 0 ? (
                <p className="mt-space-sm font-body-sm text-body-sm text-text-muted">
                  Nothing queued. The loom is quiet.
                </p>
              ) : (
                <ol className="mt-space-sm divide-y divide-border">
                  {priorities.map((task) => {
                    const due = dueCopy(task.due_date, now);

                    return (
                      <li key={task.id} className="flex items-start gap-space-sm py-2.5">
                        <button
                          type="button"
                          onClick={() => void toggleTask(task)}
                          aria-label={`Mark ${task.title} complete`}
                          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-primary-container text-primary-container transition-colors hover:bg-secondary-container"
                        >
                          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                            check
                          </span>
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-label-md text-label-md text-on-surface">
                            {task.title}
                          </p>
                          <p className="mt-0.5 font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
                            {task.courses?.course_code ??
                              task.courses?.course_name ??
                              "Course"}{" "}
                            · {due.label}
                          </p>
                        </div>
                        <span className={`paper-stamp shrink-0 ${PRIORITY_TONE[task.priority]}`}>
                          {task.priority}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          <section className="mt-space-lg border-t border-primary-container/25 pt-space-md lg:col-span-5 lg:mt-0 lg:border-l lg:border-t-0 lg:border-border lg:pl-space-lg lg:pt-0 xl:col-span-3">
            {news}
          </section>

          <aside className="mt-space-lg border-t border-primary-container/25 pt-space-md lg:col-span-12 lg:grid lg:grid-cols-2 lg:gap-space-lg lg:border-t lg:pt-space-md xl:col-span-3 xl:mt-0 xl:flex xl:flex-col xl:border-l xl:border-t-0 xl:border-border xl:pl-space-lg xl:pt-0">
            {rail}
          </aside>
        </div>

        <div className="mt-space-xl border-t-[3px] border-double border-primary-container pt-space-md">
          <TaskLedger
            tasks={tasks}
            courses={courses}
            today={today}
            error={error}
            setError={setError}
            onCreate={createTask}
            onToggle={toggleTask}
            onPriority={setPriority}
          />
        </div>

      </div>
    </div>
  );
}
