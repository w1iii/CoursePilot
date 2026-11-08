"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
 * Owns the Canvas sync request above the dashboard routes.
 *
 * The provider stays mounted while the user moves between dashboard pages, so
 * a sync started on one page keeps running and its result is available when
 * they return. Completed results are also cached in localStorage.
 */
export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SyncState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const inFlight = useRef(false);
  const router = useRouter();

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
      const json = (await response.json()) as unknown;
      if (!response.ok) {
        const message =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : "Sync failed";
        throw new Error(message);
      }
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
    } catch (err) {
      setState((current) => ({
        ...current,
        running: false,
        error: (err as Error).message,
        finishedAt: new Date().toISOString(),
      }));
    } finally {
      inFlight.current = false;
    }
  }, [router]);

  return (
    <SyncContext.Provider value={{ ...state, start }}>{children}</SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider");
  }
  return context;
}
