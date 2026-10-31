"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CanvasStatus {
  connected: boolean;
  needsReconnect: boolean;
  baseUrl: string | null;
  canvasUserName: string | null;
  canvasUserId: number | null;
  lastValidatedAt: string | null;
  source: "user" | "env" | null;
}

interface Props {
  initialStatus: CanvasStatus;
  defaultBaseUrl: string;
}

export default function CanvasConnect({ initialStatus, defaultBaseUrl }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [showForm, setShowForm] = useState(!initialStatus.connected || initialStatus.needsReconnect);
  const [baseUrl, setBaseUrl] = useState(initialStatus.baseUrl ?? defaultBaseUrl);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/canvas/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_base_url: baseUrl, access_token: token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not connect Canvas");

      setStatus({
        connected: true,
        needsReconnect: false,
        baseUrl: json.baseUrl,
        canvasUserName: json.canvasUserName,
        canvasUserId: json.canvasUserId,
        lastValidatedAt: new Date().toISOString(),
        source: "user",
      });
      setToken("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/canvas/disconnect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not disconnect Canvas");

      setStatus({
        connected: false,
        needsReconnect: false,
        baseUrl: null,
        canvasUserName: null,
        canvasUserId: null,
        lastValidatedAt: null,
        source: null,
      });
      setShowForm(true);
      setBaseUrl(defaultBaseUrl);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Canvas Connection</h2>
          {status.connected ? (
            <p className="text-sm text-zinc-500">
              Connected to <span className="font-medium">{status.baseUrl}</span>
              {status.canvasUserName ? ` as ${status.canvasUserName}` : ""}
              {status.source === "env" ? " (shared development token)" : ""}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Add your Canvas personal access token to sync your own courses.
            </p>
          )}
          {status.needsReconnect && (
            <p className="mt-1 text-sm text-amber-600">
              Canvas rejected the stored token. Reconnect to resume syncing.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {status.connected && (
            <button
              onClick={disconnect}
              disabled={busy}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => setShowForm((open) => !open)}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
          >
            {showForm ? "Cancel" : status.connected ? "Replace token" : "Connect Canvas"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={connect} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Canvas URL</span>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://school.instructure.com"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Personal access token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token"
              autoComplete="off"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <p className="text-xs text-zinc-500 sm:col-span-2">
            Canvas → Account → Settings → New Access Token. The token is encrypted before storage
            and never shown again.
          </p>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || token.trim().length === 0}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busy ? "Verifying…" : "Save connection"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
