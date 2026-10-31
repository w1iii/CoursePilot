"use client";

import { useState } from "react";
import { playLoomShuttleGlide } from "@/lib/loom-sound";

const FAQ_ITEMS = [
  {
    question: "How does Ask Habi use RAG with my Canvas coursework?",
    answer:
      "Habi implements private Retrieval-Augmented Generation (RAG). When you connect your Canvas account, Habi securely indexes your course syllabus files, uploaded PDFs, slide decks, and Canvas announcements into an isolated vector database. Every query retrieves the most pertinent excerpts and synthesizes answers citing your professor's exact wording — with complete student data privacy and zero model retraining on your files.",
  },
  {
    question: "Does Habi store my university or Canvas login passwords?",
    answer:
      "No. Never. Habi integrates via the official Canvas API using a personal access token. We never see, handle, or store your student portal password or multi-factor authentication credentials. Tokens are encrypted at rest with AES-256-GCM and access can be revoked anytime with one click in your Canvas account settings.",
  },
  {
    question: "How frequently does Habi synchronize with Canvas?",
    answer:
      "Sync runs whenever you press “Sync Canvas”, and it can be triggered automatically on a schedule. Habi tracks newly posted assignments, announcements, and moved due dates so your weave is always current.",
  },
  {
    question: "Is Habi free for college students?",
    answer:
      "Habi is free for individual undergraduate students across up to 5 concurrent courses. We offer an optional institutional tier for universities wanting campus-wide academic counseling and advising weaves.",
  },
  {
    question: "What if my professor changes a deadline last minute?",
    answer:
      "When an assignment due date shifts in Canvas, Habi highlights the affected strand in gold, sends a quiet briefing notification, and gently re-balances your subsequent study blocks so your weekend remains protected.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  function toggle(index: number) {
    if (open === index) {
      setOpen(null);
      return;
    }
    setOpen(index);
    playLoomShuttleGlide(0.12);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-space-md">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = open === index;
        return (
          <div
            key={item.question}
            className="rounded-xl border border-border bg-surface p-space-lg shadow-sm transition-all"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between text-left font-headline-sm text-headline-sm text-primary-container"
            >
              <span>{item.question}</span>
              <span
                className={`material-symbols-outlined text-xl leading-none text-surface-tint transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                expand_more
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="mt-space-sm pt-space-xs font-body-sm text-body-sm leading-relaxed text-text-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
