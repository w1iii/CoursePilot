"use client";

import { useMemo, useState } from "react";
import {
  createAcousticRipple,
  playLoomKnotSound,
  playLoomShuttleGlide,
  playWeaveHarmonizeChime,
} from "@/lib/loom-sound";

type CourseKey = "cs161" | "bio102" | "hist210";

interface Task {
  id: number;
  courseKey: CourseKey;
  title: string;
  meta: string;
  due: string;
  barClass: string;
  checkClass: string;
  checked: boolean;
}

const COURSES: { key: CourseKey; label: string; dot: string; ring: string }[] = [
  {
    key: "cs161",
    label: "CS 161 (Algorithms)",
    dot: "bg-primary-container",
    ring: "ring-primary-container/20",
  },
  {
    key: "bio102",
    label: "BIO 102 (Cell Bio)",
    dot: "bg-surface-tint",
    ring: "ring-surface-tint/20",
  },
  {
    key: "hist210",
    label: "HIST 210 (Southeast Asia)",
    dot: "bg-tertiary-fixed-dim",
    ring: "ring-tertiary-fixed-dim/30",
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    courseKey: "cs161",
    title: "Problem Set 4: Dynamic Programming",
    meta: "CS 161 • 4 sub-problems remaining • Canvas Files synced",
    due: "Due Thu 11:59 PM",
    barClass: "bg-primary-container",
    checkClass: "accent-primary-container text-primary-container",
    checked: false,
  },
  {
    id: 2,
    courseKey: "bio102",
    title: "Mitochondrial ATP Synthesis Module",
    meta: "BIO 102 • Synthesis Brief #3 generated (3 min read)",
    due: "Fri 5:00 PM",
    barClass: "bg-surface-tint",
    checkClass: "accent-surface-tint text-surface-tint",
    checked: true,
  },
  {
    id: 3,
    courseKey: "hist210",
    title: "Chapter 8 Reading & Discussion post",
    meta: "HIST 210 • 2 peer replies required • 420 words",
    due: "Sun 8:00 PM",
    barClass: "bg-tertiary-fixed-dim",
    checkClass: "accent-tertiary text-tertiary",
    checked: false,
  },
];

const SEGMENT_COLORS = [
  "bg-primary-container",
  "bg-surface-tint",
  "bg-tertiary-fixed-dim",
  "bg-surface-tint",
  "bg-surface-tint",
  "bg-tertiary-fixed-dim",
];

const COMPANION_MESSAGES = {
  calendar:
    'All 3 study blocks are now synced to your <span class="font-semibold text-primary">Google / Apple Calendar</span> with 10-minute mindful notices.',
  flashcards:
    'Generated <span class="font-semibold text-primary">18 key concept flashcards</span> from HIST 210 Deck 03. Ready in your review tray!',
  "next-week":
    'Next week starts unhurried: only the <span class="font-semibold text-primary">BIO 102 Pre-lab</span> on Tuesday at 4 PM. We will weave the full week this Sunday evening.',
};

export default function WeaveView() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [focus, setFocus] = useState<CourseKey | null>(null);
  const [companion, setCompanion] = useState<string | null>(null);
  const [bubblePulse, setBubblePulse] = useState(0);

  const completed = 3 + tasks.filter((task) => task.checked).length;
  const totalUnits = 6;
  const percent = Math.round((completed / totalUnits) * 100);

  const complete = completed >= totalUnits;

  const caption = useMemo(() => {
    if (complete) return "Full weave complete: nothing left for Sunday night.";
    return "Balanced rhythm: 2 hours scheduled for Wednesday, zero work scheduled for Sunday afternoon.";
  }, [complete]);

  function toggleTask(id: number) {
    playLoomKnotSound();
    const next = tasks.map((task) =>
      task.id === id ? { ...task, checked: !task.checked } : task,
    );
    setTasks(next);
    if (3 + next.filter((task) => task.checked).length >= totalUnits) {
      playWeaveHarmonizeChime();
    }
  }

  function companionReply(key: keyof typeof COMPANION_MESSAGES) {
    playLoomKnotSound();
    setCompanion(COMPANION_MESSAGES[key]);
    setBubblePulse((pulse) => pulse + 1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-space-lg shadow-sm sm:p-space-2xl">
      {/* Section header */}
      <div className="flex flex-col justify-between gap-space-md pb-space-xl md:flex-row md:items-end">
        <div className="space-y-space-xs">
          <div className="flex items-center gap-2">
            <span className="font-code-tag text-code-tag font-medium uppercase tracking-wider text-surface-tint">
              Signature Interface
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-code-tag text-[10px] font-semibold text-on-secondary-container">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-surface-tint" /> LIVE
              SIMULATOR
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-primary-container">
            The Weave View
          </h2>
          <p className="max-w-xl font-body-md text-body-md text-text-muted">
            Course tracks run as colored vertical strands, intersecting with your weekdays to create
            an unshakeable study rhythm. Click tasks to tie knots!
          </p>
        </div>
        <div className="flex items-center gap-space-xs self-start rounded-lg border border-secondary/10 bg-surface-container-low px-3 py-1.5 md:self-auto">
          <span className="font-body-sm text-body-sm font-medium text-primary-container">
            Week of Nov 10 – 16
          </span>
          <span className="material-symbols-outlined text-base leading-none text-primary-container">
            expand_more
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-2xl lg:grid-cols-12">
        {/* Matrix */}
        <div className="space-y-space-lg lg:col-span-8">
          <div className="flex flex-wrap items-center gap-space-sm pb-space-xs">
            <span className="mr-1 font-code-tag text-code-tag text-text-muted">COURSE STRANDS:</span>
            {COURSES.map((course) => (
              <button
                key={course.key}
                type="button"
                onMouseEnter={() => {
                  setFocus(course.key);
                  playLoomShuttleGlide(0.09);
                }}
                onMouseLeave={() => setFocus(null)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-secondary/15 bg-surface-bright px-2.5 py-1 text-xs font-medium text-primary-container transition-all hover:scale-[1.02] hover:bg-surface-container-high"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ring-2 ${course.dot} ${course.ring}`}
                />
                {course.label}
              </button>
            ))}
          </div>

          <div className="space-y-space-sm">
            {tasks.map((task) => (
              <div
                key={task.id}
                data-course={task.courseKey}
                className={`task-strand-item relative flex flex-col justify-between gap-space-md overflow-hidden rounded-lg border border-border bg-surface-bright p-space-md transition-all hover:-translate-y-0.5 sm:flex-row sm:items-center ${
                  focus === task.courseKey ? "strand-focused" : ""
                }`}
                style={{
                  opacity: focus && focus !== task.courseKey ? 0.75 : 1,
                }}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                    task.checked ? "w-2" : "w-1"
                  } ${task.barClass}`}
                />
                <div className="flex items-start gap-space-md pl-space-xs">
                  <div className="relative mt-0.5 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={task.checked}
                      onChange={() => toggleTask(task.id)}
                      aria-label={`Mark ${task.title} complete`}
                      className={`z-10 h-4 w-4 cursor-pointer rounded ${task.checkClass} ${
                        task.checked ? "opacity-0" : "opacity-100"
                      }`}
                    />
                    {task.checked && (
                      <span
                        className={`knot-tied material-symbols-outlined absolute text-base leading-none ${task.checkClass}`}
                      >
                        check_circle
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <label
                        onClick={() => toggleTask(task.id)}
                        className={`cursor-pointer select-none font-headline-sm text-headline-sm transition-all ${
                          task.checked
                            ? "text-on-surface-variant/60 line-through"
                            : "text-primary-container"
                        }`}
                      >
                        {task.title}
                      </label>
                    </div>
                    <p className="mt-0.5 font-body-sm text-body-sm text-text-muted">{task.meta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-space-xs sm:pl-0">
                  <span className="inline-flex items-center rounded bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm font-semibold text-primary-container">
                    {task.due}
                  </span>
                  {task.checked ? (
                    <span className="inline-flex items-center rounded bg-secondary-fixed px-2 py-0.5 font-code-tag text-[11px] font-semibold uppercase text-on-secondary-fixed">
                      Tied &amp; Woven
                    </span>
                  ) : task.id === 1 ? (
                    <span className="inline-flex items-center rounded bg-tertiary-fixed px-2 py-0.5 font-code-tag text-[11px] font-semibold uppercase text-on-tertiary-fixed">
                      Due next
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-surface-container px-2 py-0.5 font-code-tag text-[11px] font-semibold uppercase text-primary-container">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Woven strand progress */}
          <div className="space-y-space-xs rounded-lg border border-secondary/15 bg-surface-container-low/70 p-space-md transition-all">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-primary-container">
                <span className="material-symbols-outlined text-base leading-none text-surface-tint">
                  grain
                </span>
                The Woven Strand (Completion Pace)
              </span>
              <span className="font-code-tag text-code-tag font-semibold text-primary-container">
                {completed} of {totalUnits} units woven ({percent}%)
              </span>
            </div>
            <div className="flex h-3.5 w-full gap-1.5 overflow-hidden rounded bg-surface-container-highest/40 p-0.5">
              {Array.from({ length: totalUnits }).map((_, index) => (
                <div
                  key={index}
                  title={`Study unit ${index + 1}`}
                  className={`flex-1 rounded-sm transition-all duration-500 ${
                    index < completed
                      ? `shadow-sm ${SEGMENT_COLORS[index]}`
                      : "bg-surface-container-highest opacity-50"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-text-muted">
              <p className="font-body-sm text-xs text-text-muted">{caption}</p>
              <span
                className={`hidden font-code-tag text-[10px] uppercase tracking-wider sm:inline ${
                  complete ? "font-bold text-surface-tint" : "font-medium text-surface-tint"
                }`}
              >
                {complete ? "Loom complete • Full weekend protected!" : "Thread holding steady"}
              </span>
            </div>
          </div>
        </div>

        {/* Companion */}
        <div className="flex flex-col justify-between gap-space-lg rounded-xl border border-border bg-surface-bright p-space-lg lg:col-span-4">
          <div>
            <div className="-mx-space-lg -mt-space-lg mb-space-md flex items-center justify-between border-b border-secondary/10 bg-surface-container-high/40 px-space-lg pb-space-md pt-space-md">
              <div className="flex items-center gap-space-xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-dark-text">
                  <span className="material-symbols-outlined text-sm leading-none">
                    filter_vintage
                  </span>
                </div>
                <span className="font-label-md text-label-md font-semibold text-primary-container">
                  CoursePilot Companion
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-code-tag text-[10px] font-medium uppercase tracking-wide text-surface-tint">
                <span className="h-1.5 w-1.5 rounded-full bg-surface-tint" />
                Synced
              </span>
            </div>

            <div
              key={bubblePulse}
              className="rag-fade-in relative mb-space-md rounded-xl border border-secondary/15 bg-surface p-space-md shadow-sm"
            >
              <p className="font-body-sm text-body-sm leading-relaxed text-primary-container">
                Magandang araw! You have 3 things due this week across CS and History.
              </p>
              <p
                className="mt-2 font-body-sm text-body-sm text-text-muted"
                dangerouslySetInnerHTML={{
                  __html:
                    companion ??
                    'I broke the <span class="font-semibold text-primary">CS 161 DP set</span> into two gentle 40-minute blocks before your Thursday lab so you won\'t need to rush.',
                }}
              />
            </div>

            <div className="space-y-space-xs">
              <p className="font-code-tag text-[11px] uppercase tracking-wider text-text-muted">
                Suggested Responses
              </p>
              {[
                { key: "calendar" as const, label: "Yes, lock this schedule into my calendar", icon: "arrow_forward" },
                { key: "flashcards" as const, label: "Generate flashcards from HIST slides", icon: "style" },
                { key: "next-week" as const, label: "What is due first next week?", icon: "schedule" },
              ].map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={(event) => {
                    createAcousticRipple(event);
                    companionReply(action.key);
                  }}
                  className="group flex w-full items-center justify-between rounded-lg border border-secondary/10 bg-surface p-2.5 text-left font-body-sm text-xs text-primary-container shadow-sm transition-all hover:bg-surface-container-high"
                >
                  <span>{action.label}</span>
                  <span className="material-symbols-outlined text-sm leading-none text-surface-tint transition-transform group-hover:translate-x-0.5">
                    {action.icon}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-space-xs rounded-lg border border-secondary/10 bg-surface-container-low/60 p-space-sm pt-space-md text-text-muted">
            <span className="material-symbols-outlined text-base leading-none text-surface-tint">
              check
            </span>
            <span className="font-body-sm text-xs">Updated 4 mins ago from Canvas API</span>
          </div>
        </div>
      </div>
    </div>
  );
}
