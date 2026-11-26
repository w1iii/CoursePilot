"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PaperReveal from "@/components/PaperReveal";

export default function StudyPackPage() {
  const { packId } = useParams<{ packId: string }>();
  const router = useRouter();
  const [pack, setPack] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; status: string; score: number; current_item: number; last_active_at: string }> | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/study-packs/${packId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("load");
        setPack(data);
      })
      .catch(() => setError("Could not load this study pack. Please try again."));
  }, [packId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/study-packs/${encodeURIComponent(packId)}/sessions`, { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("sessions"); return response.json(); })
      .then((data) => { if (!cancelled) setSessions(data); })
      .catch(() => { if (!cancelled) setSessionError("Could not load study sessions. Refresh to try again."); });
    return () => { cancelled = true; };
  }, [packId]);

  async function deleteSession() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    setSessionError("");
    try {
      const response = await fetch(`/api/study-packs/${encodeURIComponent(packId)}/sessions/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      setSessions((current) => current?.filter((item) => item.id !== deleteId) ?? []);
      setDeleteId(null);
    } catch {
      setSessionError("Could not delete this session. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const response = await fetch(`/api/study-packs/${packId}/sessions`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error("start");
      router.push(`/dashboard/study-prep/${packId}/session/${data.id}`);
    } catch {
      setError("Could not start this study session. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <main className="paper-texture min-h-full p-gutter-mobile md:p-gutter" role="alert"><p className="mx-auto max-w-5xl border-l-2 border-error px-4 py-3 font-body-sm text-body-sm text-error">{error}</p></main>;
  if (!pack) return <main className="paper-texture min-h-full p-gutter-mobile md:p-gutter" role="status"><p className="mx-auto max-w-5xl font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">Opening study edition…</p></main>;

  return (
    <main className="paper-texture min-h-full w-full">
      <div className="mx-auto w-full max-w-[1440px] px-gutter-mobile py-space-lg md:px-gutter lg:px-margin-desktop lg:py-space-xl">
        <PaperReveal><header className="border-b-[3px] border-double border-primary-container pb-space-md">
          <div className="flex flex-wrap items-end justify-between gap-space-md border-b border-primary-container/25 pb-space-md">
            <div>
              <Link className="paper-kicker text-accent-text hover:underline" href="/dashboard/study-prep">← Study desk</Link>
              <p className="mt-space-md paper-kicker text-text-muted">{pack.course?.course_code ?? "Course edition"} · {pack.mode?.replace("_", " ") ?? "Study pack"}</p>
              <h1 className="mt-2 max-w-4xl font-display text-4xl leading-tight text-primary-container sm:text-5xl">{pack.title}</h1>
              <p className="mt-space-sm font-body-md text-body-md text-text-muted">{pack.course?.course_name} {pack.module ? `· ${pack.module}` : ""}</p>
            </div>
            <button type="button" onClick={start} disabled={busy} className="inline-flex min-h-11 items-center gap-2 border border-accent bg-accent px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.15em] text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50">
              {busy ? "Preparing session…" : "Begin study session"}<span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-x-space-lg gap-y-2 pt-space-sm font-code-tag text-[10px] uppercase tracking-[0.13em] text-text-muted">
            <span>{pack.item_count} items</span><span>{pack.study_pack_items?.length ?? 0} previewed</span>
            {pack.difficulty && <span>{pack.difficulty} difficulty</span>}
          </div>
        </header></PaperReveal>

        <section className="mt-space-lg border-b border-primary-container/25 pb-space-lg" aria-labelledby="sessions-heading">
          <div className="flex items-end justify-between gap-4"><div><p className="paper-kicker text-accent-text">Your progress</p><h2 id="sessions-heading" className="mt-1 font-display text-3xl text-primary-container">Study sessions</h2></div><span className="paper-kicker text-text-muted">{sessions?.length ?? 0} saved</span></div>
          {sessionError && <p role="alert" className="mt-3 text-sm text-error">{sessionError}</p>}
          {!sessions && !sessionError ? <p role="status" className="mt-3 text-sm text-text-muted">Loading sessions…</p> : sessions?.length === 0 ? <p className="mt-3 text-sm text-text-muted">No sessions yet. Begin a study session to track your progress.</p> : <ul className="mt-3 divide-y divide-border">{sessions?.map((session) => <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-label-md text-label-md text-on-surface">{session.status === "completed" ? "Completed" : session.status === "paused" ? "Paused" : "In progress"}</p><p className="mt-1 text-sm text-text-muted">{session.status === "completed" ? `Score ${session.score}/${pack.item_count}` : `Question ${Math.min(session.current_item + 1, pack.item_count)} of ${pack.item_count}`} · {new Date(session.last_active_at).toLocaleDateString()}</p></div><div className="flex items-center gap-4"><Link className="font-label-sm text-accent-text underline underline-offset-4" href={`/dashboard/study-prep/${packId}/session/${session.id}`}>{session.status === "completed" ? "Review session" : "Resume session"}</Link><button type="button" onClick={() => setDeleteId(session.id)} aria-label={`Delete ${session.status === "completed" ? "completed" : "active"} session`} className="font-label-sm text-text-muted underline underline-offset-4 hover:text-error">Delete session</button></div></li>)}</ul>}
        </section>

        {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-container/35 p-4" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-session-heading" aria-describedby="delete-session-description" className="w-full max-w-md border border-border bg-surface p-space-lg shadow-xl"><h2 id="delete-session-heading" className="font-display text-3xl text-primary-container">Delete session?</h2><p id="delete-session-description" className="mt-3 text-sm text-text-muted">This session and its progress will be permanently deleted. This cannot be undone.</p>{sessionError && <p role="alert" className="mt-3 text-sm text-error">{sessionError}</p>}<div className="mt-5 flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteId(null)} className="border border-border px-4 py-2">Cancel</button><button type="button" disabled={deleting} onClick={() => void deleteSession()} className="bg-error px-4 py-2 text-on-error disabled:opacity-50">{deleting ? "Deleting…" : "Delete permanently"}</button></div></section></div>}

        <PaperReveal delay={140}><section className="mt-space-lg" aria-labelledby="preview-heading">
          <div className="mb-space-md flex items-end justify-between gap-4 border-b border-primary-container/25 pb-2">
            <div><p className="paper-kicker text-accent-text">Inside this edition</p><h2 id="preview-heading" className="mt-1 font-display text-3xl text-primary-container">Pack preview</h2></div>
            <span className="paper-kicker text-text-muted">{pack.study_pack_items?.length ?? 0} questions</span>
          </div>
          <ol className="grid grid-cols-1 gap-x-space-lg md:grid-cols-2">
            {pack.study_pack_items?.map((item: any, i: number) => (
              <li key={item.id} className="relative border-b border-primary-container/20 py-space-md pl-12">
                <span className="absolute left-0 top-space-md font-display text-3xl text-primary-container/35">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-wrap items-center gap-2"><span className="paper-kicker text-accent-text">{item.item_type?.replace("_", " ") ?? "Study prompt"}</span><span className="paper-kicker text-text-muted">{item.difficulty}</span></div>
                <h3 className="mt-2 font-headline-sm text-headline-sm text-primary-container">{item.question}</h3>
                <p className="mt-3 font-body-sm text-body-sm text-on-surface">{item.answer}</p>
                {item.explanation && <p className="mt-2 border-l border-primary-container/25 pl-3 font-body-sm text-body-sm text-text-muted">{item.explanation}</p>}
                {item.citations?.length > 0 && <p className="mt-3 font-code-tag text-[10px] text-text-muted">Sources: {item.citations.map((c: any) => c.label ?? c.title).join(", ")}</p>}
              </li>
            ))}
          </ol>
        </section></PaperReveal>
      </div>
    </main>
  );
}
