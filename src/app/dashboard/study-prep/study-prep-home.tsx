"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PaperReveal from "@/components/PaperReveal";
import { useJobs } from "../JobProvider";
import ArchiveList, { type History, type DeleteTarget } from "./archive-list";

type Course = { id: string; course_name: string; course_code: string | null; rag_indexed_at: string | null };
const fieldClass = "mt-1.5 w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary-container";
const labelClass = "paper-kicker text-text-muted";

export default function StudyPrepHome({ archive = false }: { archive?: boolean }) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [modules, setModules] = useState<Array<{ id: number; name: string; chunks: number }>>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [refreshingModules, setRefreshingModules] = useState(false);
  const [moduleRefreshVersion, setModuleRefreshVersion] = useState(0);
  const [moduleRefreshStatus, setModuleRefreshStatus] = useState("");
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("flashcards");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queued, setQueued] = useState(false);
  const { refresh, version } = useJobs();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!archive) fetch("/api/study-prep/courses").then((r) => r.ok ? r.json() : []).then((c) => { setCourses(c); if (c.length === 1) setCourseId(c[0].id); }).catch(() => setCourses([]));
    fetch("/api/study-packs").then((r) => { if (!r.ok) throw new Error("history"); return r.json(); }).then(setHistory).catch(() => setHistoryError(true)).finally(() => setHistoryLoading(false));
  }, [archive, version]);
  useEffect(() => {
    let cancelled = false;
    setModules([]);
    setSelectedModules([]);
    setModulesLoading(Boolean(courseId));
    if (!courseId) {
      setModulesLoading(false);
      return;
    }
    fetch(`/api/study-prep/courses/${encodeURIComponent(courseId)}/modules`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (response.status === 409) {
          setModules([]);
          return;
        }
        if (!response.ok) throw new Error("modules");
        setModules(Array.isArray(data.modules) ? data.modules.filter((item: { name?: unknown }) => typeof item.name === "string" && item.name.trim()) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setModules([]);
        setError("Could not load course modules. Please try again.");
      })
      .finally(() => { if (!cancelled) setModulesLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, moduleRefreshVersion]);

  async function refreshModules() {
    if (!courseId || refreshingModules) return;
    setRefreshingModules(true);
    setModuleRefreshStatus("");
    try {
      const response = await fetch(`/api/study-prep/courses/${encodeURIComponent(courseId)}/modules/refresh`, { method: "POST" });
      if (!response.ok) throw new Error("Could not refresh modules. Check your Canvas connection and try again.");
      setModuleRefreshVersion((version) => version + 1);
      setModuleRefreshStatus("Module names refreshed. Indexed documents were not changed.");
    } catch {
      setModuleRefreshStatus("Could not refresh modules. Check your Canvas connection and try again.");
    } finally {
      setRefreshingModules(false);
    }
  }

  async function generate() {
    setError(""); setQueued(false); setLoading(true);
    try {
      const response = await fetch("/api/study-packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, moduleIds: selectedModules, topic: topic.trim() || null, mode, count, difficulty }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create study materials. Please try again.");
      if (response.status === 202) { setQueued(true); refresh(); }
      else router.push(`/dashboard/study-prep/${data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create study materials. Please try again."); }
    finally { setLoading(false); }
  }

  async function deleteEntry() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const url = `/api/study-packs/${encodeURIComponent(deleteTarget.id)}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      setHistory((current) => current.filter((pack) => pack.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("Could not delete this item. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === courseId);
  const canGenerate = Boolean(courseId && selectedCourse?.rag_indexed_at && selectedModules.length > 0 && !modulesLoading && !refreshingModules);

  return (
    <main className="paper-texture min-h-full w-full">
      <div className="mx-auto w-full max-w-[1440px] px-gutter-mobile py-space-lg md:px-gutter lg:px-margin-desktop lg:py-space-xl">
        <PaperReveal><header className="border-b-[3px] border-double border-primary-container pb-space-md">
          <div className="flex flex-wrap items-end justify-between gap-space-sm border-b border-primary-container/25 pb-space-sm">
            <div><p className="paper-kicker text-accent-text">Study desk</p><h1 className="mt-2 font-display text-4xl leading-tight text-primary-container sm:text-5xl">{archive ? "Study archive" : "Quiz & Exam Prep"}</h1></div>
          </div>
          {archive ? <Link href="/dashboard/study-prep" className="mt-space-sm inline-block font-label-md text-label-md text-accent-text underline underline-offset-4">← Back to study prep</Link> : <p className="mt-space-sm max-w-2xl font-body-lg text-body-lg text-text-muted">Turn indexed course material into grounded flashcards and practice quizzes. Pick your coverage; we&apos;ll build the study set.</p>}
        </header></PaperReveal>

        <PaperReveal delay={120} className="mt-space-lg"><div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12 lg:gap-0">
          {!archive && <section className="relative lg:col-span-7 lg:pr-space-xl xl:col-span-8" aria-labelledby="builder-heading" aria-busy={loading}>
            {loading && <p role="status">Queueing your study pack…</p>}
            {queued && <p role="status">Study pack queued. Keep browsing; we&apos;ll notify you when it finishes.</p>}
            {courses.length === 0 ? <div className="mt-space-md border border-dashed border-primary-container/25 px-space-md py-space-xl" role="status"><p className="paper-kicker text-accent-text">First, choose your sources</p><h3 className="mt-2 font-headline-sm text-headline-sm text-primary-container">No selected courses</h3><p className="mt-2 font-body-md text-body-md text-text-muted">Connect Canvas and sync your course content to make study materials available.</p><Link className="mt-space-md inline-flex items-center gap-2 font-label-md text-label-md text-accent-text underline underline-offset-4" href="/dashboard/settings">Open course settings <span aria-hidden="true">→</span></Link></div> : <div className="mt-space-md">
              <label className={labelClass} htmlFor="study-course">Course source</label>
              <select id="study-course" className={fieldClass} value={courseId} disabled={refreshingModules} onChange={(e) => { setCourseId(e.target.value); setSelectedModules([]); setModuleRefreshStatus(""); }}><option value="">Choose a course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.course_code ? `${c.course_code} · ` : ""}{c.course_name}</option>)}</select>
              {selectedCourse && !selectedCourse.rag_indexed_at && <p role="status" className="mt-3 border-l-2 border-secondary px-3 py-2 font-body-sm text-body-sm text-text-muted">This course isn&apos;t indexed yet. Sync Canvas content before generating a pack.</p>}

              <fieldset className="mt-space-lg"><legend className={labelClass}>Choose modules · {selectedModules.length}/2</legend>
                <p className="mt-2 font-body-sm text-body-sm text-text-muted">Select one or two indexed modules.</p>
                {modulesLoading ? <p role="status" className="mt-3 text-sm text-text-muted">Loading modules…</p> : courseId && modules.length === 0 ? <p className="mt-3 text-sm text-text-muted">No modules available. Refresh module names or sync your course.</p> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{modules.map((item) => {
                  const checked = selectedModules.includes(item.id);
                  const disabled = item.chunks === 0 || (!checked && selectedModules.length >= 2);
                  return <label key={item.id} className={`flex items-start gap-3 border px-3 py-3 ${checked ? "border-primary-container bg-surface-container-low" : "border-border"} ${disabled ? "opacity-50" : "cursor-pointer hover:border-primary-container/50"}`}><input type="checkbox" className="mt-1 accent-primary-container" checked={checked} disabled={disabled} onChange={() => setSelectedModules((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : current.length < 2 ? [...current, item.id] : current)} /><span className="font-label-md text-label-md text-on-surface">{item.name}{item.chunks === 0 && <span className="block text-sm text-text-muted">No indexed material</span>}</span></label>;
                })}</div>
              </fieldset>
              {selectedCourse?.rag_indexed_at && <div className="mt-3"><button type="button" onClick={() => void refreshModules()} disabled={refreshingModules || modulesLoading} className="font-label-md text-label-md text-accent-text underline underline-offset-4 disabled:opacity-50">{refreshingModules ? "Refreshing modules…" : "Refresh module names from Canvas"}</button>{moduleRefreshStatus && <p role="status" className="mt-2 font-body-sm text-body-sm text-text-muted">{moduleRefreshStatus}</p>}</div>}
              <label className="mt-space-lg block"><span className={labelClass}>Study focus · optional</span><textarea className={`${fieldClass} min-h-20 resize-y`} value={topic} maxLength={300} onChange={(event) => setTopic(event.target.value)} placeholder="For example: focus on key terms or explain photosynthesis" /><span className="block text-right text-xs text-text-muted">{topic.length}/300</span></label>

              <div className="mt-space-lg grid gap-x-space-lg gap-y-space-md border-t border-primary-container/25 pt-space-md sm:grid-cols-3"><label className={labelClass}>Study format<select className={fieldClass} value={mode} onChange={(e) => setMode(e.target.value)}><option value="flashcards">Flashcards</option><option value="quiz">Practice quiz</option><option value="mixed">Mixed pack</option></select></label><label className={labelClass}>Number of items<input aria-label="Question count" type="number" min={1} max={15} className={fieldClass} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label><label className={labelClass}>Difficulty<select className={fieldClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
              {error && <p role="alert" className="mt-space-md border-l-2 border-error px-3 py-2 font-body-sm text-body-sm text-error">{error}</p>}
              <div className="mt-space-lg flex flex-wrap items-center gap-space-md"><button type="button" onClick={generate} disabled={loading || !canGenerate || !Number.isInteger(count) || count < 1 || count > 15} className="inline-flex min-h-11 items-center gap-2 bg-primary-container px-5 py-3 font-label-md text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Preparing your pack…</> : <>Generate study pack <span aria-hidden="true">→</span></>}</button><span className="font-body-sm text-body-sm text-text-muted">Based on your selected Canvas modules</span></div>
            </div>}
          </section>}

          <aside className={archive ? "lg:col-span-12" : "border-t border-primary-container/25 pt-space-md lg:col-span-5 lg:mt-0 lg:border-l lg:border-t-0 lg:border-border lg:pl-space-xl lg:pt-0 xl:col-span-4"} aria-labelledby="history-heading">
            {historyLoading ? <p role="status">Loading study archive…</p> : historyError ? <p role="alert">Could not load study history. Please refresh and try again.</p> : <ArchiveList history={history} preview={!archive} onDelete={(target) => { setDeleteTarget(target); setDeleteError(""); }} />}
          </aside>
        </div></PaperReveal>
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-container/35 p-4 backdrop-blur-sm" role="presentation" onClick={() => { if (!deleting) setDeleteTarget(null); }}><section className="paper-texture w-full max-w-md border border-primary-container/25 bg-surface p-space-lg shadow-[0_18px_60px_var(--shadow-color)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-study-heading" aria-describedby="delete-study-description" onClick={(event) => event.stopPropagation()}><p className="paper-kicker text-error">Confirm deletion</p><h2 id="delete-study-heading" className="mt-2 font-display text-3xl text-primary-container">Delete study pack?</h2><p id="delete-study-description" className="mt-space-sm font-body-md text-body-md text-text-muted">“{deleteTarget.title}” and all its sessions will be permanently deleted. This cannot be undone.</p>{deleteError && <p role="alert" className="mt-space-sm font-body-sm text-body-sm text-error">{deleteError}</p>}<div className="mt-space-lg flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="min-h-10 border border-border px-4 font-label-md text-label-md text-on-surface hover:bg-surface-container disabled:opacity-50">Cancel</button><button type="button" disabled={deleting} onClick={() => void deleteEntry()} className="min-h-10 bg-error px-4 font-label-md text-label-md text-on-error hover:opacity-90 disabled:opacity-50">{deleting ? "Deleting…" : "Delete permanently"}</button></div></section></div>}
      </div>
    </main>
  );
}
