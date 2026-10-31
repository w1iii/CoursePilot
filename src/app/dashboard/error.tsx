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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
        <h1 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Dashboard could not load
        </h1>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error.message || "Something went wrong while loading your dashboard."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:text-red-200"
          >
            Reload dashboard
          </a>
        </div>
        <p className="mt-4 text-xs text-red-700/80 dark:text-red-300/80">
          If this keeps happening, check that the RAG service is reachable and that your Canvas
          connection is still valid.
        </p>
      </div>
    </main>
  );
}
