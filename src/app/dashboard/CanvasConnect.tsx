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

  const inputClass =
    "rounded-lg border border-border bg-surface px-space-sm py-2 font-body-sm text-body-sm text-on-surface placeholder:text-text-muted focus:border-secondary focus:outline-none";

  return (
    <section id="canvas" className="rounded-2xl border border-border bg-surface p-space-lg shadow-sm">
      <div className="flex flex-col gap-space-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-surface-tint">vpn_key</span>
            <h2 className="font-headline-sm text-headline-sm text-primary-container">Canvas connection</h2>
          </div>
          <p className="mt-1 max-w-xl font-body-sm text-body-sm text-text-muted">
            Connect Canvas so CoursePilot can sync your courses, tasks, announcements, and indexed course files.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-code-tag text-code-tag ${
          status.connected && !status.needsReconnect
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-error-container text-on-error-container"
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.needsReconnect ? "Reconnect required" : status.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {status.connected && !showForm ? (
        <div className="mt-space-lg flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container font-display text-lg text-dark-text">
              {status.canvasUserName?.slice(0, 1).toUpperCase() ?? "C"}
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface">{status.canvasUserName ?? "Canvas account"}</p>
              <p className="font-code-tag text-code-tag text-text-muted">{status.baseUrl}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowForm(true)} className="rounded-lg border border-border bg-surface px-3 py-2 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container">
              Update connection
            </button>
            {status.source === "user" && (
              <button type="button" onClick={() => void disconnect()} disabled={busy} className="rounded-lg border border-error/30 px-3 py-2 font-label-sm text-label-sm text-on-error-container transition-colors hover:bg-error-container disabled:opacity-50">
                Disconnect
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={connect} className="mt-space-lg grid gap-space-md sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Canvas URL</span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className={inputClass + " w-full"} placeholder="https://school.instructure.com" required />
          </label>
          <label className="space-y-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Personal access token</span>
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} className={inputClass + " w-full"} placeholder="Paste your Canvas token" required />
          </label>
          <button type="submit" disabled={busy || !baseUrl.trim() || !token.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${busy ? "animate-spin" : ""}`}>{busy ? "progress_activity" : "link"}</span>
            {busy ? "Connecting…" : "Connect Canvas"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-space-md rounded-lg border border-error/30 bg-error-container/60 px-space-sm py-2 font-body-sm text-body-sm text-on-error-container">{error}</p>}
      {status.lastValidatedAt && !error && (
        <p className="mt-space-md font-code-tag text-code-tag text-text-muted">
          Last validated {new Date(status.lastValidatedAt).toLocaleString()}
        </p>
      )}
    </section>
  );
}
