"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "../types";
import LoadingLoom from "@/components/LoadingLoom";

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
  const [success, setSuccess] = useState("");

  async function resync(course: Course) {
    if (!course.selectedForRag) return;
    setBusyId(course.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/sync/courses/${encodeURIComponent(course.id)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not resync course");
      setSuccess(`Resynced ${course.name}${result.ragDocuments > 0 ? ` · ${result.ragDocuments} documents indexed` : ""}.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resync course");
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
    <div className="relative">
      {busyId && <LoadingLoom label="Resyncing course" />}
      {error && <p role="alert" className="mb-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
      {success && <p role="status" className="mb-3 rounded-lg border border-primary-container/25 bg-surface-container-low p-3 text-sm text-on-surface">{success}</p>}
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
                    {course.selectedForRag && <button type="button" onClick={() => void resync(course)} disabled={busyId === course.id} className="border border-accent px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider text-accent-text transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50">{busyId === course.id ? "Syncing…" : "Resync"}</button>}
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
            </p><div className="flex shrink-0 flex-col items-end gap-2"><span className={`rounded-full px-2 py-1 font-code-tag text-[10px] uppercase tracking-wider ${course.selectedForRag ? "bg-emerald-700 text-white" : "border border-border text-text-muted"}`}>{course.selectedForRag ? "Included" : "Not selected"}</span>{course.selectedForRag && <button type="button" onClick={() => void resync(course)} disabled={busyId === course.id} className="border border-accent px-2.5 py-1 font-code-tag text-[10px] uppercase tracking-wider text-accent-text disabled:opacity-50">{busyId === course.id ? "Syncing…" : "Resync"}</button>}</div></div>
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
