"use client";

import { useState } from "react";
import {
  createAcousticRipple,
  playLoomKnotSound,
  playLoomShuttleGlide,
  playWeaveHarmonizeChime,
} from "@/lib/loom-sound";

type LoomMode = "tidy" | "tangled";

export default function HeroLoom() {
  const [mode, setMode] = useState<LoomMode>("tidy");
  const [weaveKey, setWeaveKey] = useState(0);

  function setLoomMode(next: LoomMode) {
    setMode(next);
    if (next === "tidy") playWeaveHarmonizeChime();
    else playLoomKnotSound();
  }

  function replay() {
    setWeaveKey((key) => key + 1);
    setMode("tidy");
    playLoomShuttleGlide(0.25);
  }

  return (
    <div className="relative lg:col-span-6">
      {/* Ambient decorative textile backdrop */}
      <div className="pointer-events-none absolute -right-8 -bottom-10 h-64 w-64 rounded-full bg-surface-container/60 blur-2xl" />
      <div
        id="hero-loom-showcase"
        className="group relative overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm"
      >
        {/* Card chrome */}
        <div className="-mx-space-xl -mt-space-xl mb-space-md flex items-center justify-between bg-surface-bright/70 px-space-xl pb-space-md pt-space-lg">
          <div className="flex items-center gap-space-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="h-2.5 w-2.5 rounded-full bg-tertiary-container" />
            <span className="h-2.5 w-2.5 rounded-full bg-surface-tint" />
            <span className="ml-2 hidden font-code-tag text-code-tag font-semibold text-primary-container sm:inline">
              CANVAS_SYNC // ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-secondary/20 bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLoomMode("tidy")}
                title="Show balanced weave"
                className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                  mode === "tidy"
                    ? "bg-surface-container-high text-primary-container"
                    : "text-text-muted hover:text-primary"
                }`}
              >
                Tidy
              </button>
              <button
                type="button"
                onClick={() => setLoomMode("tangled")}
                title="Show LMS chaos"
                className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                  mode === "tangled"
                    ? "bg-error-container text-on-error-container"
                    : "text-text-muted hover:text-primary"
                }`}
              >
                Tangled
              </button>
            </div>
            <button
              type="button"
              onClick={replay}
              title="Replay loom weave animation"
              aria-label="Replay loom weave animation"
              className="ml-1 flex items-center gap-1 text-surface-tint transition-colors hover:text-primary focus:outline-none"
            >
              <span className="material-symbols-outlined text-base leading-none transition-transform hover:rotate-180">
                sync
              </span>
            </button>
          </div>
        </div>

        <div id="hero-panels-grid" className="relative grid grid-cols-1 gap-space-lg xl:grid-cols-2">
          {/* Tangled / scattered panel */}
          <div
            id="hero-left-panel"
            className={`relative flex flex-col justify-between gap-space-md overflow-hidden rounded-lg bg-surface-container-low/60 p-space-md transition-all duration-300 ${
              mode === "tangled"
                ? "opacity-100 ring-2 ring-warning/30"
                : "opacity-[0.45] grayscale-[30%]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
              <svg
                className="anim-tangle-svg h-full w-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 240 180"
                aria-hidden="true"
              >
                <path
                  d="M 10 30 Q 80 120, 160 40 T 230 140"
                  stroke="#ba1a1a"
                  strokeDasharray="4 6"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />
                <path
                  d="M 20 160 C 60 70, 130 190, 190 60 S 240 90, 240 90"
                  stroke="#c0aa62"
                  strokeDasharray="3 5"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                />
                <path
                  d="M -10 90 Q 70 20, 140 130 T 250 80"
                  stroke="#15370d"
                  strokeDasharray="2 4"
                  strokeOpacity="0.25"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-warning">
                <span className="material-symbols-outlined text-sm leading-none">error</span>{" "}
                Scattered
              </span>
              <span className="whitespace-nowrap font-code-tag text-code-tag text-on-surface-variant">
                LMS Chaos
              </span>
            </div>
            <div className="relative z-10 space-y-space-xs">
              <div className="rotate-[-1.5deg] rounded bg-surface/90 p-2.5 text-left shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-semibold text-warning">
                    CS 161 PS4
                  </span>
                  <span className="font-code-tag text-[10px] font-medium text-error">
                    Tonight?
                  </span>
                </div>
                <p className="line-clamp-1 font-body-sm text-xs text-on-surface-variant">
                  Submit via Gradescope before 11:59
                </p>
              </div>
              <div className="rotate-[1.2deg] rounded bg-surface/90 p-2.5 text-left opacity-85 shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-semibold text-tertiary">
                    11 Unread Notes
                  </span>
                  <span className="material-symbols-outlined text-xs leading-none text-tertiary">
                    notifications_active
                  </span>
                </div>
                <p className="line-clamp-1 font-body-sm text-xs text-on-surface-variant">
                  Syllabus addendum posted in BIO
                </p>
              </div>
              <div className="rotate-[-1deg] rounded bg-surface/80 p-2 text-left opacity-75 shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <span className="font-label-sm text-xs font-semibold text-on-surface-variant">
                  HIST 210 reading list (40 pgs)
                </span>
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between pt-space-xs font-code-tag text-code-tag text-warning">
              <span>3 courses clashed</span>
              <span className="material-symbols-outlined text-base leading-none">alt_route</span>
            </div>
          </div>

          {/* Woven / tidy panel */}
          <div
            id="hero-right-panel"
            className={`relative flex flex-col justify-between gap-space-md overflow-hidden rounded-lg bg-surface p-space-md shadow-sm transition-all duration-300 ${
              mode === "tidy"
                ? "opacity-100 ring-2 ring-surface-tint/20"
                : "opacity-[0.45] grayscale-[40%]"
            }`}
          >
            <div className="absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-primary-container via-surface-tint to-tertiary-fixed-dim opacity-70" />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-surface-tint">
                <span className="material-symbols-outlined text-sm leading-none">check_circle</span>{" "}
                Woven Tidy
              </span>
              <span className="whitespace-nowrap font-code-tag text-code-tag text-surface-tint">Calm Pace</span>
            </div>
            <div className="space-y-space-xs" key={weaveKey}>
              <div className="anim-weave-1 relative overflow-hidden rounded bg-surface-bright py-2 pl-2.5 pr-2 text-left shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary-container" />
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-semibold text-primary-container">
                    CS 161: Dynamic Prog
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded bg-secondary-container px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-container">
                    Thu 6PM
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-text-muted">Block 2 of 3 scheduled</p>
              </div>
              <div className="anim-weave-2 relative overflow-hidden rounded bg-surface-bright py-2 pl-2.5 pr-2 text-left shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <div className="absolute inset-y-0 left-0 w-1 bg-tertiary-fixed-dim" />
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-semibold text-primary-container">
                    HIST 210: Oral Sources
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-medium text-primary-container">
                    Fri 2PM
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-text-muted">Annotated summary ready</p>
              </div>
              <div className="anim-weave-3 relative overflow-hidden rounded bg-surface-bright py-2 pl-2.5 pr-2 text-left shadow-[0_1px_2px_rgba(21,55,13,0.04)]">
                <div className="absolute inset-y-0 left-0 w-1 bg-surface-tint" />
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-semibold text-primary-container">
                    BIO 102: Lab Report
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded bg-secondary-fixed px-1.5 py-0.5 text-[10px] font-medium text-on-secondary-fixed">
                    Sat 11AM
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-text-muted">Data charts compiled</p>
              </div>
            </div>
            <div className="pt-space-xs">
              <div className="mb-1 flex justify-between font-code-tag text-[11px] text-text-muted">
                <span>Weekly Thread</span>
                <span className="font-semibold text-primary-container">
                  {mode === "tidy" ? "78% Weaved" : "Clashed (3 due)"}
                </span>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="w-1/3 bg-primary-container" />
                <div className="w-1/4 bg-tertiary-fixed-dim" />
                <div className="w-1/5 bg-surface-tint" />
              </div>
            </div>
          </div>
        </div>

        {/* Shuttle strip */}
        <button
          type="button"
          onClick={(event) => {
            playLoomShuttleGlide(0.18);
            createAcousticRipple(event);
          }}
          className="relative mt-space-md flex w-full items-center justify-between overflow-hidden rounded-lg bg-surface-bright/90 px-space-md py-space-xs pt-space-sm text-left text-primary-container"
        >
          <div className="anim-shuttle pointer-events-none absolute inset-y-0 w-24 bg-linear-to-r from-transparent via-surface-container/60 to-transparent" />
          <span className="relative z-10 flex items-center gap-1.5 font-body-sm text-body-sm text-text-muted">
            <span className="material-symbols-outlined text-base leading-none text-secondary">
              auto_awesome
            </span>
            Harmonized in 1.4 seconds from your syllabus
          </span>
          <span className="relative z-10 font-code-tag text-code-tag font-semibold text-surface-tint">
            Zero Stress
          </span>
        </button>
      </div>
    </div>
  );
}
