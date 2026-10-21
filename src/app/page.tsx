import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">CoursePilot</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        AI-powered academic dashboard for Canvas LMS. Sync your courses, track deadlines, and ask
        questions grounded in your own Canvas data.
      </p>
      <div className="flex gap-4">
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="rounded-full bg-zinc-900 px-6 py-3 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-300"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border border-zinc-300 px-6 py-3 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Create account
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-900 px-6 py-3 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-300"
          >
            Open dashboard
          </Link>
        </Show>
      </div>
    </main>
  );
}
