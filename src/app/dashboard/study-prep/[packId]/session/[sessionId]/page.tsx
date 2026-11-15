"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function StudySessionPage() {
  const { packId, sessionId } = useParams<{ packId: string; sessionId: string }>();
  const [pack, setPack] = useState<any>(null); const [session, setSession] = useState<any>(null); const [attempts, setAttempts] = useState<Record<string, any>>({}); const [index, setIndex] = useState(0); const [answer, setAnswer] = useState(""); const [revealed, setRevealed] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch(`/api/study-packs/${packId}`).then(async (response) => {
        if (!response.ok) throw new Error("pack");
        return response.json();
      }),
      fetch(`/api/study-packs/${packId}/sessions`).then(async (response) => {
        if (!response.ok) throw new Error("sessions");
        return response.json();
      }),
    ])
      .then(([loadedPack, sessions]) => {
        setPack(loadedPack);
        const loadedSession = sessions.find((candidate: any) => candidate.id === sessionId);
        if (!loadedSession) throw new Error("missing");
        setSession(loadedSession);
        setIndex(loadedSession.current_item);
      })
      .catch(() => setError("Could not load this study session. Please try again."));
  }, [packId, sessionId]);
  const items = pack?.study_pack_items ?? []; const item = items[index];
  async function saveAttempt(isCorrect: boolean) {
    if (!item) return;
    try {
      const submittedAnswer = item.item_type === "multiple_choice" ? item.options[Number(answer)] : answer || (isCorrect ? item.answer : "Self-marked incorrect");
      const response = await fetch(`/api/study-sessions/${sessionId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, answer: submittedAnswer, isCorrect }) });
      if (!response.ok) throw new Error("save");
      setAttempts({ ...attempts, [item.id]: { isCorrect } });
      setRevealed(true);
    } catch {
      setError("Could not save your answer. Please try again.");
    }
  }
  async function advance() {
    const next = index + 1;
    const status = next >= items.length ? "completed" : "in_progress";
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_item: next, status }) });
      if (!response.ok) throw new Error("save");
      const updated = await response.json();
      setSession(updated);
      if (status === "completed") return;
      setIndex(next);
      setAnswer("");
      setRevealed(false);
    } catch {
      setError("Could not save your progress. Please try again.");
    }
  }
  if (error) return <main className="p-8" role="alert">{error}</main>; if (!pack || !session) return <main className="p-8" role="status">Loading session…</main>;
  if (session.status === "completed" || !item) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl font-semibold">Session complete</h1><p className="mt-3">Score: {session.score}/{items.length}</p><Link href="/dashboard/study-prep" className="mt-5 inline-block underline">Back to Study Prep</Link></main>;
  return <main className="mx-auto max-w-3xl p-5 sm:p-10"><Link className="underline" href="/dashboard/study-prep">Study Prep</Link><p className="mt-6 text-text-muted">{pack.course?.course_name} · Question {index + 1} of {items.length}</p><progress aria-label="Session progress" className="mt-3 w-full" value={index + 1} max={items.length} /><article className="mt-6 rounded-xl border p-5 sm:p-8"><h1 className="text-xl font-semibold">{item.question}</h1>{item.item_type === "multiple_choice" ? <fieldset className="mt-5 space-y-3"><legend className="sr-only">Choose answer</legend>{item.options.map((option: string, i: number) => <label key={option} className="flex items-center gap-3"><input type="radio" name="answer" value={i} checked={answer === String(i)} onChange={() => setAnswer(String(i))} disabled={revealed} />{option}</label>)}</fieldset> : item.item_type === "flashcard" ? <button className="mt-5 underline" onClick={() => setRevealed(true)}>Reveal answer</button> : <label className="mt-5 block">Your answer<textarea className="mt-2 w-full rounded-lg border bg-background p-3" value={answer} onChange={e => setAnswer(e.target.value)} disabled={revealed} /></label>}
  {!revealed ? (item.item_type === "flashcard" ? null : <button onClick={() => item.item_type === "short_answer" ? setRevealed(true) : saveAttempt(Number(answer) === item.correct_option)} disabled={!answer} className="mt-6 rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">Check answer</button>) : <div className="mt-5" role="status"><p className="font-semibold">Answer: {item.answer}</p><p className="mt-2">{item.explanation}</p><p className="mt-2 text-sm">Sources: {item.citations?.map((c: any) => c.label ?? c.title).join(", ")}</p>{!attempts[item.id] && <div className="mt-4 flex gap-3"><button onClick={() => saveAttempt(true)} className="rounded-lg border px-4 py-2">I got it</button><button onClick={() => saveAttempt(false)} className="rounded-lg border px-4 py-2">I missed it</button></div>}{attempts[item.id] && <p className="mt-2">{attempts[item.id].isCorrect ? "Marked correct" : "Marked to review"}</p>}<button onClick={advance} className="mt-5 rounded-lg bg-primary px-4 py-2 text-white">{index + 1 === items.length ? "Finish session" : "Next item"}</button></div>}</article><button className="mt-5 underline" onClick={() => fetch(`/api/study-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paused", current_item: index }) })}>Pause session</button></main>;
}
