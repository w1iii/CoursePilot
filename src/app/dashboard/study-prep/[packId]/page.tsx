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

  useEffect(() => {
    fetch(`/api/study-packs/${packId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("load");
        setPack(data);
      })
      .catch(() => setError("Could not load this study pack. Please try again."));
  }, [packId]);

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
