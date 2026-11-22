"use client";

import { useState } from "react";
import { playLoomShuttleGlide } from "@/lib/loom-sound";

const FAQ_ITEMS = [
  {
    question: "How does Ask Coursa use RAG with my Canvas coursework?",
    answer:
      "Coursa uses private Retrieval-Augmented Generation (RAG). When you connect your Canvas account, it indexes course files and announcements so answers can draw on relevant material and cite sources.",
  },
  {
    question: "Does Coursa store my university or Canvas login passwords?",
    answer:
      "No. Never. Coursa integrates via the official Canvas API using a personal access token. We never see, handle, or store your student portal password or multi-factor authentication credentials. Tokens are encrypted at rest with AES-256-GCM and access can be revoked anytime with one click in your Canvas account settings.",
  },
  {
    question: "How frequently does Coursa synchronize with Canvas?",
    answer:
      "Sync runs whenever you press “Sync Canvas”. Coursa tracks newly posted assignments, announcements, and changed due dates so your plan stays current.",
  },
  {
    question: "Is Coursa free for college students?",
    answer:
      "Coursa is free for individual undergraduate students across up to 5 concurrent courses.",
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
