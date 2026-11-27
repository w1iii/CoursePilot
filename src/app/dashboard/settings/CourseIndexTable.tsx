"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "../types";
import { useJobs } from "../JobProvider";
import { useSync } from "../SyncProvider";

function indexedLabel(value: string | null): string {
  if (!value) return "Not indexed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not indexed";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function count(value: number | null): number {
  return value ?? 0;
}

type AvailableCourse = {
  id: string;
  course_code: string | null;
  course_name: string;
  selected_for_rag: boolean;
};

export default function CourseIndexTable({ courses, connected }: { courses: Course[]; connected: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [available, setAvailable] = useState<AvailableCourse[] | null>(null);
  const [chosenId, setChosenId] = useState("");
  const [adding, setAdding] = useState(false);
  const { running } = useSync();
  const { refresh } = useJobs();
  const locked = running || busyId !== null || adding;

  async function loadCourses() {
    if (locked) return;
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/onboarding/courses", { cache: "no-store" });
      if (!response.ok) throw new Error("courses");
      const result = await response.json() as { courses: AvailableCourse[] };
      setAvailable(result.courses.filter((course) => !course.selected_for_rag));
      setChosenId("");
      router.refresh();
    } catch {
      setError("Could not load Canvas courses. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  async function addCourse() {
    if (!chosenId || locked) return;
    const course = available?.find((item) => item.id === chosenId);
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/courses/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: chosenId, selected: true }),
      });
      if (!response.ok) throw new Error("selection");
      setSuccess(`${course?.course_name ?? "Course"} queued for indexing. You can keep browsing.`);
      refresh();
      setAvailable(null);
      setChosenId("");
    } catch {
      setError("Could not finish adding course. Refresh the course list or resync the course if it appears as Included.");
      setAvailable(null);
    } finally {
      router.refresh();
      setAdding(false);
    }
  }

  async function resync(course: Course) {
    if (!course.selectedForRag || locked) return;
    setBusyId(course.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/sync/courses/${encodeURIComponent(course.id)}`, { method: "POST" });
      if (!response.ok) throw new Error("resync");
      setSuccess(`${course.name} queued for resync. You can keep browsing.`);
      refresh();
      router.refresh();
    } catch {
      setError("Could not resync course. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative" aria-busy={locked}>
      {locked && <p role="status" className="mb-3 text-sm">Background work is running. You can keep browsing.</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
      {success && <p role="status" className="mb-3 rounded-lg border border-primary-container/25 bg-surface-container-low p-3 text-sm text-on-surface">{success}</p>}
      <div className="mb-4 space-y-2">
        <button type="button" onClick={() => void loadCourses()} disabled={!connected || locked} className="border border-accent px-3 py-2 font-label-sm text-label-sm text-accent-text disabled:opacity-50">
          {available ? "Refresh available courses" : "Add course"}
        </button>
        {!connected && <p className="text-sm text-text-muted">Connect Canvas to add courses.</p>}
        {available && (available.length ? <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-on-surface">Available Canvas courses
            <select value={chosenId} onChange={(event) => setChosenId(event.target.value)} disabled={locked} className="max-w-full rounded-lg border border-border bg-surface px-3 py-2">
              <option value="">Choose a course</option>
              {available.map((course) => <option key={course.id} value={course.id}>{course.course_code ? `${course.course_code} — ` : ""}{course.course_name}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void addCourse()} disabled={!chosenId || locked} className="rounded-lg bg-accent px-3 py-2 text-sm text-on-accent disabled:opacity-50">Add and index</button>
        </div> : <p role="status" className="text-sm text-text-muted">No additional active Canvas courses available.</p>)}
      </div>
      {courses.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface-container-low p-space-lg text-sm text-text-muted">No courses yet. Connect Canvas and add a course to get started.</p>}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <th className="pb-2 pr-3 font-medium">Course</th>
              <th className="pb-2 pr-3 font-medium">Indexed</th>
              <th className="pb-2 pr-3 font-medium">Study index</th>
              <th className="pb-2 pr-3 text-right font-medium">Docs</th>
              <th className="pb-2 pr-3 text-right font-medium">Chunks</th>
              <th className="pb-2 text-right font-medium">Failed</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <p className="font-label-sm text-label-sm text-on-surface">
                    {course.code ? `${course.code} — ` : ""}
                    {course.name}
                  </p>
                </td>
                <td className="py-2.5 pr-3 font-code-tag text-[11px] text-text-muted">
                  {indexedLabel(course.ragIndexedAt)}
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider ${course.selectedForRag ? "bg-emerald-700 text-white" : "border border-border text-text-muted"}`}>{course.selectedForRag ? "Included" : "Not selected"}</span>
                    {course.selectedForRag && <button type="button" onClick={() => void resync(course)} disabled={locked} className="border border-accent px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider text-accent-text transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50">{busyId === course.id ? "Syncing…" : "Resync"}</button>}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right font-code-tag text-[11px] text-text-muted">
                  {count(course.ragDocumentCount)}
                </td>
                <td className="py-2.5 pr-3 text-right font-code-tag text-[11px] text-text-muted">
                  {count(course.ragChunkCount)}
                </td>
                <td
                  className={`py-2.5 text-right font-code-tag text-[11px] ${
                    count(course.ragFailureCount) > 0 ? "text-error" : "text-text-muted"
                  }`}
                >
                  {count(course.ragFailureCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {courses.map((course) => (
          <div
            key={course.id}
            className="rounded-xl border border-border bg-surface-container-low p-space-md"
          >
            <div className="flex items-start justify-between gap-3"><p className="font-label-md text-label-md text-on-surface">
              {course.code ? `${course.code} — ` : ""}
              {course.name}
            </p><div className="flex shrink-0 flex-col items-end gap-2"><span className={`rounded-full px-2 py-1 font-code-tag text-[10px] uppercase tracking-wider ${course.selectedForRag ? "bg-emerald-700 text-white" : "border border-border text-text-muted"}`}>{course.selectedForRag ? "Included" : "Not selected"}</span>{course.selectedForRag && <button type="button" onClick={() => void resync(course)} disabled={locked} className="border border-accent px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider text-accent-text disabled:opacity-50">{busyId === course.id ? "Syncing…" : "Resync"}</button>}</div></div>
            <p className="mt-0.5 font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
              {indexedLabel(course.ragIndexedAt)} · {count(course.ragDocumentCount)} docs ·{" "}
              {count(course.ragChunkCount)} chunks
              {count(course.ragFailureCount) > 0
                ? ` · ${count(course.ragFailureCount)} failed`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
