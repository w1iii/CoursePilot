"use client";

import { useCallback, useEffect, useState } from "react";

interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

interface Task {
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

const TYPES = ["assignment", "quiz", "exam", "project", "activity", "reading"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function priorityClass(priority: Task["priority"]): string {
  if (priority === "high") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (priority === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400";
}

interface EditState {
  title: string;
  type: string;
  dueDate: string;
  priority: Task["priority"];
  notes: string;
}

export default function TaskManager({ courses }: { courses: CourseOption[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    courseId: courses[0]?.id ?? "",
    title: "",
    type: "assignment",
    dueDate: "",
    priority: "medium" as Task["priority"],
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load tasks");
      setTasks(json.tasks ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(taskId: string, body: Record<string, unknown>): Promise<void> {
    setBusyId(taskId);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, ...json.task } : task)),
      );
      setEditingId(null);
      setEdit(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(taskId: string): Promise<void> {
    if (!confirm("Delete this manual task?")) return;
    setBusyId(taskId);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function create(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusyId("new");
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          courseId: newTask.courseId,
          type: newTask.type,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
          priority: newTask.priority,
          notes: newTask.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setShowCreate(false);
      setNewTask((state) => ({ ...state, title: "", dueDate: "", notes: "" }));
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(task: Task): void {
    setEditingId(task.id);
    setEdit({
      title: task.title,
      type: task.type,
      dueDate: toLocalInput(task.due_date),
      priority: task.priority,
      notes: task.notes ?? "",
    });
  }

  const visible = tasks
    .filter((task) => showCompleted || task.status === "pending")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            Show completed
          </label>
          <button
            onClick={() => setShowCreate((open) => !open)}
            disabled={courses.length === 0}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
          >
            {showCreate ? "Cancel" : "Add task"}
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">Connect Canvas and sync to add tasks.</p>
      )}

      {showCreate && courses.length > 0 && (
        <form onSubmit={create} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Title</span>
            <input
              value={newTask.title}
              onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Course</span>
            <select
              value={newTask.courseId}
              onChange={(event) => setNewTask({ ...newTask, courseId: event.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ? `${course.code} — ` : ""}
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Type</span>
            <select
              value={newTask.type}
              onChange={(event) => setNewTask({ ...newTask, type: event.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Due</span>
            <input
              type="datetime-local"
              value={newTask.dueDate}
              onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Priority</span>
            <select
              value={newTask.priority}
              onChange={(event) =>
                setNewTask({ ...newTask, priority: event.target.value as Task["priority"] })
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea
              value={newTask.notes}
              onChange={(event) => setNewTask({ ...newTask, notes: event.target.value })}
              rows={2}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busyId === "new"}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busyId === "new" ? "Saving…" : "Create task"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-zinc-500">Loading tasks…</p>}

      {!loading && visible.length === 0 && courses.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">No tasks yet.</p>
      )}

      <ul className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
        {visible.map((task) => {
          const disabled = busyId === task.id;
          const editing = editingId === task.id && edit;

          return (
            <li key={task.id} className="py-3">
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={task.status === "completed" ? "Mark pending" : "Mark completed"}
                  checked={task.status === "completed"}
                  disabled={disabled}
                  onChange={() =>
                    void mutate(task.id, {
                      status: task.status === "completed" ? "pending" : "completed",
                    })
                  }
                  className="mt-1"
                />

                <div className="min-w-0 flex-1">
                  {!editing ? (
                    <>
                      <p
                        className={`font-medium ${
                          task.status === "completed"
                            ? "text-zinc-400 line-through dark:text-zinc-600"
                            : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {task.courses?.course_code ?? task.courses?.course_name ?? "Course"} ·{" "}
                        {task.type}
                        {task.due_date ? ` · due ${new Date(task.due_date).toLocaleString()}` : ""}
                        {task.is_manual ? "" : " · Canvas"}
                      </p>
                      {task.notes && <p className="mt-1 text-xs text-zinc-500">{task.notes}</p>}
                    </>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void mutate(task.id, {
                          title: edit.title,
                          type: edit.type,
                          dueDate: edit.dueDate ? new Date(edit.dueDate).toISOString() : null,
                          priority: edit.priority,
                          notes: edit.notes || null,
                        });
                      }}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <input
                        value={edit.title}
                        onChange={(event) => setEdit({ ...edit, title: event.target.value })}
                        required
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <select
                        value={edit.type}
                        onChange={(event) => setEdit({ ...edit, type: event.target.value })}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={edit.dueDate}
                        onChange={(event) => setEdit({ ...edit, dueDate: event.target.value })}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <select
                        value={edit.priority}
                        onChange={(event) =>
                          setEdit({ ...edit, priority: event.target.value as Task["priority"] })
                        }
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                      <input
                        value={edit.notes}
                        onChange={(event) => setEdit({ ...edit, notes: event.target.value })}
                        placeholder="Notes"
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={disabled}
                          className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEdit(null);
                          }}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${priorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.is_manual && !editing && (
                    <>
                      <button
                        onClick={() => startEdit(task)}
                        disabled={disabled}
                        className="text-xs text-zinc-500 hover:underline disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void remove(task.id)}
                        disabled={disabled}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
