"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CanvasCourse = {
  id: string;
  canvas_course_id: number;
  course_code: string | null;
  course_name: string;
  selected_for_rag: boolean;
  rag_indexed_at: string | null;
};

const screenshots = [
  { src: "01-login.png", title: "Sign in to Canvas", detail: "Open your school’s Canvas LMS and sign in." },
  { src: "02-dashboard.png", title: "Open your Canvas dashboard", detail: "Start from your Canvas dashboard." },
  { src: "03-click_account.png", title: "Open your account menu", detail: "Select Account from the Canvas navigation." },
  { src: "04-account_page.png", title: "Go to your account settings", detail: "Open Settings for your Canvas profile." },
  { src: "05-scroll_down.png", title: "Find approved integrations", detail: "Scroll to the Approved Integrations section." },
  { src: "06-click_access_token.png", title: "Open access tokens", detail: "Choose New Access Token to create one." },
  { src: "07-copy_access_token.png", title: "Create and copy your token", detail: "Copy the token once, then paste it into the form." },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("https://canvas.instructure.com");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"connect" | "courses" | "indexing">("connect");
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== "connect") return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % screenshots.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [step]);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/canvas/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_base_url: baseUrl, access_token: token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Canvas connection failed");
      setToken("");
      const courseResponse = await fetch("/api/onboarding/courses", { cache: "no-store" });
      const courseResult = await courseResponse.json();
      if (!courseResponse.ok) throw new Error(courseResult.error ?? "Could not load courses");
      setCourses(courseResult.courses ?? []);
      setSelected((courseResult.courses ?? []).filter((c: CanvasCourse) => c.selected_for_rag).map((c: CanvasCourse) => c.id));
      setStep("courses");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect Canvas");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError("");
    setStep("indexing");
    try {
      const response = await fetch("/api/onboarding/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not index selected courses");
      router.replace("/dashboard/thread");
      router.refresh();
    } catch (cause) {
      setStep("courses");
      setError(cause instanceof Error ? cause.message : "Indexing failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-border bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-accent";
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-surface sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-semibold text-primary-container">Habi</Link>
          <span className="font-code-tag text-xs uppercase tracking-widest text-text-muted">Getting started</span>
        </header>
        <div className="mb-8 flex gap-2" aria-label="Setup progress">
          {["Connect Canvas", "Choose courses", "Index courses"].map((label, index) => {
            const active = index === (step === "connect" ? 0 : step === "courses" ? 1 : 2);
            return <div key={label} className={`h-1.5 flex-1 rounded-full ${active ? "bg-accent" : "bg-border"}`} aria-label={label} />;
          })}
        </div>

        {step === "connect" && <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr]">
          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-9">
            <p className="font-code-tag text-xs uppercase tracking-widest text-accent">Step 1 · Canvas connection</p>
            <h1 className="mt-3 font-display text-4xl leading-tight">Bring your courses together.</h1>
            <p className="mt-3 text-text-muted">Connect Canvas with a personal access token. Habi encrypts and stores it securely to sync your courses.</p>
            <form onSubmit={connect} className="mt-7 space-y-4">
              <label className="block space-y-2"><span className="text-sm font-medium">Canvas URL</span><input className={inputClass} type="url" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://school.instructure.com" /></label>
              <label className="block space-y-2"><span className="text-sm font-medium">Personal access token</span><input className={inputClass} type="password" autoComplete="off" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste your Canvas token" /></label>
              {error && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-on-accent disabled:opacity-60">{busy ? "Checking Canvas…" : "Connect and find courses"}</button>
              <p className="text-xs text-text-muted">Your token is encrypted before storage and never shown again.</p>
            </form>
          </section>
          <section className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex items-center justify-between p-5"><div><p className="font-code-tag text-xs uppercase tracking-widest text-text-muted">Token guide · {slide + 1}/{screenshots.length}</p><h2 className="mt-1 font-semibold">{screenshots[slide].title}</h2><p className="mt-1 text-sm text-text-muted">{screenshots[slide].detail}</p></div><div className="relative z-10 flex gap-2"><button type="button" aria-label="Previous screenshot" onClick={() => setSlide((current) => (current + screenshots.length - 1) % screenshots.length)} className="h-9 w-9 cursor-pointer rounded-full border border-border">←</button><button type="button" aria-label="Next screenshot" onClick={() => setSlide((current) => (current + 1) % screenshots.length)} className="h-9 w-9 cursor-pointer rounded-full border border-border">→</button></div></div>
            <div className="flex aspect-[4/3] items-center justify-center bg-surface-container-low p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- Carousel swaps local screenshots every three seconds. */}
              <img
                key={screenshots[slide].src}
                src={`/onboarding/canvas/${screenshots[slide].src}`}
                alt={screenshots[slide].title}
                width={1200}
                height={900}
                className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
              />
            </div>
            <div className="relative z-10 flex justify-center gap-1.5 p-4">{screenshots.map((image, index) => <button key={image.src} type="button" aria-label={`Show step ${index + 1}`} onClick={() => setSlide(index)} className={`h-2 cursor-pointer rounded-full transition-all ${index === slide ? "w-6 bg-accent" : "w-2 bg-outline"}`} />)}</div>
          </section>
        </div>}

        {step === "courses" && <section className="rounded-3xl border border-border bg-surface p-6 sm:p-9">
          <p className="font-code-tag text-xs uppercase tracking-widest text-accent">Step 2 · Course selection</p>
          <h1 className="mt-3 font-display text-4xl">Choose what Habi should learn.</h1>
          <p className="mt-2 text-text-muted">Only selected courses are sent for RAG indexing and used as study context. Select at least one.</p>
          {courses.length ? <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => {
            const active = selected.includes(course.id);
            return <button key={course.id} type="button" aria-pressed={active} onClick={() => setSelected((current) => active ? current.filter((id) => id !== course.id) : [...current, course.id])} className={`min-h-28 rounded-2xl border p-4 text-left transition-colors ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-surface-container-low hover:border-accent"}`}><span className="flex items-start justify-between gap-3"><span><span className="block text-xs opacity-75">{course.course_code || "Canvas course"}</span><span className="mt-1 block font-semibold">{course.course_name}</span></span><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current">{active ? "✓" : ""}</span></span></button>;
          })}</div> : <p className="mt-7 rounded-xl border border-border p-5 text-text-muted">No active enrolled courses found for this Canvas account.</p>}
          {error && <p role="alert" className="mt-5 rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><button type="button" onClick={() => setStep("connect")} className="rounded-xl border border-border px-5 py-3">Back</button><button type="button" disabled={busy || selected.length === 0} onClick={() => void finish()} className="rounded-xl bg-accent px-5 py-3 font-semibold text-on-accent disabled:opacity-50">Index {selected.length} {selected.length === 1 ? "course" : "courses"}</button></div>
        </section>}

        {step === "indexing" && <section className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-10 text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" /><p className="mt-6 font-code-tag text-xs uppercase tracking-widest text-accent">Step 3 · Setting things up</p><h1 className="mt-3 font-display text-3xl">We’re weaving in your courses.</h1><p className="mt-3 text-text-muted">Canvas is syncing and selected course materials are being indexed. Keep this page open.</p></section>}
      </div>
    </main>
  );
}
