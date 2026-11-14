"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudyPackPage() {
  const { packId } = useParams<{ packId: string }>(); const router = useRouter();
  const [pack, setPack] = useState<any>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/study-packs/${packId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setPack(d); }).catch(e => setError(e.message)); }, [packId]);
  async function start() { setBusy(true); const r = await fetch(`/api/study-packs/${packId}/sessions`, { method: "POST" }); const d = await r.json(); setBusy(false); if (r.ok) router.push(`/dashboard/study-prep/${packId}/session/${d.id}`); else setError(d.error); }
  if (error) return <main className="p-8" role="alert">{error}</main>; if (!pack) return <main className="p-8" role="status">Loading study pack…</main>;
  return <main className="mx-auto max-w-4xl p-6 sm:p-10"><Link className="underline" href="/dashboard/study-prep">← Study Prep</Link><h1 className="mt-6 text-3xl font-semibold">{pack.title}</h1><p className="mt-2 text-text-muted">{pack.course?.course_name} · {pack.item_count} items</p><button onClick={start} disabled={busy} className="mt-6 rounded-lg bg-primary px-5 py-3 text-white disabled:opacity-50">{busy ? "Starting…" : "Start study session"}</button><h2 className="mt-10 text-xl font-semibold">Pack preview</h2><ol className="mt-4 space-y-4">{pack.study_pack_items?.map((item: any, i: number) => <li key={item.id} className="rounded-xl border p-4"><p className="text-sm text-text-muted">{i + 1} · {item.difficulty}</p><p className="mt-2 font-medium">{item.question}</p><p className="mt-2">{item.answer}</p><p className="mt-2 text-sm text-text-muted">{item.explanation}</p><p className="mt-2 text-xs">Sources: {item.citations?.map((c: any) => c.label ?? c.title).join(", ")}</p></li>)}</ol></main>;
}
