// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import StudyPrepHome from "./study-prep-home";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/PaperReveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(() => vi.unstubAllGlobals());

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
