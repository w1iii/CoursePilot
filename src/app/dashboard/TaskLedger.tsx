"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dueCopy } from "@/lib/dashboard";
import type { Course, DashboardTask } from "./types";

interface NewTaskInput {
  title: string;
  courseId: string;
  dueDate: string | null;
  priority: DashboardTask["priority"];
}

interface Props {
  tasks: DashboardTask[];
  courses: Course[];
  today: string;
  error: string | null;
  setError: (value: string | null) => void;
  onCreate: (input: NewTaskInput) => Promise<void>;
  onToggle: (task: DashboardTask) => Promise<void>;
  onPriority: (id: string, priority: DashboardTask["priority"]) => Promise<void>;
  onDelete: (task: DashboardTask) => Promise<void>;
}

type PriorityFilter = "all" | DashboardTask["priority"];

const TASKS_PER_PAGE = 5;

const PRIORITY_TONE: Record<DashboardTask["priority"], string> = {
  high: "text-[#b3261e] border-[#b3261e]/50",
  medium: "text-secondary border-secondary/60",
  low: "text-text-muted border-border",
};

function dueToneClass(tone: ReturnType<typeof dueCopy>["tone"]): string {
  if (tone === "overdue") return "text-error";
  if (tone === "today") return "text-tertiary";
  return "text-text-muted";
}

export default function TaskLedger({
  tasks,
  courses,
  today,
  error,
  setError,
  onCreate,
  onToggle,
  onPriority,
  onDelete,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<DashboardTask["priority"]>("medium");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const hasSelectedTask = Boolean(selectedTask);
  const now = useMemo(() => new Date(today), [today]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (hasSelectedTask && dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [hasSelectedTask]);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed"),
    [tasks],
  );
  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );
  const filteredTasks = useMemo(
    () =>
      priorityFilter === "all"
        ? openTasks
        : openTasks.filter((task) => task.priority === priorityFilter),
    [openTasks, priorityFilter],
  );
  const courseFilteredTasks = useMemo(
    () =>
      courseFilter === "all"
        ? filteredTasks
        : filteredTasks.filter((task) => task.course_id === courseFilter),
    [filteredTasks, courseFilter],
  );

  const pageCount = Math.max(1, Math.ceil(courseFilteredTasks.length / TASKS_PER_PAGE));
  const visibleTasks = useMemo(
    () => courseFilteredTasks.slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE),
    [courseFilteredTasks, page],
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount, priorityFilter, courseFilter]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !courseId) return;

    setBusy(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        courseId,
        dueDate: dueDate || null,
        priority,
      });
      setTitle("");
      setDueDate("");
      setShowForm(false);
    } catch {
      setError("Could not create task. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-1.5 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-text-muted focus:border-primary-container";

  return (
    <section id="tasks" aria-labelledby="ledger-heading">
      <div className="flex flex-wrap items-end justify-between gap-space-sm border-b border-primary-container/25 pb-1">
        <div>
          <h2
            id="ledger-heading"
            className="mt-0.5 font-display text-[30px] leading-tight text-primary-container"
          >
            Academic tasks
          </h2>
        </div>
        <div className="flex items-center gap-space-sm">
          <p className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {openTasks.length} open · {completedCount} filed
          </p>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            disabled={courses.length === 0}
            className="inline-flex items-center gap-1.5 border border-accent bg-accent px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.16em] text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {showForm ? "close" : "add"}
            </span>
            {showForm ? "Close" : "Add task"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={createTask}
          className="mt-space-md grid gap-space-sm border border-border bg-surface p-space-md md:grid-cols-[1.4fr_1fr_150px_130px_auto] md:items-end"
        >
          <label className="space-y-1">
            <span className="paper-kicker text-text-muted">Task title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="e.g. Review chapter 4"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="paper-kicker text-text-muted">Course</span>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className={inputClass}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ?? course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="paper-kicker text-text-muted">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="paper-kicker text-text-muted">Priority</span>
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as DashboardTask["priority"])
              }
              className={inputClass}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-9 border border-accent bg-accent px-4 font-code-tag text-[10px] uppercase tracking-[0.16em] text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-space-md border border-error/30 bg-error-container/50 px-space-sm py-2 font-body-sm text-body-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      <div className="mt-space-md flex flex-wrap items-end justify-between gap-space-sm">
        <div
          className="flex items-center gap-4 border-b border-transparent"
          role="group"
          aria-label="Filter tasks by priority"
        >
          {(["all", "low", "medium", "high"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setPriorityFilter(filter);
                setPage(1);
              }}
              aria-pressed={priorityFilter === filter}
              className={`border-b-2 pb-1 font-code-tag text-[10px] uppercase tracking-[0.16em] transition-colors ${
                priorityFilter === filter
                  ? "border-accent text-accent-text"
                  : "border-transparent text-text-muted hover:text-on-surface"
              }`}
            >
              {filter === "all" ? "All" : filter}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2">
          <span className="paper-kicker text-text-muted">Course</span>
          <select
            aria-label="Filter tasks by course"
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-none border-0 border-b border-border bg-transparent px-0 py-1 font-code-tag text-[11px] text-on-surface outline-none focus:border-primary-container"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code ?? course.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-space-sm overflow-x-auto">
        {courseFilteredTasks.length === 0 ? (
          <p className="border border-dashed border-primary-container/25 px-4 py-8 text-center font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">
            {openTasks.length === 0
              ? "No open tasks. Add one or sync Canvas."
              : "No tasks match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-y border-primary-container/25">
                <th scope="col" className="w-10 px-2 py-2">
                  <span className="sr-only">Complete</span>
                </th>
                <th scope="col" className="px-2 py-2 paper-kicker text-text-muted">
                  Task
                </th>
                <th scope="col" className="px-2 py-2 paper-kicker text-text-muted">
                  Course
                </th>
                <th scope="col" className="px-2 py-2 paper-kicker text-text-muted">
                  Due
                </th>
                <th scope="col" className="w-32 px-2 py-2 paper-kicker text-text-muted">
                  Priority
                </th>
                <th scope="col" className="w-20 px-2 py-2 paper-kicker text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const due = dueCopy(task.due_date, now);

                return (
                  <tr
                    key={task.id}
                    className="border-b border-border transition-colors hover:bg-surface-container-low/60"
                  >
                    <td className="px-2 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => void onToggle(task)}
                        aria-label={`Mark ${task.title} complete`}
                        className="flex h-4 w-4 items-center justify-center border border-primary-container text-primary-container/50 transition-colors hover:bg-secondary-container hover:text-primary-container"
                      >
                        <span
                          className="material-symbols-outlined text-[12px]"
                          aria-hidden="true"
                        >
                          check
                        </span>
                      </button>
                    </td>
                    <th scope="row" className="px-2 py-3 align-middle">
                      <button type="button" onClick={() => setSelectedTaskId(task.id)} className="text-left font-label-md text-label-md text-on-surface underline-offset-4 hover:text-accent-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                        {task.title}
                      </button>
                      {task.is_manual && (
                        <span className="ml-2 font-code-tag text-[9px] uppercase tracking-[0.14em] text-text-muted">
                          Personal
                        </span>
                      )}
                      <span
                        className={`paper-stamp ml-2 ${PRIORITY_TONE[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </th>
                    <td className="px-2 py-3 align-middle font-code-tag text-[11px] text-text-muted">
                      {task.courses?.course_code ?? task.courses?.course_name ?? "Course"}
                    </td>
                    <td className={`px-2 py-3 align-middle font-code-tag text-[11px] ${dueToneClass(due.tone)}`}>
                      {due.label}
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <select
                        aria-label={`Priority for ${task.title}`}
                        value={task.priority}
                        onChange={(event) =>
                          void onPriority(
                            task.id,
                            event.target.value as DashboardTask["priority"],
                          )
                        }
                        className="w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-1 font-code-tag text-[11px] text-text-muted outline-none focus:border-primary-container"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      {task.is_manual && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Delete “${task.title}”?`)) return;
                            try {
                              await onDelete(task);
                            } catch {
                              setError("Could not delete task. Please try again.");
                            }
                          }}
                          aria-label={`Delete ${task.title}`}
                          className="font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted underline underline-offset-4 hover:text-error"
                        >Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {courseFilteredTasks.length > TASKS_PER_PAGE && (
        <nav
          aria-label="Academic task pages"
          className="mt-space-sm flex items-center justify-between border-t border-border pt-space-sm"
        >
          <p className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
            Page {page} of {pageCount}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous task page"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next task page"
            >
              Next →
            </button>
          </div>
        </nav>
      )}
      {selectedTask && (
        <dialog
          ref={dialogRef}
          aria-labelledby="task-details-heading"
          onClose={() => setSelectedTaskId(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          className="paper-texture m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border border-primary-container/25 bg-surface p-space-lg text-on-surface shadow-[0_18px_60px_var(--shadow-color)] backdrop:bg-primary-container/35 backdrop:backdrop-blur-sm"
        >
          <div className="flex items-start justify-between gap-4 border-b border-primary-container/25 pb-space-sm">
            <div>
              <p className="paper-kicker text-accent-text">Task details</p>
              <h2 id="task-details-heading" className="mt-2 font-display text-[32px] leading-tight text-primary-container">{selectedTask.title}</h2>
            </div>
            <button type="button" aria-label="Close task details" onClick={() => dialogRef.current?.close()} className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-text-muted transition-colors hover:border-accent hover:text-accent-text">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
            </button>
          </div>
          <div className="mt-space-md grid gap-space-sm sm:grid-cols-2">
            {[
              ["Course", selectedTask.courses?.course_code ?? selectedTask.courses?.course_name ?? "Course"],
              ["Due", dueCopy(selectedTask.due_date, now).label],
              ["Type", selectedTask.type],
              ["Priority", selectedTask.priority],
              ["Status", selectedTask.status],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="paper-kicker text-text-muted">{label}</p>
                <p className="mt-1 font-body-md capitalize text-on-surface">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-space-md border-t border-border pt-space-md">
            <p className="paper-kicker text-text-muted">Description</p>
            <p className="mt-2 whitespace-pre-wrap font-body-md leading-relaxed text-on-surface">{selectedTask.description?.trim() || "No description provided."}</p>
          </div>
          {selectedTask.notes?.trim() && (
            <div className="mt-space-md border-t border-border pt-space-md">
              <p className="paper-kicker text-text-muted">Notes</p>
              <p className="mt-2 whitespace-pre-wrap font-body-md leading-relaxed text-on-surface">{selectedTask.notes}</p>
            </div>
          )}
        </dialog>
      )}
    </section>
  );
}
