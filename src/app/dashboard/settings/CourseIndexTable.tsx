"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "../types";

function indexedLabel(value: string | null): string {
  if (!value) return "Not indexed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not indexed";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function count(value: number | null): number {
  return value ?? 0;
}

export default function CourseIndexTable({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(course: Course) {
    setBusyId(course.id);
    setError("");
    try {
      const response = await fetch("/api/courses/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, selected: !course.selectedForRag }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update course");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update course");
    } finally {
      setBusyId(null);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-container-low p-space-lg">
        <p className="font-label-md text-label-md text-on-surface">No courses indexed yet</p>
        <p className="mt-1 font-body-sm text-body-sm text-text-muted">
          Connect Canvas and run a sync to pull your courses and study material into Habi.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <th className="pb-2 pr-3 font-medium">Course</th>
              <th className="pb-2 pr-3 font-medium">Indexed</th>
              <th className="pb-2 pr-3 font-medium">RAG</th>
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
                  <button type="button" onClick={() => void toggle(course)} disabled={busyId === course.id} aria-pressed={Boolean(course.selectedForRag)} className={`rounded-full px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider disabled:opacity-50 ${course.selectedForRag ? "bg-emerald-700 text-white" : "border border-border text-text-muted"}`}>
                    {busyId === course.id ? "Updating…" : course.selectedForRag ? "Included · Remove" : "Add course"}
                  </button>
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
            </p><button type="button" onClick={() => void toggle(course)} disabled={busyId === course.id} aria-pressed={Boolean(course.selectedForRag)} className={`shrink-0 rounded-full px-2 py-1 text-xs disabled:opacity-50 ${course.selectedForRag ? "bg-emerald-700 text-white" : "border border-border text-text-muted"}`}>{busyId === course.id ? "…" : course.selectedForRag ? "Included" : "Add"}</button></div>
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
    </>
  );
}
