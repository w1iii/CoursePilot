"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-16">
      <div className="rounded-2xl border border-error/30 bg-error-container/50 p-6 shadow-sm">
        <h1 className="font-headline-md text-headline-md text-on-error-container">
          The weave slipped
        </h1>
        <p className="mt-2 font-body-sm text-body-sm text-on-error-container">
          {error.message || "Something went wrong while loading your dashboard."}
        </p>
        {error.digest && (
          <p className="mt-1 font-code-tag text-code-tag text-on-error-container/80">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-dark-text transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-border bg-surface px-4 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            Reload dashboard
          </a>
        </div>
        <p className="mt-4 font-body-sm text-body-sm text-on-error-container/80">
          If this keeps happening, check that the RAG service is reachable and that your Canvas
          connection is still valid.
        </p>
      </div>
    </main>
  );
}
