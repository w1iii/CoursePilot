import Link from "next/link";
import { Show } from "@clerk/nextjs";
import SoundToggle from "@/components/landing/SoundToggle";
import HeroLoom from "@/components/landing/HeroLoom";
import Workflow from "@/components/landing/Workflow";
import WeaveView from "@/components/landing/WeaveView";
import AskHabi from "@/components/landing/AskHabi";
import Reveal from "@/components/landing/Reveal";
import Faq from "@/components/landing/Faq";

function WeaveMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-8 w-8 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#15370D" />
      <path
        d="M16 5.5 26.5 16 16 26.5 5.5 16 16 5.5Z"
        stroke="#FFF2B4"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 10.5 21.5 16 16 21.5 10.5 16 16 10.5Z" fill="#C0AA62" />
      <path d="M16 13.2 18.8 16 16 18.8 13.2 16 16 13.2Z" fill="#15370D" />
      <path d="M5.5 16h21M16 5.5v21" stroke="#FFF2B4" strokeOpacity="0.35" strokeWidth="0.8" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* ============ HEADER ============ */}
      <header className="fixed inset-x-0 top-0 z-50 bg-background/85 shadow-[0_1px_8px_rgba(21,55,13,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1120px] items-center justify-between px-gutter">
          <Link href="/" className="flex items-center gap-space-md">
            <WeaveMark />
            <span className="font-headline-md text-headline-md font-semibold tracking-tight text-primary-container">
              Habi
            </span>
          </Link>

          <nav className="hidden items-center gap-space-lg lg:flex">
            <a
              href="#how-it-works"
              className="rounded-lg bg-surface-container-high px-space-md py-space-xs font-bold text-primary"
            >
              How it works
            </a>
            <a
              href="#features"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Features
            </a>
            <a
              href="#weave-preview"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Weave View
            </a>
            <a
              href="#ask-habi"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Ask Habi
            </a>
            <a
              href="#faq"
              className="px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-space-md">
            <SoundToggle />
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="hidden font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-lg bg-primary-container px-5 py-3 font-label-md text-label-md text-dark-text shadow-[0_1px_2px_rgba(21,55,13,0.08)] transition-colors hover:bg-primary-hover hover:text-on-primary"
              >
                Get started
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-primary-container px-5 py-3 font-label-md text-label-md text-dark-text shadow-[0_1px_2px_rgba(21,55,13,0.08)] transition-colors hover:bg-primary-hover hover:text-on-primary"
              >
                Open dashboard
              </Link>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <span className="material-symbols-outlined text-[18px] leading-none text-on-primary">
                  person
                </span>
              </div>
            </Show>
          </div>
        </div>
      </header>

      <main className="w-full bg-background pt-20">
        <div className="flex w-full flex-col">
          {/* ============ HERO ============ */}
          <div className="relative w-full overflow-hidden">
            {/* decorative inabel weave background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="weft-breathe absolute inset-0 bg-[radial-gradient(#15370d_1px,transparent_1px)] opacity-[0.05] [background-size:16px_16px]" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #15370D 0, #15370D 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #728E6D 0, #728E6D 1px, transparent 0, transparent 50%)",
                  backgroundSize: "24px 24px",
                }}
              />
              <svg
                aria-hidden="true"
                className="loom-drift absolute -top-24 left-1/2 h-[720px] w-[1400px] max-w-none -translate-x-1/2 opacity-85"
                fill="none"
                viewBox="0 0 1400 720"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  className="thread-flow"
                  d="M -100 120 C 240 80, 480 260, 820 180 C 1120 110, 1320 280, 1550 200"
                  stroke="#15370D"
                  strokeOpacity="0.10"
                  strokeWidth="1.5"
                />
                <path
                  className="thread-flow"
                  d="M -80 180 C 260 260, 580 90, 920 220 C 1200 320, 1380 160, 1580 240"
                  stroke="#728E6D"
                  strokeOpacity="0.08"
                  strokeWidth="2"
                  style={{ animationDuration: "44s", animationDirection: "reverse" }}
                />
                <path
                  className="thread-flow"
                  d="M -120 260 C 200 200, 520 340, 880 240 C 1180 160, 1400 320, 1600 280"
                  stroke="#c0aa62"
                  strokeOpacity="0.10"
                  strokeWidth="1.5"
                  style={{ animationDuration: "32s" }}
                />
                <path
                  className="thread-flow"
                  d="M -60 340 C 300 380, 620 200, 960 300 C 1240 380, 1420 230, 1560 320"
                  stroke="#15370D"
                  strokeOpacity="0.06"
                  strokeWidth="1.2"
                  style={{ animationDuration: "52s" }}
                />
              </svg>
            </div>

            <section className="relative mx-auto w-full max-w-[1120px] px-gutter pb-space-4xl pt-space-3xl">
              <div className="grid grid-cols-1 items-center gap-space-3xl lg:grid-cols-12">
                <div className="flex flex-col space-y-space-xl lg:col-span-6">
                  <div className="space-y-space-md">
                    <h1 className="font-display text-display-mobile tracking-tight text-primary-container md:text-display">
                      Weave your semester together.
                    </h1>
                    <p className="max-w-xl font-body-lg text-body-lg text-text-muted">
                      Habi pulls your deadlines, modules, and notes from Canvas into one calm,
                      tidy week. Less panic, more unhurried focus.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                    <Show when="signed-out">
                      <Link
                        href="/sign-up"
                        className="group inline-flex items-center justify-center rounded-lg bg-primary-container px-6 py-3.5 font-label-md text-label-md text-dark-text shadow-sm transition-all hover:bg-primary-hover hover:text-on-primary"
                      >
                        <span>Connect Canvas</span>
                        <span className="material-symbols-outlined ml-2 text-lg leading-none transition-transform group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      </Link>
                    </Show>
                    <Show when="signed-in">
                      <Link
                        href="/dashboard"
                        className="group inline-flex items-center justify-center rounded-lg bg-primary-container px-6 py-3.5 font-label-md text-label-md text-dark-text shadow-sm transition-all hover:bg-primary-hover hover:text-on-primary"
                      >
                        <span>Connect Canvas</span>
                        <span className="material-symbols-outlined ml-2 text-lg leading-none transition-transform group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      </Link>
                    </Show>
                    <a
                      href="#weave-preview"
                      className="inline-flex items-center justify-center rounded-lg bg-surface px-5 py-3.5 font-label-md text-label-md text-primary-container shadow-sm transition-colors hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined mr-2 text-lg leading-none text-secondary">
                        calendar_view_week
                      </span>
                      <span>See a sample week</span>
                    </a>
                  </div>
                </div>

                <HeroLoom />
              </div>
            </section>
          </div>

          {/* ============ LOOM THREAD DIVIDER ============ */}
          <div className="relative my-space-lg flex w-full items-center justify-center overflow-hidden px-gutter">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
              <svg
                aria-hidden="true"
                className="h-8 w-full max-w-[1200px]"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 1200 32"
              >
                <path
                  className="thread-flow"
                  d="M 0 16 Q 300 4, 600 16 T 1200 16"
                  stroke="#728E6D"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                  style={{ animationDuration: "40s" }}
                />
                <path
                  className="thread-flow"
                  d="M 0 16 Q 300 28, 600 16 T 1200 16"
                  stroke="#c0aa62"
                  strokeOpacity="0.12"
                  strokeWidth="1"
                  style={{ animationDuration: "30s", animationDirection: "reverse" }}
                />
              </svg>
            </div>
            <div className="relative flex w-full max-w-[1120px] items-center gap-space-md">
              <div className="h-px flex-1 bg-secondary/20" />
              <div className="flex h-3 w-3 rotate-45 items-center justify-center bg-surface-tint/30">
                <div className="h-1.5 w-1.5 bg-primary-container" />
              </div>
              <div className="h-px flex-1 bg-secondary/20" />
            </div>
          </div>

          {/* ============ HOW IT WORKS ============ */}
          <section
            id="how-it-works"
            className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-gutter py-space-3xl"
          >
            <Reveal>
              <div className="mx-auto mb-space-3xl max-w-2xl space-y-space-xs text-center">
                <span className="font-code-tag text-code-tag font-medium uppercase tracking-widest text-surface-tint">
                  The Loom Workflow
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary-container">
                  From scattered threads to one tidy weave
                </h2>
                <p className="font-body-md text-body-md text-text-muted">
                  Crafted after traditional Filipino loom mechanics: intake raw fiber, align warp
                  and weft, and wear an effortless pattern.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Workflow />
            </Reveal>
          </section>

          {/* ============ WEAVE VIEW ============ */}
          <section
            id="weave-preview"
            className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-gutter py-space-3xl"
          >
            <Reveal>
              <WeaveView />
            </Reveal>
          </section>

          {/* ============ ASK COURSEPILOT ============ */}
          <section
            id="ask-habi"
            className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-gutter py-space-3xl"
          >
            <Reveal>
              <AskHabi />
            </Reveal>
          </section>

          {/* ============ FEATURES ============ */}
          <section
            id="features"
            className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-gutter py-space-3xl"
          >
            <Reveal>
              <div className="mx-auto mb-space-3xl max-w-2xl space-y-space-xs text-center">
                <span className="font-code-tag text-code-tag font-medium uppercase tracking-widest text-surface-tint">
                  Crafted Capabilities
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary-container">
                  Engineered for students who value their calm
                </h2>
                <p className="font-body-md text-body-md text-text-muted">
                  No cluttered dashboards or gamified badges. Just purposeful academic clarity
                  drawn straight from your coursework.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
            <div className="grid grid-cols-1 gap-space-xl md:grid-cols-2">
              <div className="feature-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm transition-all duration-200">
                <div className="edge-strand absolute inset-y-0 left-0 w-1.5 bg-primary-container opacity-80" />
                <div>
                  <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-high text-primary-container">
                    <span className="material-symbols-outlined text-2xl leading-none">timeline</span>
                  </div>
                  <h3 className="mb-space-xs font-headline-sm text-headline-sm text-primary-container">
                    Deadline Tracking
                  </h3>
                  <p className="font-body-md text-body-md leading-relaxed text-text-muted">
                    Cross-course synchronization maps every Canvas assignment, quiz, and discussion
                    prompt against one another so you never miss an overlapping crunch — and flags
                    every due date that quietly moved.
                  </p>
                </div>
                <div className="mt-space-xl flex items-center justify-between rounded-lg border border-secondary/10 bg-surface-bright p-space-md pt-space-md">
                  <span className="font-code-tag text-code-tag text-primary-container">
                    Sync interval: real-time webhooks
                  </span>
                  <span className="material-symbols-outlined text-base leading-none text-surface-tint">
                    done_all
                  </span>
                </div>
              </div>

              <div className="feature-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm transition-all duration-200">
                <div className="edge-strand absolute inset-y-0 left-0 w-1.5 bg-surface-tint opacity-80" />
                <div>
                  <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-container text-primary-container">
                    <span className="material-symbols-outlined text-2xl leading-none">article</span>
                  </div>
                  <h3 className="mb-space-xs font-headline-sm text-headline-sm text-primary-container">
                    Module Summaries
                  </h3>
                  <p className="font-body-md text-body-md leading-relaxed text-text-muted">
                    Lengthy professor announcements and 60-page reading PDFs distilled into 3-minute
                    synthesis briefs with actionable takeaway bullets.
                  </p>
                </div>
                <div className="mt-space-xl flex items-center justify-between rounded-lg border border-secondary/10 bg-surface-bright p-space-md pt-space-md">
                  <span className="font-code-tag text-code-tag text-primary-container">
                    Average reading time saved: 4.8 hrs/wk
                  </span>
                  <span className="material-symbols-outlined text-base leading-none text-surface-tint">
                    speed
                  </span>
                </div>
              </div>

              <div className="feature-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm transition-all duration-200">
                <div className="edge-strand absolute inset-y-0 left-0 w-1.5 bg-tertiary-fixed-dim opacity-80" />
                <div>
                  <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-tertiary">
                    <span className="material-symbols-outlined text-2xl leading-none">
                      calendar_today
                    </span>
                  </div>
                  <h3 className="mb-space-xs font-headline-sm text-headline-sm text-primary-container">
                    Study Plans
                  </h3>
                  <p className="font-body-md text-body-md leading-relaxed text-text-muted">
                    Dynamic, elastic pacing that automatically reshapes your calendar when life
                    happens, professors shift dates, or you need an unplanned rest day.
                  </p>
                </div>
                <div className="mt-space-xl flex items-center justify-between rounded-lg border border-secondary/10 bg-surface-bright p-space-md pt-space-md">
                  <span className="font-code-tag text-code-tag text-primary-container">
                    Auto-rebalancing upon date changes
                  </span>
                  <span className="material-symbols-outlined text-base leading-none text-surface-tint">
                    auto_mode
                  </span>
                </div>
              </div>

              <div className="feature-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm transition-all duration-200">
                <div className="edge-strand absolute inset-y-0 left-0 w-1.5 bg-primary-hover opacity-80" />
                <div>
                  <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-fixed text-primary-container">
                    <span className="material-symbols-outlined text-2xl leading-none">quiz</span>
                  </div>
                  <h3 className="mb-space-xs font-headline-sm text-headline-sm text-primary-container">
                    Quiz &amp; Exam Prep
                  </h3>
                  <p className="font-body-md text-body-md leading-relaxed text-text-muted">
                    Instant flashcards, recall prompts, and practice quizzes synthesized directly
                    from your professor’s uploaded lecture slides and past syllabi.
                  </p>
                </div>
                <div className="mt-space-xl flex items-center justify-between rounded-lg border border-secondary/10 bg-surface-bright p-space-md pt-space-md">
                  <span className="font-code-tag text-code-tag text-primary-container">
                    Spaced repetition algorithmic weave
                  </span>
                  <span className="material-symbols-outlined text-base leading-none text-surface-tint">
                    psychology
                  </span>
                </div>
              </div>
            </div>
            </Reveal>
          </section>

          {/* ============ STUDENT PRAISE ============ */}
          <section className="mx-auto w-full max-w-[1120px] px-gutter py-space-2xl">
            <Reveal>
            <div className="flex flex-col items-center justify-between gap-space-2xl rounded-xl border border-secondary/15 bg-surface-container-high/60 p-space-xl sm:p-space-2xl md:flex-row">
              <div className="max-w-lg space-y-space-xs">
                <span className="font-code-tag text-code-tag font-semibold uppercase text-surface-tint">
                  Grounded in mindful practice
                </span>
                <h3 className="font-headline-md text-headline-md text-primary-container">
                  “Canvas felt like a loud inbox. Habi feels like an organized desk.”
                </h3>
                <p className="font-body-md text-body-md text-text-muted">
                  — Bea R., Computer Science &amp; Linguistics Senior, Diliman
                </p>
              </div>
              <div className="flex flex-col items-center space-y-space-sm text-center md:items-end md:text-right">
                <div className="flex items-center gap-1 text-tertiary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className="material-symbols-outlined text-lg leading-none"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="font-body-sm text-body-sm font-semibold text-primary-container">
                  4.9 / 5 Average Semester Rating
                </p>
                <span className="font-code-tag text-code-tag text-text-muted">
                  Verified student integrations
                </span>
              </div>
            </div>
            </Reveal>
          </section>

          {/* ============ FAQ ============ */}
          <section
            id="faq"
            className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-gutter py-space-3xl"
          >
            <Reveal>
              <div className="mx-auto mb-space-3xl max-w-2xl space-y-space-xs text-center">
                <span className="font-code-tag text-code-tag font-medium uppercase tracking-widest text-surface-tint">
                  Clear Answers
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary-container">
                  Frequently asked questions
                </h2>
                <p className="font-body-md text-body-md text-text-muted">
                  Everything you need to know about our Canvas connection, safety standards, and
                  student privacy.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Faq />
            </Reveal>
          </section>

          {/* ============ FINAL CTA ============ */}
          <section className="mx-auto w-full max-w-[1120px] px-gutter pb-space-4xl pt-space-2xl">
            <Reveal>
            <div className="relative flex flex-col items-center overflow-hidden rounded-xl bg-primary-container p-space-2xl text-center text-dark-text sm:p-space-4xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#fae194_1px,transparent_1px)] opacity-10 [background-size:20px_20px]" />
              <span className="mb-space-xs font-code-tag text-code-tag font-semibold uppercase tracking-widest text-dark-secondary">
                Ready for an unhurried term?
              </span>
              <h2 className="mb-space-md max-w-xl font-headline-lg text-headline-lg text-dark-text">
                Bring quiet order to your semester today.
              </h2>
              <p className="mb-space-xl max-w-lg font-body-lg text-body-lg text-dark-secondary">
                Connect Canvas in 60 seconds. Let your deadlines arrange themselves into an
                intuitive, peaceful rhythm.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-space-md">
                <Show when="signed-out">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center justify-center rounded-lg bg-surface-bright px-6 py-3.5 font-label-md text-label-md font-semibold text-primary-container shadow-sm transition-colors hover:bg-surface-container-high"
                  >
                    <span>Connect Canvas Now</span>
                    <span className="material-symbols-outlined ml-2 text-lg leading-none">check</span>
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-surface-bright px-6 py-3.5 font-label-md text-label-md font-semibold text-primary-container shadow-sm transition-colors hover:bg-surface-container-high"
                  >
                    <span>Connect Canvas Now</span>
                    <span className="material-symbols-outlined ml-2 text-lg leading-none">check</span>
                  </Link>
                </Show>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-lg px-5 py-3.5 font-label-md text-label-md text-dark-text transition-colors hover:text-surface-container"
                >
                  <span>Explore Loom Architecture</span>
                </a>
              </div>
              <p className="mt-space-xl font-body-sm text-xs text-dark-secondary/80">
                Compatible with Canvas LMS by Instructure. No credit card or university contract
                needed.
              </p>
            </div>
            </Reveal>
          </section>
        </div>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="mt-space-4xl w-full bg-surface-container-low py-space-4xl shadow-[0_1px_8px_rgba(21,55,13,0.04)]">
        <div className="mx-auto max-w-[1120px] px-gutter">
          <div className="flex flex-col justify-between gap-space-3xl pb-space-3xl md:flex-row md:items-start">
            <div className="max-w-sm space-y-space-sm">
              <div className="flex items-center gap-space-xs">
                <WeaveMark />
                <span className="font-headline-md text-headline-md font-semibold text-primary-container">
                  Habi
                </span>
              </div>
              <p className="font-headline-sm text-headline-sm italic text-secondary">
                Hinabi para sa&apos;yo
              </p>
              <p className="font-body-sm text-body-sm text-text-muted">
                An intelligent academic weave translating Canvas LMS deadlines, syllabi, and notes
                into an unhurried, purposeful rhythm.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-space-2xl sm:grid-cols-3">
              <div className="space-y-space-sm">
                <p className="font-label-md text-label-md uppercase tracking-wider text-primary-container">
                  Loom
                </p>
                <ul className="space-y-space-xs">
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#how-it-works"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      How it works
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#features"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Features
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#weave-preview"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Weave View
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#ask-habi"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Ask Habi (RAG)
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-space-sm">
                <p className="font-label-md text-label-md uppercase tracking-wider text-primary-container">
                  Resources
                </p>
                <ul className="space-y-space-xs">
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#faq"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      FAQ
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <Link
                      href="/dashboard"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Canvas Setup
                    </Link>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#how-it-works"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Student Stories
                    </a>
                  </li>
                </ul>
              </div>

              <div className="space-y-space-sm">
                <p className="font-label-md text-label-md uppercase tracking-wider text-primary-container">
                  Trust
                </p>
                <ul className="space-y-space-xs">
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#faq"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#faq"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li className="font-body-sm text-body-sm">
                    <a
                      href="#faq"
                      className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Security Weave
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-space-md pt-space-xl text-center md:flex-row md:text-left">
            <p className="font-body-sm text-body-sm text-text-muted">
              Works with Canvas LMS. Not affiliated with Instructure.
            </p>
            <p className="font-body-sm text-body-sm text-text-muted">
              © {new Date().getFullYear()} Habi. Crafted with care in the Philippines.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
