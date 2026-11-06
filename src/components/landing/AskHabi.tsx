"use client";

import { useRef, useState } from "react";
import {
  createAcousticRipple,
  playLoomKnotSound,
  playLoomShuttleGlide,
} from "@/lib/loom-sound";

type QueryKey = "reviewer" | "summarize" | "proofs";

interface Citation {
  label: string;
  icon: string;
  bg: string;
}

interface RagEntry {
  question: string;
  answer: string;
  citations: Citation[];
}

const RAG_QUERIES: Record<QueryKey, RagEntry> = {
  reviewer: {
    question:
      "“Generate a 10-question midterm reviewer for CS 161 based on Deck 4 and Homework 2.”",
    answer:
      "Compiled a targeted 10-question reviewer focusing on optimal substructure proofs (Q1–4), memoized DFS vs BFS recurrence (Q5–8), and bottom-up DP cache alignment (Q9–10). Each question cites your course slides with step-by-step rubrics.",
    citations: [
      { label: "CS 161 Deck 04 (Slide 16)", icon: "link", bg: "bg-surface-container-high" },
      { label: "HW 2 Solutions § Subproblem Graph", icon: "menu_book", bg: "bg-secondary-container" },
      { label: "Exam 2024 Archive #3", icon: "quiz", bg: "bg-tertiary-fixed" },
    ],
  },
  summarize: {
    question:
      "“Summarize HIST 210 Module 4 readings on Southeast Asian maritime trade (80 pages).”",
    answer:
      "Distilled the 3 chapters into 4 central themes: monsoon wind cycles dictating Malacca port hubs, ceramic ballast trade networks, and indigenous trade treaties preceding Spanish arrival. Key takeaway list with page markers ready in your notes.",
    citations: [
      { label: "HIST 210 Reader (pp. 94–174)", icon: "menu_book", bg: "bg-secondary-container" },
      { label: "Lecture 08 Audio Transcript", icon: "mic", bg: "bg-surface-container-high" },
      { label: "Discussion Board Prompt 4", icon: "forum", bg: "bg-tertiary-fixed" },
    ],
  },
  proofs: {
    question:
      "“Draft practice proofs for dynamic programming state transitions in BIO 102 ATP modeling.”",
    answer:
      "Synthesized 3 practice proofs modeling phosphorylation states as DAG transitions. Proved that local enzymatic equilibrium satisfies Bellman optimality conditions without recursive cycle traps, referencing Professor Ramos’s whiteboard diagram.",
    citations: [
      { label: "BIO 102 Module 3 § Energetics", icon: "science", bg: "bg-secondary-container" },
      { label: "Deck 05 Slide 22 (DAG Model)", icon: "link", bg: "bg-surface-container-high" },
      { label: "Office Hours Whiteboard Notes", icon: "edit_note", bg: "bg-tertiary-fixed" },
    ],
  },
};

type Phase = "ready" | "retrieving" | "synthesizing" | "done";

const SIDE_FEATURES = [
  {
    icon: "menu_book",
    iconWrap: "bg-surface-container-high text-primary-container",
    title: "Instant Custom Reviewers",
    body: "Generates midterm and final study packs, flashcard sets, and concept maps tailored to specific lecture slide decks and professor focus points.",
  },
  {
    icon: "summarize",
    iconWrap: "bg-secondary-container text-primary-container",
    title: "Module Syntheses & Deep Briefs",
    body: "Distills 80-page academic reading PDFs and lecture transcripts into crisp, 3-minute synthesis briefs with actionable takeaway bullets.",
  },
  {
    icon: "verified",
    iconWrap: "bg-tertiary-fixed text-primary-container",
    title: "Verifiable Source Citations",
    body: "Every answer weaves back to the exact slide number, syllabus grading policy clause, or textbook page — preventing hallucinations.",
  },
  {
    icon: "compare_arrows",
    iconWrap: "bg-surface-container text-tertiary",
    title: "Multi-Course Cross-Referencing",
    body: "Query connections across your entire term schedule, comparing algorithmic models with biology data sets or historical timelines.",
  },
];

export default function AskHabi() {
  const [entry, setEntry] = useState<RagEntry>(RAG_QUERIES.reviewer);
  const [phase, setPhase] = useState<Phase>("ready");
  const [answerKey, setAnswerKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function simulate(key: QueryKey) {
    playLoomShuttleGlide(0.24);
    timers.current.forEach(clearTimeout);
    const next = RAG_QUERIES[key];

    setPhase("retrieving");
    timers.current = [
      setTimeout(() => {
        setEntry(next);
        setPhase("synthesizing");
        playLoomShuttleGlide(0.18);
      }, 250),
      setTimeout(() => {
        setPhase("done");
        setAnswerKey((value) => value + 1);
        playLoomKnotSound();
      }, 600),
    ];
  }

  const statusText =
    phase === "retrieving"
      ? "Retrieving vectors..."
      : phase === "synthesizing"
        ? "Synthesizing..."
        : phase === "done"
          ? "Indexed & Cited"
          : "Ready";

  return (
    <div className="overflow-hidden rounded-xl border border-secondary/20 bg-surface p-space-lg shadow-sm sm:p-space-2xl">
      <div className="mx-auto mb-space-2xl max-w-2xl space-y-space-xs text-center">
        <div className="mb-space-xs inline-flex items-center gap-space-xs rounded-full bg-surface-container-high/80 px-3 py-1 text-primary-container">
          <span className="h-2 w-2 rounded-full bg-surface-tint" />
          <span className="font-code-tag text-code-tag font-medium uppercase tracking-wider">
            Course Context RAG // Grounded Retrieval
          </span>
        </div>
        <h2 className="font-headline-lg text-headline-lg text-primary-container">
          Ask Habi: Your Syllabus &amp; Lecture Oracle
        </h2>
        <p className="font-body-md text-body-md text-text-muted">
          Ask Habi and it delivers, grounded directly in your course files, PDFs, lecture
          transcripts, and Canvas discussion threads with zero hallucinations and exact citation
          links.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-space-2xl lg:grid-cols-12">
        <div className="space-y-space-md rounded-xl border border-secondary/20 bg-surface-bright p-space-xl shadow-sm lg:col-span-7">
          <div className="flex flex-col items-start gap-2 border-b border-secondary/20 pb-space-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl leading-none text-surface-tint">
                manage_search
              </span>
              <span className="font-code-tag text-code-tag font-semibold uppercase tracking-wider text-primary-container">
                RAG Query Engine
              </span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                playLoomShuttleGlide(0.22);
                createAcousticRipple(event);
              }}
              title="Click to hear the loom shuttle frequency"
              className="relative flex cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap rounded bg-secondary-container px-2.5 py-0.5 text-[11px] font-medium text-surface-tint transition-opacity hover:opacity-90"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-surface-tint" />
              <span>Canvas Vector Index: Synced</span>
              <div className="anim-shuttle-pulse pointer-events-none absolute inset-0 bg-surface-container/40" />
            </button>
          </div>

          {/* Student prompt */}
          <div className="rounded-lg border border-secondary/20 bg-surface p-space-md shadow-sm transition-all">
            <div className="mb-1.5 flex items-center justify-between text-text-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm leading-none text-tertiary">
                  person
                </span>
                <span className="font-code-tag text-[11px] uppercase tracking-wider">
                  Student Prompt
                </span>
              </div>
              <span
                className={`font-code-tag text-[10px] ${
                  phase === "retrieving"
                    ? "font-medium text-tertiary"
                    : phase === "synthesizing"
                      ? "font-medium text-tertiary"
                      : phase === "done"
                        ? "font-medium text-surface-tint"
                        : "text-surface-tint"
                }`}
              >
                {statusText}
              </span>
            </div>
            <p
              className={`font-body-md text-body-md font-medium text-primary-container transition-opacity ${
                phase === "retrieving" || phase === "synthesizing" ? "opacity-50" : "opacity-100"
              }`}
            >
              {entry.question}
            </p>
          </div>

          {/* Grounded answer */}
          <div className="relative space-y-space-sm rounded-lg border border-secondary/20 bg-surface p-space-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container text-dark-text">
                  <span className="material-symbols-outlined text-xs leading-none">
                    filter_vintage
                  </span>
                </div>
                <span className="font-label-md text-label-md font-semibold text-primary-container">
                  Habi Answer
                </span>
              </div>
              <div className="flex items-center gap-1 font-code-tag text-[10px] font-semibold uppercase text-surface-tint">
                <span className="h-1.5 w-1.5 rounded-full bg-surface-tint" />
                <span>100% Course Grounded</span>
              </div>
            </div>
            <p
              key={answerKey}
              className={`font-body-sm text-body-sm leading-relaxed text-primary-container ${
                phase === "retrieving" || phase === "synthesizing"
                  ? "opacity-40"
                  : "rag-fade-in opacity-100"
              }`}
            >
              {entry.answer}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.citations.map((citation) => (
                <span
                  key={citation.label}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-code-tag text-[11px] text-primary-container shadow-xs transition-transform hover:scale-105 ${citation.bg}`}
                >
                  <span className="material-symbols-outlined text-xs leading-none text-surface-tint">
                    {citation.icon}
                  </span>
                  {citation.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-code-tag text-[11px] uppercase tracking-wider text-text-muted">
                Try Interactive Prompts
              </span>
              <span className="font-code-tag text-[10px] text-surface-tint">
                Click to stream answer
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(event) => {
                  createAcousticRipple(event);
                  simulate("reviewer");
                }}
                onMouseEnter={() => playLoomShuttleGlide(0.08)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-surface px-3 py-1.5 text-xs font-medium text-primary-container shadow-sm transition-all active:scale-95 hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm leading-none text-surface-tint">
                  auto_awesome
                </span>
                Generate 10-Question Reviewer
              </button>
              <button
                type="button"
                onClick={(event) => {
                  createAcousticRipple(event);
                  simulate("summarize");
                }}
                onMouseEnter={() => playLoomShuttleGlide(0.08)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-surface px-3 py-1.5 text-xs font-medium text-primary-container shadow-sm transition-all active:scale-95 hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm leading-none text-surface-tint">
                  article
                </span>
                Summarize Module 4 Readings
              </button>
              <button
                type="button"
                onClick={(event) => {
                  createAcousticRipple(event);
                  simulate("proofs");
                }}
                onMouseEnter={() => playLoomShuttleGlide(0.08)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-surface px-3 py-1.5 text-xs font-medium text-primary-container shadow-sm transition-all active:scale-95 hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm leading-none text-surface-tint">
                  quiz
                </span>
                Draft Practice Proofs
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-space-md lg:col-span-5">
          {SIDE_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-space-md rounded-xl border border-secondary/20 bg-surface-bright p-space-md transition-all hover:bg-surface-container-low/50"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${feature.iconWrap}`}
              >
                <span className="material-symbols-outlined text-xl leading-none">
                  {feature.icon}
                </span>
              </div>
              <div>
                <h4 className="mb-0.5 font-headline-sm text-sm font-semibold text-primary-container">
                  {feature.title}
                </h4>
                <p className="font-body-sm text-xs leading-relaxed text-text-muted">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
