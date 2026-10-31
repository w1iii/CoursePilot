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

  
}
