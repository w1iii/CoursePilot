"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudySessionPage() {
  const { packId, sessionId } = useParams<{ packId: string; sessionId: string }>();
  const router = useRouter();
  const [pack, setPack] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");

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

  const items = pack?.study_pack_items ?? [];
  const item = items[index];

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

  async function pause() {
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paused", current_item: index }) });
      if (!response.ok) throw new Error("pause");
      router.push(`/dashboard/study-prep/${packId}`);
    } catch {
      setError("Could not pause this session. Please try again.");
    }
  }

  if (error) return <main className="paper-texture min-h-full p-gutter-mobile md:p-gutter" role="alert"><p className="mx-auto max-w-4xl border-l-2 border-error px-4 py-3 font-body-sm text-body-sm text-error">{error}</p></main>;
  if (!pack || !session) return <main className="paper-texture min-h-full p-gutter-mobile md:p-gutter" role="status"><p className="mx-auto max-w-4xl font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">Setting the study desk…</p></main>;

  if (session.status === "completed" || !item) {
    return (
      <main className="paper-texture min-h-full w-full">
        <div className="mx-auto max-w-4xl px-gutter-mobile py-space-xl md:px-gutter lg:py-16">
          <div className="border-b-[3px] border-double border-primary-container pb-space-lg text-center">
            <p className="paper-kicker text-accent-text">Session filed</p>
            <h1 className="mt-space-sm font-display text-5xl text-primary-container">Study complete</h1>
            <p className="mt-space-md font-body-lg text-body-lg text-text-muted">You scored <strong className="text-primary-container">{session.score}/{items.length}</strong></p>
          </div>
          <div className="mt-space-lg flex flex-wrap justify-center gap-4">
            <Link href={`/dashboard/study-prep/${packId}`} className="border border-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-primary-container hover:bg-surface-container">Review pack</Link>
            <Link href="/dashboard/study-prep" className="bg-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-on-primary-container hover:bg-primary-container/90">Back to study desk</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="paper-texture min-h-full w-full">
      <div className="mx-auto w-full max-w-[1100px] px-gutter-mobile py-space-lg md:px-gutter lg:py-space-xl">
        <header className="border-b-[3px] border-double border-primary-container pb-space-md">
          <div className="flex items-center justify-between gap-4 border-b border-primary-container/25 pb-space-sm">
            <Link href={`/dashboard/study-prep/${packId}`} className="paper-kicker text-accent-text hover:underline">← {pack.title}</Link>
            <button type="button" onClick={pause} className="paper-kicker text-text-muted underline underline-offset-4 hover:text-primary-container">Pause and return</button>
          </div>
          <div className="mt-space-md flex flex-wrap items-end justify-between gap-space-md">
            <div><p className="paper-kicker text-text-muted">{pack.course?.course_name ?? "Study session"}</p><h1 className="mt-1 font-display text-3xl text-primary-container sm:text-4xl">A question at a time</h1></div>
            <p className="font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">Question {index + 1} <span className="text-primary-container/40">/</span> {items.length}</p>
          </div>
          <div className="mt-space-md h-[3px] w-full bg-primary-container/10" role="progressbar" aria-label="Session progress" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={items.length}><div className="h-full bg-accent transition-[width]" style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
        </header>

        <article className="mx-auto mt-space-xl max-w-3xl">
          <div className="border-b border-primary-container/25 pb-space-md">
            <div className="flex flex-wrap items-center gap-3"><span className="paper-kicker text-accent-text">{item.item_type?.replace("_", " ") ?? "Study prompt"}</span><span className="paper-kicker text-text-muted">{item.difficulty}</span></div>
            <h2 className="mt-space-md font-display text-3xl leading-snug text-primary-container sm:text-4xl">{item.question}</h2>
          </div>

          {item.item_type === "multiple_choice" ? (
            <fieldset className="mt-space-lg divide-y divide-primary-container/15">
              <legend className="paper-kicker text-text-muted">Choose your answer</legend>
              {item.options.map((option: string, i: number) => <label key={option} className={`flex cursor-pointer items-start gap-3 py-space-md font-body-md text-body-md transition-colors ${answer === String(i) ? "text-primary-container" : "text-on-surface"}`}><input className="mt-1 accent-primary-container" type="radio" name="answer" value={i} checked={answer === String(i)} onChange={() => setAnswer(String(i))} disabled={revealed} /><span className="font-code-tag text-[11px] text-text-muted">{String.fromCharCode(65 + i)}.</span><span>{option}</span></label>)}
            </fieldset>
          ) : item.item_type === "flashcard" ? (
            !revealed && <button type="button" onClick={() => setRevealed(true)} className="mt-space-lg border border-primary-container px-4 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-primary-container hover:bg-surface-container">Reveal answer</button>
          ) : (
            <label className="mt-space-lg block paper-kicker text-text-muted">Your answer<textarea className="mt-2 min-h-32 w-full border-0 border-b border-primary-container/40 bg-transparent px-0 py-3 font-body-md text-body-md text-on-surface outline-none focus:border-primary-container" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={revealed} /></label>
          )}

          {!revealed ? (item.item_type === "flashcard" ? null : <button type="button" onClick={() => item.item_type === "short_answer" ? setRevealed(true) : saveAttempt(Number(answer) === item.correct_option)} disabled={!answer} className="mt-space-lg min-h-11 bg-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-50">Check answer <span aria-hidden="true">→</span></button>) : (
            <section className="mt-space-lg border-l-[3px] border-accent bg-surface/50 py-space-md pl-space-md pr-space-sm" role="status">
              <p className="paper-kicker text-accent-text">Answer and notes</p><p className="mt-2 font-headline-sm text-headline-sm text-primary-container">{item.answer}</p>
              {item.explanation && <p className="mt-2 font-body-md text-body-md text-text-muted">{item.explanation}</p>}
              {item.citations?.length > 0 && <p className="mt-3 border-t border-primary-container/15 pt-2 font-code-tag text-[10px] text-text-muted">Sources: {item.citations.map((c: any) => c.label ?? c.title).join(", ")}</p>}
              {!attempts[item.id] && <div className="mt-space-md flex flex-wrap items-center gap-3"><span className="paper-kicker text-text-muted">How did you do?</span><button type="button" onClick={() => saveAttempt(true)} className="border border-primary-container/40 px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.1em] text-primary-container hover:bg-surface-container">I got it</button><button type="button" onClick={() => saveAttempt(false)} className="border border-primary-container/40 px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.1em] text-primary-container hover:bg-surface-container">Review again</button></div>}
              {attempts[item.id] && <p className="mt-space-sm font-code-tag text-[10px] uppercase tracking-[0.12em] text-accent-text">{attempts[item.id].isCorrect ? "Marked correct" : "Marked to review"}</p>}
              <button type="button" onClick={advance} className="mt-space-md flex min-h-11 items-center gap-2 bg-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-on-primary-container hover:bg-primary-container/90">{index + 1 === items.length ? "Finish session" : "Next question"}<span aria-hidden="true">→</span></button>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
