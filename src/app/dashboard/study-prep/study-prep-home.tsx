"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PaperReveal from "@/components/PaperReveal";
import SyncLoadingOverlay from "@/components/SyncLoadingOverlay";

type Course = { id: string; course_name: string; course_code: string | null; rag_indexed_at: string | null };
type History = { id: string; title: string; mode: string; module: string | null; topic: string | null; course: { course_name: string; course_code: string | null } | null; study_sessions: Array<{ id: string; status: string; score: number; last_active_at: string }> };
type DeleteTarget = { kind: "pack"; id: string; title: string } | { kind: "session"; id: string; packId: string; title: string };
const fieldClass = "mt-1.5 w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary-container";
const labelClass = "paper-kicker text-text-muted";

export default function StudyPrepHome() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [courseId, setCourseId] = useState("");
  const [scope, setScope] = useState("course");
  const [modules, setModules] = useState<Array<{ id: number; name: string; chunks: number }>>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [module, setModule] = useState("");
  const [mode, setMode] = useState("flashcards");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/study-prep/courses").then((r) => r.ok ? r.json() : []), fetch("/api/study-packs").then((r) => r.ok ? r.json() : [])]).then(([c, h]) => { setCourses(c); setHistory(h); if (c.length === 1) setCourseId(c[0].id); });
  }, []);
  useEffect(() => {
    let cancelled = false;
    setModules([]);
    setModule("");
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
  }, [courseId]);

  useEffect(() => {
    if (!modulesLoading && modules.length === 0 && scope === "module") setScope("course");
  }, [modules.length, modulesLoading, scope]);

  async function generate() {
    setError(""); setLoading(true);
    try {
      const selectedModule = modules.find((item) => String(item.id) === module);
      const response = await fetch("/api/study-packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, module: scope === "module" ? selectedModule?.name : null, moduleId: scope === "module" ? selectedModule?.id : null, topic: null, mode, count, difficulty }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create study materials. Please try again.");
      router.push(`/dashboard/study-prep/${data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create study materials. Please try again."); }
    finally { setLoading(false); }
  }

  async function deleteEntry() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const url = deleteTarget.kind === "pack"
      ? `/api/study-packs/${encodeURIComponent(deleteTarget.id)}`
      : `/api/study-packs/${encodeURIComponent(deleteTarget.packId)}/sessions/${encodeURIComponent(deleteTarget.id)}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      if (deleteTarget.kind === "pack") {
        setHistory((current) => current.filter((pack) => pack.id !== deleteTarget.id));
      } else {
        setHistory((current) => current.map((pack) => pack.id === deleteTarget.packId
          ? { ...pack, study_sessions: pack.study_sessions.filter((session) => session.id !== deleteTarget.id) }
          : pack));
      }
      setDeleteTarget(null);
    } catch {
      setDeleteError("Could not delete this item. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === courseId);
  const canGenerate = Boolean(courseId && selectedCourse?.rag_indexed_at && !(scope === "module" && !module));

  return (
    <main className="paper-texture min-h-full w-full">
      <div className="mx-auto w-full max-w-[1440px] px-gutter-mobile py-space-lg md:px-gutter lg:px-margin-desktop lg:py-space-xl">
        <PaperReveal><header className="border-b-[3px] border-double border-primary-container pb-space-md">
          <div className="flex flex-wrap items-end justify-between gap-space-sm border-b border-primary-container/25 pb-space-sm">
            <div><p className="paper-kicker text-accent-text">Study desk</p><h1 className="mt-2 font-display text-4xl leading-tight text-primary-container sm:text-5xl">Quiz &amp; Exam Prep</h1></div>
          </div>
          <p className="mt-space-sm max-w-2xl font-body-lg text-body-lg text-text-muted">Turn indexed course material into grounded flashcards and practice quizzes. Pick your coverage; we&apos;ll build the study set.</p>
        </header></PaperReveal>

        <PaperReveal delay={120} className="mt-space-lg"><div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12 lg:gap-0">
          <section className="relative lg:col-span-7 lg:pr-space-xl xl:col-span-8" aria-labelledby="builder-heading" aria-busy={loading}>
            {loading && <SyncLoadingOverlay label="Preparing your study pack" />}
            {courses.length === 0 ? <div className="mt-space-md border border-dashed border-primary-container/25 px-space-md py-space-xl" role="status"><p className="paper-kicker text-accent-text">First, choose your sources</p><h3 className="mt-2 font-headline-sm text-headline-sm text-primary-container">No selected courses</h3><p className="mt-2 font-body-md text-body-md text-text-muted">Select courses for AI study in Settings, then sync Canvas content to make materials available.</p><Link className="mt-space-md inline-flex items-center gap-2 font-label-md text-label-md text-accent-text underline underline-offset-4" href="/dashboard/settings">Open course settings <span aria-hidden="true">→</span></Link></div> : <div className="mt-space-md">
              <label className={labelClass} htmlFor="study-course">Course source</label>
              <select id="study-course" className={fieldClass} value={courseId} onChange={(e) => { setCourseId(e.target.value); setModule(""); }}><option value="">Choose a course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.course_code ? `${c.course_code} · ` : ""}{c.course_name}</option>)}</select>
              {selectedCourse && !selectedCourse.rag_indexed_at && <p role="status" className="mt-3 border-l-2 border-secondary px-3 py-2 font-body-sm text-body-sm text-text-muted">This course isn&apos;t indexed yet. Sync Canvas content before generating a pack.</p>}

              <fieldset className="mt-space-lg"><legend className={labelClass}>Coverage</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[["course", "Entire course", "All indexed material"], ["module", "One module", modulesLoading ? "Loading indexed modules…" : modules.length ? "Focus on a single unit" : "No indexed modules available"]].map(([value, title, detail]) => {
                  const unavailable = value === "module" && (modulesLoading || modules.length === 0);
                  return <label key={value} className={`border px-3 py-3 transition-colors ${unavailable ? "cursor-not-allowed border-border/60 opacity-60" : "cursor-pointer"} ${scope === value ? "border-primary-container bg-surface-container-low" : !unavailable ? "border-border hover:border-primary-container/50" : ""}`}><span className="flex items-start gap-2"><input className="mt-0.5 accent-primary-container" type="radio" name="scope" value={value} checked={scope === value} disabled={unavailable} onChange={() => setScope(value)} /><span><span className="block font-label-md text-label-md text-on-surface">{title}</span><span className="mt-1 block font-body-sm text-body-sm text-text-muted">{detail}</span></span></span></label>;
                })}
              </div></fieldset>
              {scope === "module" && modules.length > 0 && <div className="mt-space-md"><label className={labelClass} htmlFor="study-module">Indexed module</label><select id="study-module" className={fieldClass} value={module} onChange={(e) => setModule(e.target.value)}><option value="">Choose a module</option>{modules.map((m) => <option key={m.id} value={m.id} disabled={m.chunks === 0}>{m.name}{m.chunks === 0 ? " (no indexed material)" : ""}</option>)}</select></div>}

              <div className="mt-space-lg grid gap-x-space-lg gap-y-space-md border-t border-primary-container/25 pt-space-md sm:grid-cols-3"><label className={labelClass}>Study format<select className={fieldClass} value={mode} onChange={(e) => setMode(e.target.value)}><option value="flashcards">Flashcards</option><option value="quiz">Practice quiz</option><option value="mixed">Mixed pack</option></select></label><label className={labelClass}>Number of items<input aria-label="Question count" type="number" min={1} max={30} className={fieldClass} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label><label className={labelClass}>Difficulty<select className={fieldClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
              {error && <p role="alert" className="mt-space-md border-l-2 border-error px-3 py-2 font-body-sm text-body-sm text-error">{error}</p>}
              <div className="mt-space-lg flex flex-wrap items-center gap-space-md"><button type="button" onClick={generate} disabled={loading || !canGenerate || count < 1 || count > 30} className="inline-flex min-h-11 items-center gap-2 bg-primary-container px-5 py-3 font-label-md text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Preparing your pack…</> : <>Generate study pack <span aria-hidden="true">→</span></>}</button><span className="font-body-sm text-body-sm text-text-muted">Based on your selected Canvas course material</span></div>
            </div>}
          </section>

          <aside className="border-t border-primary-container/25 pt-space-md lg:col-span-5 lg:mt-0 lg:border-l lg:border-t-0 lg:border-border lg:pl-space-xl lg:pt-0 xl:col-span-4" aria-labelledby="history-heading">
            <div className="flex items-baseline justify-between gap-2 border-b border-primary-container/25 pb-1"><h2 id="history-heading" className="paper-kicker text-accent-text">From the archive</h2><span className="paper-kicker text-text-muted">{history.length} {history.length === 1 ? "pack" : "packs"}</span></div>
            {history.length === 0 ? <div className="mt-space-md border border-dashed border-primary-container/25 px-4 py-8"><p className="font-display text-2xl text-primary-container">Your first edition awaits.</p><p className="mt-2 font-body-sm text-body-sm text-text-muted">Generated study packs and saved sessions will appear here.</p></div> : <ol className="mt-2 divide-y divide-primary-container/20">{history.map((pack, index) => <li key={pack.id} className="py-space-md"><div className="flex items-start gap-3"><span className="pt-0.5 font-code-tag text-code-tag text-text-muted">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Link className="font-headline-sm text-headline-sm text-primary-container underline decoration-primary-container/30 underline-offset-4 hover:decoration-primary-container" href={`/dashboard/study-prep/${pack.id}`}>{pack.title}</Link><button type="button" onClick={() => { setDeleteTarget({ kind: "pack", id: pack.id, title: pack.title }); setDeleteError(""); }} aria-label={`Delete study pack ${pack.title}`} className="shrink-0 px-1 font-label-sm text-label-sm text-text-muted underline underline-offset-4 hover:text-error">Delete</button></div><p className="mt-1 font-body-sm text-body-sm text-text-muted">{pack.course?.course_name ?? "Course"}{pack.module ? ` · ${pack.module}` : pack.topic ? ` · ${pack.topic}` : ""}</p><p className="mt-1 paper-kicker text-text-muted">{pack.mode.replace("_", " ")} · {pack.study_sessions?.length ?? 0} sessions</p>{pack.study_sessions?.map((s) => <div key={s.id} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"><Link className="font-label-sm text-label-sm text-accent-text underline underline-offset-4" href={`/dashboard/study-prep/${pack.id}/session/${s.id}`}>{s.status === "completed" ? `Review · Score ${s.score}` : "Resume session"}</Link><button type="button" onClick={() => { setDeleteTarget({ kind: "session", id: s.id, packId: pack.id, title: pack.title }); setDeleteError(""); }} aria-label={`Delete ${s.status === "completed" ? "completed" : "active"} session for ${pack.title}`} className="font-label-sm text-label-sm text-text-muted underline underline-offset-4 hover:text-error">Delete session</button></div>)}</div></div></li>)}</ol>}
          </aside>
        </div></PaperReveal>
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-container/35 p-4 backdrop-blur-sm" role="presentation" onClick={() => { if (!deleting) setDeleteTarget(null); }}><section className="paper-texture w-full max-w-md border border-primary-container/25 bg-surface p-space-lg shadow-[0_18px_60px_var(--shadow-color)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-study-heading" aria-describedby="delete-study-description" onClick={(event) => event.stopPropagation()}><p className="paper-kicker text-error">Confirm deletion</p><h2 id="delete-study-heading" className="mt-2 font-display text-3xl text-primary-container">Delete {deleteTarget.kind === "pack" ? "study pack" : "session"}?</h2><p id="delete-study-description" className="mt-space-sm font-body-md text-body-md text-text-muted">{deleteTarget.kind === "pack" ? <>“{deleteTarget.title}” and all its sessions will be permanently deleted.</> : <>This session for “{deleteTarget.title}” will be permanently deleted.</>} This cannot be undone.</p>{deleteError && <p role="alert" className="mt-space-sm font-body-sm text-body-sm text-error">{deleteError}</p>}<div className="mt-space-lg flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="min-h-10 border border-border px-4 font-label-md text-label-md text-on-surface hover:bg-surface-container disabled:opacity-50">Cancel</button><button type="button" disabled={deleting} onClick={() => void deleteEntry()} className="min-h-10 bg-error px-4 font-label-md text-label-md text-on-error hover:opacity-90 disabled:opacity-50">{deleting ? "Deleting…" : "Delete permanently"}</button></div></section></div>}
      </div>
    </main>
  );
}
