"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { animate, createScope } from "animejs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { hasUnsafeStudyCharacters } from "@/lib/study-focus";

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
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const retryAction = useRef<(() => Promise<void>) | null>(null);
  const motionRoot = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    setPack(null);
    setSession(null);
    setError("");
    Promise.all([
      fetch(`/api/study-packs/${packId}`).then(async (response) => {
        if (!response.ok) throw new Error("pack");
        return response.json();
      }),
      fetch(`/api/study-sessions/${sessionId}`, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("sessions");
        return response.json();
      }),
    ])
      .then(([loadedPack, loadedSession]) => {
        if (cancelled) return;
        if (loadedSession.pack_id !== packId || !loadedPack.study_pack_items?.length) throw new Error("missing");
        const savedAttempts = Object.fromEntries((loadedSession.study_attempts ?? []).map((attempt: any) => [attempt.item_id, { ...attempt, isCorrect: attempt.is_correct }]));
        const savedPosition = Math.max(0, Math.min(loadedSession.current_item, loadedPack.study_pack_items.length - 1));
        // Older clients allowed Next after merely revealing an answer. Resume at
        // the first skipped question rather than trapping those sessions behind
        // the new server-side completion invariant.
        const firstUnanswered = loadedPack.study_pack_items.findIndex((candidate: any) => !savedAttempts[candidate.id]);
        const position = loadedSession.status !== "completed" && firstUnanswered >= 0
          ? Math.min(savedPosition, firstUnanswered) : savedPosition;
        const currentAttempt = savedAttempts[loadedPack.study_pack_items[position].id];
        setPack(loadedPack);
        setSession(loadedSession);
        setIndex(position);
        setAttempts(savedAttempts);
        setRevealed(Boolean(currentAttempt));
        const currentItem = loadedPack.study_pack_items[position];
        setAnswer(currentAttempt ? currentItem.item_type === "multiple_choice" ? String(currentItem.options.indexOf(currentAttempt.answer)) : currentAttempt.answer : "");
      })
      .catch(() => { if (!cancelled) setLoadError("Could not load this study session. Your saved progress is preserved."); });
    return () => { cancelled = true; };
  }, [packId, sessionId, reload]);

  const items = pack?.study_pack_items ?? [];
  const item = items[index];

  useEffect(() => {
    if (!motionRoot.current || !questionRef.current || !progressRef.current || items.length === 0) return;
    const scope = createScope({
      root: motionRoot,
      mediaQueries: { reduceMotion: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      if (self?.matches.reduceMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      animate(questionRef.current!, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 360,
        ease: "out(3)",
      });
      animate(progressRef.current!, {
        width: [`${(index / items.length) * 100}%`, `${((index + 1) / items.length) * 100}%`],
        duration: 500,
        ease: "out(3)",
      });
    });
    return () => scope.revert();
  }, [index, items.length]);

  function changeAnswer(value: string) {
    setAnswer(value);
    setError("");
    retryAction.current = null;
  }

  async function saveAttempt(isCorrect: boolean) {
    if (!item || saving.current || (item.item_type === "multiple_choice" && !answer)) return;
    const submittedAnswer = item.item_type === "multiple_choice" ? item.options[Number(answer)]
      : item.item_type === "flashcard" ? answer || (isCorrect ? item.answer : "Self-marked incorrect") : answer;
    if (typeof submittedAnswer !== "string" || submittedAnswer.length > 4000 || hasUnsafeStudyCharacters(submittedAnswer) || (item.item_type === "short_answer" && !submittedAnswer.trim())) {
      retryAction.current = null;
      setRevealed(false);
      setError("Enter a nonblank answer without hidden control characters, or choose a listed option.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    retryAction.current = () => saveAttempt(isCorrect);
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, answer: submittedAnswer, isCorrect }) });
      if (response.status === 400) {
        const data = await response.json().catch(() => ({}));
        retryAction.current = null;
        setRevealed(false);
        setError(typeof data.error === "string" ? data.error : "Check your answer and try again.");
        return;
      }
      if (!response.ok) throw new Error("save");
      const persisted = await response.json();
      setAttempts((current) => ({ ...current, [item.id]: { ...persisted, isCorrect: persisted.is_correct } }));
      setRevealed(true);
      retryAction.current = null;
    } catch {
      setError("Could not save your answer. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function advance() {
    if (saving.current || !attempts[item?.id]) return;
    saving.current = true;
    setBusy(true);
    setError("");
    retryAction.current = advance;
    const next = index + 1;
    const status = next >= items.length ? "completed" : "in_progress";
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_item: next, status }) });
      if (!response.ok) throw new Error("save");
      const updated = await response.json();
      setSession(updated);
      retryAction.current = null;
      if (status === "completed") return;
      setIndex(next);
      const nextItem = items[next];
      const savedAttempt = attempts[nextItem.id];
      setAnswer(savedAttempt ? nextItem.item_type === "multiple_choice" ? String(nextItem.options.indexOf(savedAttempt.answer)) : savedAttempt.answer ?? "" : "");
      setRevealed(Boolean(savedAttempt));
    } catch {
      setError("Could not save your progress. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function pause() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    retryAction.current = pause;
    try {
      const response = await fetch(`/api/study-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paused", current_item: index }) });
      if (!response.ok) throw new Error("pause");
      router.push(`/dashboard/study-prep/${packId}`);
    } catch {
      setError("Could not pause this session. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (loadError) return <main className="paper-texture min-h-full p-gutter-mobile md:p-gutter"><p role="alert">{loadError}</p><button type="button" onClick={() => setReload((v) => v + 1)} className="mt-3 underline">Retry loading session</button><Link href={`/dashboard/study-prep/${packId}`} className="ml-4 underline">Back to pack</Link></main>;
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
      <div ref={motionRoot} className="mx-auto w-full max-w-[1100px] px-gutter-mobile py-space-lg md:px-gutter lg:py-space-xl">
        <header className="border-b-[3px] border-double border-primary-container pb-space-md">
          <div className="flex items-center justify-between gap-4 border-b border-primary-container/25 pb-space-sm">
            <Link href={`/dashboard/study-prep/${packId}`} className="paper-kicker text-accent-text hover:underline">← {pack.title}</Link>
            <button type="button" onClick={pause} disabled={busy} className="paper-kicker text-text-muted underline underline-offset-4 hover:text-primary-container disabled:opacity-50">Pause and return</button>
          </div>
          <div className="mt-space-md flex flex-wrap items-end justify-between gap-space-md">
            <div><p className="paper-kicker text-text-muted">{pack.course?.course_name ?? "Study session"}</p><h1 className="mt-1 font-display text-3xl text-primary-container sm:text-4xl">A question at a time</h1></div>
            <p className="font-code-tag text-[11px] uppercase tracking-[0.14em] text-text-muted">Question {index + 1} <span className="text-primary-container/40">/</span> {items.length}</p>
          </div>
          <div className="mt-space-md h-[3px] w-full bg-primary-container/10" role="progressbar" aria-label="Session progress" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={items.length}><div ref={progressRef} className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
        </header>
        {error && <div role="alert" className="mt-4 border-l-2 border-error px-3 py-2 text-sm text-error"><p>{error}</p>{retryAction.current && <button type="button" disabled={busy} onClick={() => void retryAction.current?.()} className="mt-2 underline disabled:opacity-50">Retry saving</button>}</div>}
        {busy && <p role="status" className="mt-3 text-sm text-text-muted">Saving progress…</p>}

        <article key={index} className="paper-reveal mx-auto mt-space-xl max-w-3xl">
          <div ref={questionRef}>
          <div className="border-b border-primary-container/25 pb-space-md">
            <div className="flex flex-wrap items-center gap-3"><span className="paper-kicker text-accent-text">{item.item_type?.replace("_", " ") ?? "Study prompt"}</span><span className="paper-kicker text-text-muted">{item.difficulty}</span></div>
            <h2 className="mt-space-md font-display text-3xl leading-snug text-primary-container sm:text-4xl">{item.question}</h2>
          </div>

          {item.item_type === "multiple_choice" ? (
            <fieldset className="mt-space-lg divide-y divide-primary-container/15">
              <legend className="paper-kicker text-text-muted">Choose your answer</legend>
              {item.options.map((option: string, i: number) => <label key={i} className={`flex cursor-pointer items-start gap-3 py-space-md font-body-md text-body-md transition-colors ${answer === String(i) ? "text-primary-container" : "text-on-surface"}`}><input className="mt-1 accent-primary-container" type="radio" name="answer" value={i} checked={answer === String(i)} onChange={() => changeAnswer(String(i))} disabled={revealed || busy} /><span className="font-code-tag text-[11px] text-text-muted">{String.fromCharCode(65 + i)}.</span><span>{option}</span></label>)}
            </fieldset>
          ) : item.item_type === "flashcard" ? (
            !revealed && <button type="button" onClick={() => setRevealed(true)} className="mt-space-lg border border-primary-container px-4 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-primary-container hover:bg-surface-container">Reveal answer</button>
          ) : (
            <label className="mt-space-lg block paper-kicker text-text-muted">Your answer<textarea maxLength={4000} className="mt-2 min-h-32 w-full border-0 border-b border-primary-container/40 bg-transparent px-0 py-3 font-body-md text-body-md text-on-surface outline-none focus:border-primary-container" value={answer} onChange={(e) => changeAnswer(e.target.value)} disabled={revealed || busy} /></label>
          )}
          </div>

          {!revealed ? (item.item_type === "flashcard" ? null : <button type="button" onClick={() => item.item_type === "short_answer" ? setRevealed(true) : saveAttempt(Number(answer) === item.correct_option)} disabled={!answer.trim() || busy} className="mt-space-lg min-h-11 bg-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-50">Check answer <span aria-hidden="true">→</span></button>) : (
            <section className="mt-space-lg border-l-[3px] border-accent bg-surface/50 py-space-md pl-space-md pr-space-sm" role="status">
              <p className="paper-kicker text-accent-text">Answer and notes</p><p className="mt-2 font-headline-sm text-headline-sm text-primary-container">{item.answer}</p>
              {item.explanation && <p className="mt-2 font-body-md text-body-md text-text-muted">{item.explanation}</p>}
              {item.citations?.length > 0 && <p className="mt-3 border-t border-primary-container/15 pt-2 font-code-tag text-[10px] text-text-muted">Sources: {item.citations.map((c: any) => c.label ?? c.title).join(", ")}</p>}
              {!attempts[item.id] && <div className="mt-space-md flex flex-wrap items-center gap-3"><span className="paper-kicker text-text-muted">How did you do?</span><button type="button" disabled={busy} onClick={() => saveAttempt(true)} className="border border-primary-container/40 px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.1em] text-primary-container hover:bg-surface-container disabled:opacity-50">I got it</button><button type="button" disabled={busy} onClick={() => saveAttempt(false)} className="border border-primary-container/40 px-3 py-2 font-code-tag text-[10px] uppercase tracking-[0.1em] text-primary-container hover:bg-surface-container disabled:opacity-50">Review again</button></div>}
              {attempts[item.id] && <p className="mt-space-sm font-code-tag text-[10px] uppercase tracking-[0.12em] text-accent-text">{attempts[item.id].isCorrect ? "Marked correct" : "Marked to review"}</p>}
              <button type="button" onClick={advance} disabled={busy || !attempts[item.id]} className="mt-space-md flex min-h-11 items-center gap-2 bg-primary-container px-5 py-3 font-code-tag text-[10px] uppercase tracking-[0.14em] text-on-primary-container hover:bg-primary-container/90 disabled:opacity-50">{index + 1 === items.length ? "Finish session" : "Next question"}<span aria-hidden="true">→</span></button>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
