"use client";

import { useSync } from "./SyncProvider";

function finishLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SyncButton({ connected }: { connected: boolean }) {
  const { running, result, error, finishedAt, start } = useSync();

  return (
    <div className="flex flex-col items-start gap-space-sm md:items-end">
      <button
        type="button"
        onClick={() => void start()}
        disabled={running || !connected}
        title={connected ? undefined : "Connect Canvas first"}
        className="inline-flex items-center gap-2 border border-accent bg-accent px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.16em] text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`material-symbols-outlined text-[16px] ${running ? "animate-spin" : ""}`}>
          sync
        </span>
        {running ? "Weaving…" : "Sync now"}
      </button>

      {!connected && (
        <p className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
          Connect Canvas before syncing.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="border border-error/30 bg-error-container/50 px-space-sm py-1 font-body-sm text-body-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      {result && !running && (
        <div className="max-w-xs text-right font-code-tag text-[10px] leading-4 uppercase tracking-[0.12em] text-text-muted">
          <p>
            Synced {result.courses} courses, {result.tasks} tasks, {result.announcements}{" "}
            announcements.
          </p>
          {(result.ragDocuments > 0 || result.ragChunks > 0) && (
            <p>
              Indexed {result.ragDocuments} documents ({result.ragChunks} chunks)
              {result.ragFailures > 0 ? `, ${result.ragFailures} failed` : ""}
              {result.ragSkipped > 0 ? `, ${result.ragSkipped} skipped` : ""}.
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-left text-error">
              {result.errors.slice(0, 5).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
          {result.ragSkippedDetails.length > 0 && (
            <p className="mt-1 text-left">
              Skipped: {result.ragSkippedDetails.slice(0, 5).join(", ")}
              {result.ragSkippedDetails.length > 5 ? "…" : ""}
            </p>
          )}
          {finishLabel(finishedAt) && <p className="mt-1">Last sync {finishLabel(finishedAt)}</p>}
        </div>
      )}
    </div>
  );
}
