// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobProvider, { type BackgroundJob, useJobs } from "./JobProvider";
import SyncProvider, { useSync } from "./SyncProvider";
import { SESSION_EXPIRED } from "./sync-errors";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
let root: Root;
let container: HTMLDivElement;
let jobs: BackgroundJob[];
let syncStatus: number;
let dismissStatus: number;
let invalidationStatus: number;
let unavailable: boolean;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const job = (overrides: Partial<BackgroundJob> = {}): BackgroundJob => ({
  id: "job", kind: "study_prep", status: "running", progress: "Generating",
  created_at: "2026-11-27T00:00:00Z", finished_at: null, read_at: null,
  result: null, error: null, ...overrides,
});
function Probe({ page = "first" }: { page?: string }) {
  const { version } = useJobs();
  const sync = useSync();
  return <div>
    <span>{page}</span><span data-version>{version}</span>
    <span data-sync>{sync.running ? "running" : "idle"}</span>
    {sync.error && <span data-error>{sync.error}</span>}
    <button onClick={() => void sync.start()}>Start sync</button>
  </div>;
}
async function render(page = "first") {
  await act(async () => root.render(<JobProvider><SyncProvider><Probe page={page} /></SyncProvider></JobProvider>));
}
async function poll() {
  await act(async () => { window.dispatchEvent(new Event("focus")); });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  localStorage.clear();
  jobs = [];
  syncStatus = 202;
  dismissStatus = 200;
  invalidationStatus = 200;
  unavailable = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/sync") return json({ queued: true, jobId: "sync" }, syncStatus);
    if (options?.method === "PATCH") return json({}, dismissStatus);
    if (options?.method === "POST") return json({}, invalidationStatus);
    if (unavailable) throw new Error("offline");
    return json(jobs);
  }));
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("dashboard background work", () => {
  it("keeps work visible across navigation, refreshes once on completion and links the pack", async () => {
    jobs = [job()];
    await render();
    expect(container.textContent).toContain("Generating. You can keep browsing.");
    await render("second");
    expect(container.textContent).toContain("second");
    expect(container.textContent).toContain("Generating");
    jobs = [job({ status: "succeeded", result: { packId: "pack" }, finished_at: "2026-11-27T01:00:00Z" })];
    await poll();
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/dashboard/study-prep/pack");
    expect(container.querySelector("[data-version]")?.textContent).toBe("1");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await poll();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
  it("retries cache invalidation rather than silently losing a completion refresh", async () => {
    invalidationStatus = 500;
    jobs = [job({ status: "succeeded" })];
    await render();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Progress unavailable");
    invalidationStatus = 200;
    await poll();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
  it("renders failures and partial failures and persists dismissal only after success", async () => {
    jobs = [job({ status: "failed", error: "Try another module" }), job({ id: "partial", kind: "sync", status: "partial_failure" })];
    await render();
    expect(container.textContent).toContain("Try another module");
    expect(container.textContent).toContain("Canvas sync finished with issues");
    dismissStatus = 500;
    const dismiss = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Dismiss")!;
    await act(async () => dismiss.click());
    expect(container.textContent).toContain("Could not dismiss notification");
    dismissStatus = 200;
    await act(async () => dismiss.click());
    expect(container.textContent).not.toContain("Try another module");
    expect(fetch).toHaveBeenCalledWith("/api/jobs/job", { method: "PATCH" });
  });
  it("reloads notifications when another tab broadcasts a dismissal", async () => {
    const channel = { onmessage: null as (() => void) | null, close: vi.fn(), postMessage: vi.fn() };
    vi.stubGlobal("BroadcastChannel", vi.fn(function () { return channel; }));
    jobs = [job({ status: "succeeded" })];
    await render();
    expect(container.textContent).toContain("Study pack ready");
    jobs = [];
    await act(async () => channel.onmessage?.());
    expect(container.textContent).not.toContain("Study pack ready");
    await act(async () => root.unmount());
    expect(channel.close).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });
  it("shows unavailable status, resumes polling and cleans up on unmount", async () => {
    unavailable = true;
    await render();
    expect(container.textContent).toContain("Queued work continues");
    unavailable = false;
    jobs = [job()];
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(container.textContent).not.toContain("Progress unavailable");
    await act(async () => root.unmount());
    const calls = vi.mocked(fetch).mock.calls.length;
    await poll();
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    expect(vi.mocked(fetch).mock.calls).toHaveLength(calls);
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });
  it("keeps a submitted sync pending until completion and restores active state on remount", async () => {
    await render();
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("[data-sync]")?.textContent).toBe("running");
    jobs = [job({ id: "sync", kind: "sync", created_at: new Date().toISOString() })];
    await poll();
    await act(async () => root.unmount());
    root = createRoot(container);
    await render();
    expect(container.querySelector("[data-sync]")?.textContent).toBe("running");
    jobs = [job({ id: "sync", kind: "sync", status: "succeeded", finished_at: new Date().toISOString() })];
    await poll();
    expect(container.querySelector("[data-sync]")?.textContent).toBe("idle");
  });
  it("does not confuse older completion notices with the newly accepted sync", async () => {
    jobs = [job({ id: "old", kind: "sync", status: "succeeded", finished_at: "2026-11-27T01:00:00Z" })];
    await render();
    await act(async () => container.querySelector("button")!.click());
    await poll();
    expect(container.querySelector("[data-sync]")?.textContent).toBe("running");
    jobs = [job({ id: "sync", kind: "sync", status: "succeeded", finished_at: new Date().toISOString() })];
    await poll();
    expect(container.querySelector("[data-sync]")?.textContent).toBe("idle");
  });
  it("preserves friendly expired-session handling", async () => {
    syncStatus = 401;
    await render();
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("[data-error]")?.textContent).toBe(SESSION_EXPIRED);
    expect(container.querySelector("[data-sync]")?.textContent).toBe("idle");
  });
});
