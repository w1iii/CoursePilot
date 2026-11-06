import Link from "next/link";

export default function AskHabiCard() {
  return (
    <Link
      href="/dashboard/thread"
      className="group block border border-primary-container/40 bg-surface/70 p-space-md transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
      aria-label="Ask Habi — start a new chat"
    >
      <div className="flex items-center justify-between gap-2 border-b border-primary-container/25 pb-2">
        <span className="paper-kicker text-accent">Ask Habi</span>
        <span
          className="material-symbols-outlined text-[18px] text-primary-container transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        >
          arrow_forward
        </span>
      </div>

      <p className="mt-3 font-display text-[25px] leading-[1.08] text-primary-container">
        Have a question about your courses?
      </p>
      <p className="mt-2 font-body-sm text-body-sm text-text-muted">
        Open a new chat. Ask about deadlines, modules, or what to work on next.
      </p>
      <p className="mt-3 font-code-tag text-[10px] uppercase tracking-[0.16em] text-accent">
        Start a new conversation
      </p>
    </Link>
  );
}
