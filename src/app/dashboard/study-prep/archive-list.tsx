import Link from "next/link";

export type History = { id: string; title: string; mode: string; module: string | null; topic: string | null; created_at?: string; item_count?: number; course: { course_name: string; course_code: string | null } | null; study_sessions: Array<{ id: string; status: string; score: number; last_active_at: string }> };
export type DeleteTarget = { kind: "pack"; id: string; title: string };

export default function ArchiveList({ history, preview = false, onDelete }: { history: History[]; preview?: boolean; onDelete: (target: DeleteTarget) => void }) {
  const packs = preview ? history.slice(0, 3) : history;
  return <>
    <div className="flex items-baseline justify-between gap-2 border-b border-primary-container/25 pb-2"><h2 id="history-heading" className="paper-kicker text-accent-text">{preview ? <Link href="/dashboard/study-prep/archive" className="underline underline-offset-4">From the archive <span aria-hidden="true">→</span></Link> : "Your study packs"}</h2><span className="paper-kicker text-text-muted">{history.length} {history.length === 1 ? "pack" : "packs"}</span></div>
    {history.length === 0 ? <div className="mt-space-md border border-dashed border-primary-container/25 px-4 py-8"><p className="font-display text-2xl text-primary-container">Your first edition awaits.</p><p className="mt-2 font-body-sm text-body-sm text-text-muted">Generated study packs and saved sessions will appear here.</p><Link href="/dashboard/study-prep" className="mt-4 inline-block font-label-sm text-accent-text underline">Create a study pack →</Link></div> : <ul className={`mt-space-md grid gap-3 ${preview ? "" : "md:grid-cols-2 xl:grid-cols-3"}`}>{packs.map((pack) => {
      const sessions = pack.study_sessions ?? [];
      const date = pack.created_at ? new Date(pack.created_at) : null;
      return <li key={pack.id} className="flex min-w-0 flex-col border border-border bg-surface/70 p-4 transition-colors hover:border-primary-container/50">
        <p className="paper-kicker text-accent-text">{pack.mode.replaceAll("_", " ")} {pack.item_count ? `· ${pack.item_count} items` : ""}</p>
        <Link className="mt-2 font-headline-sm text-headline-sm text-primary-container underline decoration-primary-container/30 underline-offset-4 hover:decoration-primary-container" href={`/dashboard/study-prep/${pack.id}`}>{pack.title}</Link>
        <p className="mt-2 font-body-sm text-body-sm text-text-muted">{pack.course?.course_name ?? "Course"}{pack.module ? ` · ${pack.module}` : ""}</p>
        {pack.topic && <p className="mt-1 line-clamp-2 font-body-sm text-body-sm text-text-muted">Focus: {pack.topic}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="font-code-tag text-[10px] uppercase tracking-wider text-text-muted">{sessions.length} {sessions.length === 1 ? "session" : "sessions"}{date && !Number.isNaN(date.getTime()) ? ` · ${date.toLocaleDateString()}` : ""}</span><button type="button" onClick={() => onDelete({ kind: "pack", id: pack.id, title: pack.title })} aria-label={`Delete study pack ${pack.title}`} className="font-label-sm text-label-sm text-text-muted underline underline-offset-4 hover:text-error">Delete pack</button></div>
      </li>;
    })}</ul>}
    {preview && history.length > packs.length && <Link href="/dashboard/study-prep/archive" className="mt-4 inline-block font-label-sm text-accent-text underline underline-offset-4">View all study packs →</Link>}
  </>;
}
