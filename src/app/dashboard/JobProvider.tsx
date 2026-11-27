"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type BackgroundJob = {
  id: string; kind: "onboarding" | "sync" | "course_sync" | "study_prep";
  status: "queued" | "running" | "succeeded" | "partial_failure" | "failed";
  progress: string; result: { packId?: string } | null; error: string | null;
  created_at: string; finished_at: string | null; read_at: string | null;
};
const JobContext = createContext<{ jobs: BackgroundJob[]; refresh: () => void; version: number }>({
  jobs: [], refresh: () => {}, version: 0,
});
export const useJobs = () => useContext(JobContext);
export const activeJob = (job: BackgroundJob) => job.status === "queued" || job.status === "running";
const label = (job: BackgroundJob) => job.kind === "study_prep" ? "Study pack" : job.kind === "onboarding" ? "Course setup" : "Canvas sync";

export default function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [version, setVersion] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [dismissError, setDismissError] = useState("");
  const previous = useRef(new Map<string, string>());
  const router = useRouter();
  const refresh = useCallback(() => window.dispatchEvent(new Event("coursepilot:jobs")), []);

  useEffect(() => {
    let disposed = false;
    let loading = false;
    async function load() {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("jobs");
        const next = await response.json() as BackgroundJob[];
        if (disposed) return;
        const completed = next.some((job) => !activeJob(job) && previous.current.get(job.id) !== job.status);
        previous.current = new Map(next.map((job) => [job.id, job.status]));
        setJobs(next);
        setUnavailable(false);
        if (completed) {
          const invalidated = await fetch("/api/jobs", { method: "POST" });
          if (!invalidated.ok) { previous.current = new Map(); throw new Error("refresh"); }
          if (!disposed) { setVersion((value) => value + 1); router.refresh(); }
        }
      } catch { if (!disposed) setUnavailable(true); }
      finally { loading = false; }
    }
    void load();
    const timer = setInterval(() => void load(), 5000);
    const listener = () => void load();
    window.addEventListener("coursepilot:jobs", listener);
    window.addEventListener("focus", listener);
    document.addEventListener("visibilitychange", listener);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("coursepilot:jobs");
    if (channel) channel.onmessage = listener;
    return () => {
      disposed = true; clearInterval(timer); channel?.close();
      window.removeEventListener("coursepilot:jobs", listener);
      window.removeEventListener("focus", listener);
      document.removeEventListener("visibilitychange", listener);
    };
  }, [router]);

  async function dismiss(id: string) {
    setDismissError("");
    try {
      const response = await fetch(`/api/jobs/${id}`, { method: "PATCH" });
      if (!response.ok) throw new Error("dismiss");
      setJobs((current) => current.filter((job) => job.id !== id));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("coursepilot:jobs"); channel.postMessage("refresh"); channel.close();
      }
    } catch { setDismissError("Could not dismiss notification. Please retry."); }
  }
  const running = jobs.filter(activeJob);
  const notices = jobs.filter((job) => !activeJob(job));
  return <JobContext.Provider value={{ jobs, refresh, version }}>
    {children}
    {(running.length > 0 || notices.length > 0 || unavailable) && <aside aria-label="Background work" className="fixed bottom-4 right-4 z-50 max-h-[50vh] w-[min(24rem,calc(100vw-2rem))] space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-4 text-on-surface shadow-lg">
      {unavailable && <p role="status" className="text-sm">Progress unavailable. Queued work continues; reconnect to see results.</p>}
      {dismissError && <p role="alert" className="text-sm">{dismissError}</p>}
      {running.map((job) => <p key={job.id} role="status" className="text-sm"><strong>{label(job)}</strong>: {job.progress}. You can keep browsing.</p>)}
      {notices.map((job) => <div key={job.id} role="status" className="border-t border-border pt-2 text-sm">
        <strong>{label(job)} {job.status === "succeeded" ? "ready" : job.status === "partial_failure" ? "finished with issues" : "failed"}</strong>
        {job.error && <p>{job.error}</p>}
        <div className="mt-2 flex items-center gap-4">
          <Link className="underline" href={job.result?.packId ? `/dashboard/study-prep/${job.result.packId}` : job.kind === "study_prep" ? "/dashboard/study-prep" : "/dashboard/settings"}>
            {job.result?.packId ? "Open pack" : job.kind === "study_prep" ? "Try again" : "Review / resync"}
          </Link>
          <button type="button" className="underline" onClick={() => void dismiss(job.id)}>Dismiss</button>
        </div>
      </div>)}
    </aside>}
  </JobContext.Provider>;
}
