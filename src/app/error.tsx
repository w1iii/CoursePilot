"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <section role="alert" className="rounded-2xl border border-error/30 bg-error-container/50 p-6">
        <h1 className="font-headline-md text-headline-md text-on-error-container">
          Something went wrong
        </h1>
        <p className="mt-2 font-body-sm text-body-sm text-on-error-container">
          We couldn’t complete that request. Please try again. If this keeps happening, contact support.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-accent px-4 py-2 font-label-md text-label-md text-on-accent transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
