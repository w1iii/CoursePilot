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
    <div className="flex flex-col gap-2">
      <button
        onClick={sync}
        disabled={loading || !connected}
        title={connected ? undefined : "Connect Canvas first"}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Syncing Canvas…" : "Sync Canvas"}
      </button>
      {!connected && (
        <p className="text-xs text-zinc-500">Connect Canvas before syncing.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="text-xs text-zinc-500">
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
            <ul className="mt-1 list-disc pl-4 text-red-600">
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
