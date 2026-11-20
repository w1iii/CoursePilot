"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useState } from "react";

export default function DeleteAccount() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("session");
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmation }),
      });
      if (response.status === 401) throw new Error("session");
      if (!response.ok) throw new Error("delete");
      await signOut({ redirectUrl: "/" }).catch(() => { window.location.assign("/"); });
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "session" ? "Your session expired. Sign in again to retry." : "Account deletion could not be completed. Retry or contact support.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-error/30 px-3 py-2 text-sm text-on-error-container">Delete account</button>;
  return <form onSubmit={remove} className="w-full max-w-md space-y-3 rounded-xl border border-error/30 p-4">
    <p className="text-sm text-on-surface"><strong>Permanent deletion:</strong> Your account, email, Canvas connection, conversations, and personal Coursa data will be deleted. Indexed course material will remain. This cannot be undone.</p>
    <label className="block text-sm text-on-surface">Type DELETE to confirm
      <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2" />
    </label>
    {error && <p role="alert" className="text-sm text-on-error-container">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy || confirmation !== "DELETE"} className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container disabled:opacity-50">{busy ? "Deleting…" : "Permanently delete account"}</button>
      <button type="button" disabled={busy} onClick={() => { setOpen(false); setConfirmation(""); setError(""); }} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button>
    </div>
  </form>;
}
