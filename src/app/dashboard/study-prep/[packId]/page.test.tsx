// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import StudyPackPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ packId: "pack" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/PaperReveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(() => vi.unstubAllGlobals());

it("shows sessions on the pack page and confirms deletion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetch = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Promise.resolve(new Response("{}", { status: 200 }));
    const value = url.endsWith("/sessions") ? [{ id: "session", status: "paused", score: 0, current_item: 1, last_active_at: "2026-01-01" }] : { title: "Biology", item_count: 5, study_pack_items: [], course: { course_name: "Biology" } };
    return Promise.resolve(new Response(JSON.stringify(value), { status: 200 }));
  });
  vi.stubGlobal("fetch", fetch);
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => { root.render(<StudyPackPage />); });
  expect(container.textContent).toContain("Question 2 of 5");
  expect(container.querySelector('a[href="/dashboard/study-prep/pack/session/session"]')?.textContent).toBe("Resume session");
  const remove = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Delete session")!;
  act(() => remove.click());
  expect(container.querySelector('[role="alertdialog"]')?.textContent).toContain("cannot be undone");
  const confirm = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Delete permanently")!;
  await act(async () => { confirm.click(); });
  expect(fetch).toHaveBeenCalledWith("/api/study-packs/pack/sessions/session", { method: "DELETE" });
  expect(container.textContent).toContain("No sessions yet");
  act(() => root.unmount());
});

it("keeps pack and session controls available after start fails, allowing retry", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let starts = 0;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      starts++;
      return Promise.resolve(new Response(JSON.stringify(starts === 1 ? { error: "unavailable" } : { id: "session" }), { status: starts === 1 ? 503 : 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(url.endsWith("/sessions")
      ? [{ id: "session", status: "paused", current_item: 0 }]
      : { title: "Biology", item_count: 1, study_pack_items: [], course: {} })));
  }));
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<StudyPackPage />));
    const start = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Resume study session"))!;
    await act(async () => start.click());
    expect(container.textContent).toContain("Could not start this study session");
    expect(container.textContent).toContain("Biology");
    expect(container.querySelector('a[href="/dashboard/study-prep/pack/session/session"]')).not.toBeNull();
    expect(start.disabled).toBe(false);
    await act(async () => start.click());
    expect(starts).toBe(2);
    expect(container.textContent).not.toContain("Could not start this study session");
  } finally { act(() => root.unmount()); }
});
