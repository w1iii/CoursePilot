"use client";

import { useMemo, useState, useEffect } from "react";

interface Course {
  id: string;
  name: string;
  code: string | null;
}

export interface DashboardTask {
  id: string;
  course_id: string;
  canvas_task_id: number | null;
  title: string;
  description: string | null;
  type: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  is_manual: boolean;
  notes: string | null;
  courses?: { course_name: string; course_code: string | null } | null;
}

interface Props {
  initialTasks: DashboardTask[];
  courses: Course[];
}

type PriorityFilter = "all" | DashboardTask["priority"];

const TASKS_PER_PAGE = 5;

function dueLabel(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TaskBoard({ initialTasks, courses }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<DashboardTask["priority"]>("medium");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [page, setPage] = useState(1);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed"),
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
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "completed"),
    [tasks],
  );
  const pageCount = Math.max(1, Math.ceil(courseFilteredTasks.length / TASKS_PER_PAGE));
  const visibleTasks = useMemo(
    () => courseFilteredTasks.slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE),
    [courseFilteredTasks, page],
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount, priorityFilter, courseFilter]);

  async function updateTask(id: string, updates: Record<string, string>) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not update task");
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...json.task } : task));
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !courseId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), courseId, dueDate: dueDate || null, priority }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not create task");
      setTasks((current) => [...current, { ...json.task, courses: courses.find((course) => course.id === courseId) ? { course_name: courses.find((course) => course.id === courseId)!.name, course_code: courses.find((course) => course.id === courseId)!.code } : null }]);
      setTitle("");
      setDueDate("");
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: DashboardTask) {
    try {
      await updateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section id="tasks" className="rounded-2xl border border-border bg-surface p-space-lg shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">event_upcoming</span>
            <h2 className="font-headline-sm text-headline-sm text-primary-container">Academic tasks</h2>
          </div>
          <p className="mt-1 font-body-sm text-body-sm text-text-muted">{openTasks.length} open task{openTasks.length === 1 ? "" : "s"} across your courses</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} disabled={courses.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-3 py-2 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]">{showForm ? "close" : "add"}</span>
          {showForm ? "Close" : "Add task"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="mt-space-lg grid gap-space-sm rounded-xl bg-surface-container-low p-space-md md:grid-cols-[1fr_150px_130px_auto] md:items-end">
          <label className="space-y-1"><span className="font-label-sm text-label-sm text-on-surface-variant">Task title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-body-sm text-body-sm outline-none focus:border-tertiary-container" placeholder="e.g. Review chapter 4" required /></label>
          <label className="space-y-1"><span className="font-label-sm text-label-sm text-on-surface-variant">Course</span><select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-body-sm text-body-sm outline-none">{courses.map((course) => <option key={course.id} value={course.id}>{course.code ?? course.name}</option>)}</select></label>
          <label className="space-y-1"><span className="font-label-sm text-label-sm text-on-surface-variant">Due date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-body-sm text-body-sm outline-none" /></label>
          <button type="submit" disabled={busy} className="h-10 rounded-lg bg-tertiary px-4 font-label-md text-label-md text-on-tertiary disabled:opacity-50">{busy ? "Adding…" : "Add"}</button>
          <label className="space-y-1 md:col-start-3"><span className="font-label-sm text-label-sm text-on-surface-variant">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as DashboardTask["priority"])} className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-body-sm text-body-sm outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </form>
      )}

      {error && <p role="alert" className="mt-space-md rounded-lg border border-error/30 bg-error-container/60 px-3 py-2 font-body-sm text-body-sm text-on-error-container">{error}</p>}

      <div className="mt-space-lg flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1" role="group" aria-label="Filter tasks by priority">
          {(["all", "low", "medium", "high"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setPriorityFilter(filter);
                setPage(1);
              }}
              aria-pressed={priorityFilter === filter}
              className={`rounded-md px-2.5 py-1.5 font-label-sm text-label-sm capitalize transition-colors ${
                priorityFilter === filter
                  ? "bg-surface text-primary-container shadow-sm"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 font-label-sm text-label-sm text-text-muted">
          Course
          <select
            aria-label="Filter tasks by course"
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface"
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
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center font-body-sm text-body-sm text-text-muted">
            {openTasks.length === 0
              ? "No open tasks yet. Add a personal task or sync Canvas."
              : "No tasks match the selected filters."}
          </p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-10 px-2 py-3" />
                <th scope="col" className="px-2 py-3 font-label-sm text-label-sm text-text-muted">Task</th>
                <th scope="col" className="px-2 py-3 font-label-sm text-label-sm text-text-muted">Course</th>
                <th scope="col" className="px-2 py-3 font-label-sm text-label-sm text-text-muted">Due</th>
                <th scope="col" className="w-36 px-2 py-3 font-label-sm text-label-sm text-text-muted">Priority</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => void toggleTask(task)}
                  onPriority={(value) => void updateTask(task.id, { priority: value }).catch((err) => setError((err as Error).message))}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {courseFilteredTasks.length > TASKS_PER_PAGE && (
        <nav aria-label="Academic task pages" className="mt-space-lg flex items-center justify-between border-t border-border pt-space-md">
          <p className="font-code-tag text-code-tag text-text-muted">
            Page {page} of {pageCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 font-label-sm text-label-sm text-text-muted transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous task page"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 font-label-sm text-label-sm text-text-muted transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next task page"
            >
              Next
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </nav>
      )}
      {completedTasks.length > 0 && <p className="mt-space-lg font-code-tag text-code-tag text-text-muted">{completedTasks.length} completed task{completedTasks.length === 1 ? "" : "s"}</p>}
    </section>
  );
}

function TaskRow({ task, onToggle, onPriority }: { task: DashboardTask; onToggle: () => void; onPriority: (value: string) => void }) {
  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface-container-low">
      <td className="px-2 py-4 align-middle">
        <button type="button" onClick={onToggle} aria-label={`Mark ${task.title} complete`} className="flex h-5 w-5 items-center justify-center rounded-full border border-secondary text-secondary transition-colors hover:bg-secondary-container">
          <span className="material-symbols-outlined text-[14px]">check</span>
        </button>
      </td>
      <th scope="row" className="px-2 py-4 align-middle font-label-md text-label-md text-on-surface">
        <span>{task.title}</span>
        {task.is_manual && <span className="ml-2 font-code-tag text-code-tag text-text-muted">personal</span>}
      </th>
      <td className="px-2 py-4 align-middle font-body-sm text-body-sm text-text-muted">
        {task.courses?.course_code ?? task.courses?.course_name ?? "Course"}
      </td>
      <td className="px-2 py-4 align-middle font-body-sm text-body-sm text-text-muted">{dueLabel(task.due_date)}</td>
      <td className="px-2 py-4 align-middle">
        <select aria-label={`Priority for ${task.title}`} value={task.priority} onChange={(event) => onPriority(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 font-code-tag text-code-tag text-text-muted">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </td>
    </tr>
  );
}
