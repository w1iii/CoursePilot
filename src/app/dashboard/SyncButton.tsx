"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResponse {
  courses: number;
  tasks: number;
  announcements: number;
  documents: number;
  ragDocuments: number;
  ragChunks: number;
  ragFailures: number;
  ragSkipped: number;
  errors: string[];
}

export default function SyncButton({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function sync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setResult(json);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-space-sm md:items-end">
      <button
        type="button"
        onClick={sync}
        disabled={loading || !connected}
        title={connected ? undefined : "Connect Canvas first"}
        className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-space-xl py-3 font-label-md text-label-md text-dark-text shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
          sync
        </span>
        {loading ? "Weaving Canvas…" : "Sync now"}
      </button>

      {!connected && (
        <p className="font-body-sm text-body-sm text-text-muted">
          Connect Canvas before syncing.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-error/30 bg-error-container/50 px-space-sm py-1 text-body-sm text-on-error-container">
          {error}
        </p>
      )}

      {result && (
        <div className="text-right font-body-sm text-body-sm text-text-muted">
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
        </div>
      )}
    </div>
  );
}
