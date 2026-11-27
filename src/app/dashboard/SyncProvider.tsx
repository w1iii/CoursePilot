"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { syncErrorMessage } from "./sync-errors";
import { activeJob, useJobs } from "./JobProvider";

export interface SyncResult {
  courses: number;
  tasks: number;
  announcements: number;
  documents: number;
  ragDocuments: number;
  ragChunks: number;
  ragFailures: number;
  ragSkipped: number;
  ragFailureDetails: string[];
  ragSkippedDetails: string[];
  errors: string[];
}

interface SyncState {
  running: boolean;
  result: SyncResult | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface SyncContextValue extends SyncState {
  start: () => Promise<void>;
}

// Keep the legacy key so existing sync timestamps remain available after rebrand.
const STORAGE_KEY = "habi:last-sync";

const initialState: SyncState = {
  running: false,
  result: null,
  error: null,
  startedAt: null,
  finishedAt: null,
};

const SyncContext = createContext<SyncContextValue | null>(null);

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSyncResult(value: unknown): SyncResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;

  return {
    courses: numberOrZero(result.courses),
    tasks: numberOrZero(result.tasks),
    announcements: numberOrZero(result.announcements),
    documents: numberOrZero(result.documents),
    ragDocuments: numberOrZero(result.ragDocuments),
    ragChunks: numberOrZero(result.ragChunks),
    ragFailures: numberOrZero(result.ragFailures),
    ragSkipped: numberOrZero(result.ragSkipped),
    ragFailureDetails: stringArray(result.ragFailureDetails),
    ragSkippedDetails: stringArray(result.ragSkippedDetails),
    errors: stringArray(result.errors),
  };
}

function readStoredState(): Partial<SyncState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const stored = parsed as Record<string, unknown>;

    return {
      result: normalizeSyncResult(stored.result),
      error: typeof stored.error === "string" ? stored.error : null,
      startedAt: typeof stored.startedAt === "string" ? stored.startedAt : null,
      finishedAt: typeof stored.finishedAt === "string" ? stored.finishedAt : null,
    };
  } catch {
    return null;
  }
}

function writeStoredState(state: SyncState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        result: state.result,
        error: state.error,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
      }),
    );
  } catch {
    // The in-memory result still survives client-side navigation.
  }
}

/**
 * Publishes Canvas sync jobs and reflects durable status above dashboard routes.
 * The browser never owns execution; reload/navigation cannot cancel a job.
 */
export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SyncState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const inFlight = useRef(false);
  const pendingJobId = useRef<string | null>(null);
  const router = useRouter();
  const { jobs, refresh } = useJobs();
  const queuedSync = jobs.some((job) => job.kind !== "study_prep" && activeJob(job));
  const latestSync = jobs.find((job) => job.kind !== "study_prep" && !activeJob(job));

  useEffect(() => {
    if (!latestSync?.finished_at) return;
    setState((current) => {
      if (current.running && pendingJobId.current !== latestSync.id) return current;
      if (current.finishedAt && current.finishedAt >= latestSync.finished_at!) return current;
      return {
        running: false, result: normalizeSyncResult(latestSync.result), error: latestSync.error,
        startedAt: latestSync.created_at, finishedAt: latestSync.finished_at,
      };
    });
  }, [latestSync]);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) {
      setState((current) => ({
        ...current,
        result: stored.result ?? null,
        error: stored.error ?? null,
        startedAt: stored.startedAt ?? null,
        finishedAt: stored.finishedAt ?? null,
      }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStoredState(state);
  }, [hydrated, state]);

  const start = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    pendingJobId.current = null;

    const startedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      running: true,
      error: null,
      startedAt,
      finishedAt: null,
    }));

    try {
      const response = await fetch("/api/sync", { method: "POST" });
      if (!response.ok) {
        setState((current) => ({
          ...current,
          running: false,
          error: syncErrorMessage(response.status),
          finishedAt: new Date().toISOString(),
        }));
        return;
      }
      if (response.status === 202) {
        const accepted = await response.json() as { jobId?: unknown };
        if (typeof accepted.jobId !== "string") throw new Error("Sync returned an invalid job");
        pendingJobId.current = accepted.jobId;
        // Keep this request pending until durable completion arrives; clearing
        // it now briefly enables another submission before the next jobs poll.
        refresh();
        return;
      }
      const json = (await response.json()) as unknown;
      const result = normalizeSyncResult(json);
      if (!result) throw new Error("Sync returned an invalid response");

      setState({
        running: false,
        result,
        error: null,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      router.refresh();
    } catch {
      setState((current) => ({
        ...current,
        running: false,
        error: "Sync could not be completed. Please try again.",
        finishedAt: new Date().toISOString(),
      }));
    } finally {
      inFlight.current = false;
    }
  }, [router, refresh]);

  return (
    <SyncContext.Provider value={{ ...state, running: state.running || queuedSync, start }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider");
  }
  return context;
}
