// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import StudyPrepHome from "./study-prep-home";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), version: 0 }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../JobProvider", () => ({ useJobs: () => ({ refresh: mocks.refresh, version: mocks.version }) }));
vi.mock("@/components/PaperReveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => { vi.clearAllMocks(); mocks.version = 0; });

it("requires indexed modules and limits selection to two", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const data = url === "/api/study-prep/courses" ? [{ id: "course", course_name: "Biology", course_code: null, rag_indexed_at: "2026-01-01" }]
      : url === "/api/study-packs" ? []
      : { modules: [{ id: 1, name: "Cells", chunks: 1 }, { id: 2, name: "Plants", chunks: 1 }, { id: 3, name: "Animals", chunks: 1 }, { id: 4, name: "Empty", chunks: 0 }] };
    return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
  }));
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => { root.render(<StudyPrepHome />); });
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  expect(inputs).toHaveLength(4);
  const generate = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Generate study pack"))!;
  expect(generate.disabled).toBe(true);
  expect(inputs[3].disabled).toBe(true);
  act(() => inputs[0].click());
  expect(generate.disabled).toBe(false);
  act(() => inputs[1].click());
  expect(inputs[2].disabled).toBe(true);
  act(() => inputs[0].click());
  expect(inputs[2].disabled).toBe(false);
  expect(container.querySelector<HTMLInputElement>('[aria-label="Question count"]')?.max).toBe("15");
  expect(container.textContent).not.toContain("Entire course");
  expect(container.querySelector("textarea")?.maxLength).toBe(300);
  act(() => root.unmount());
});

it("queues selected modules and focus, keeps the form usable, and reloads history after completion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetchMock = vi.fn((url: string, options?: RequestInit) => {
    const data = options?.method === "POST" ? { queued: true, jobId: "job" }
      : url === "/api/study-prep/courses" ? [{ id: "course", course_name: "Biology", course_code: null, rag_indexed_at: "2026-01-01" }]
      : url === "/api/study-packs" ? []
      : { modules: [{ id: 1, name: "Cells", chunks: 1 }, { id: 2, name: "Plants", chunks: 1 }] };
    return Promise.resolve(new Response(JSON.stringify(data), { status: options?.method === "POST" ? 202 : 200 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<StudyPrepHome />));
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    act(() => { inputs[0].click(); inputs[1].click(); });
    const textarea = container.querySelector("textarea")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "  key terms  ");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const generate = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Generate study pack"))!;
    await act(async () => generate.click());
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({ moduleIds: [1, 2], topic: "key terms", count: 10 });
    expect(container.textContent).toContain("Study pack queued. Keep browsing");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(generate.disabled).toBe(false);
    const historyReads = () => fetchMock.mock.calls.filter(([url, options]) => url === "/api/study-packs" && !options?.method).length;
    expect(historyReads()).toBe(1);
    mocks.version++;
    await act(async () => root.render(<StudyPrepHome />));
    expect(historyReads()).toBe(2);
    expect(inputs[0].checked).toBe(true);
    expect(inputs[1].checked).toBe(true);
  } finally {
    act(() => root.unmount());
  }
});
