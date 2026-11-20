"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { saveUsernameRequest } from "@/lib/username-request";

export default function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const [username, setUsername] = useState(initialUsername);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await saveUsernameRequest(username, getToken);
      if (response.status === 401) throw new Error("session");
      if (!response.ok) throw new Error("save");
      const result = await response.json();
      setUsername(result.username);
      setMessage("Username saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error && error.message === "session" ? "Your session expired. Sign in again." : "Could not save username. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={save} className="mb-6 rounded-xl border border-border bg-surface p-5">
    <label htmlFor="profile-username" className="block font-semibold">Coursa username</label>
    <p className="mt-1 text-sm text-text-muted">This name appears throughout Coursa.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={40} required autoComplete="nickname" className="min-w-0 flex-1 rounded-xl border border-border bg-surface-container-low px-4 py-2 text-on-surface" />
      <button disabled={busy || !username.trim()} className="rounded-xl bg-accent px-5 py-2 font-semibold text-on-accent disabled:opacity-50">{busy ? "Saving…" : "Save username"}</button>
    </div>
    {message && <p role="status" className="mt-2 text-sm text-text-muted">{message}</p>}
    <h1> Test </h1>
  </form>;
}
