// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudySessionPage from "./page";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ packId: "pack", sessionId: "session" }), useRouter: () => ({ push: mocks.push }) }));
vi.mock("animejs", () => ({ animate: vi.fn(), createScope: () => ({ add: () => ({ revert: vi.fn() }) }) }));

const item = { id: "item", item_type: "flashcard", question: "What is ATP?", answer: "An energy carrier", explanation: "Course notes", item_order: 0, citations: [] };
const pack = { title: "Cells", study_pack_items: [item] };
const session = { id: "session", pack_id: "pack", current_item: 0, status: "in_progress", score: 0, study_attempts: [] };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((element) => element.textContent?.includes(text))!;
const mount = async () => { await act(async () => root.render(<StudySessionPage />)); };

describe("recoverable study session", () => {
  it("preserves question and revealed answer on save failure, then retries", async () => {
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/attempts")) return Promise.resolve(++attempts === 1 ? json({}, 503) : json({ is_correct: true }));
      if (init?.method === "PATCH") return Promise.resolve(json({ ...session, status: "completed", score: 1 }));
      return Promise.resolve(json(url.includes("/study-packs/") ? pack : session));
    }));
    await mount();
    act(() => button("Reveal answer").click());
    expect(button("Finish session").disabled).toBe(true);
    await act(async () => button("I got it").click());
    expect(container.textContent).toContain("Could not save your answer");
    expect(container.textContent).toContain(item.question);
    expect(container.textContent).toContain(item.answer);
    expect(button("Finish session").disabled).toBe(true);
    await act(async () => button("Retry saving").click());
    expect(container.textContent).not.toContain("Could not save your answer");
    expect(button("Finish session").disabled).toBe(false);
    await act(async () => button("Finish session").click());
    expect(container.textContent).toContain("Study complete");
    expect(container.textContent).toContain("1/1");
  });
  it("restores persisted attempts and score after refresh", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(json(url.includes("/study-packs/") ? pack : {
      ...session, status: "paused", study_attempts: [{ item_id: "item", answer: item.answer, is_correct: true }],
    }))));
    await mount();
    expect(container.textContent).toContain("Marked correct");
    expect(button("I got it")).toBeUndefined();
    expect(button("Finish session").disabled).toBe(false);
  });
  it("blocks completion and pause while an answer write is pending", async () => {
    let resolveSave!: (response: Response) => void;
    const fetch = vi.fn((url: string) => url.endsWith("/attempts")
      ? new Promise<Response>((resolve) => { resolveSave = resolve; })
      : Promise.resolve(json(url.includes("/study-packs/") ? pack : session)));
    vi.stubGlobal("fetch", fetch);
    await mount();
    act(() => button("Reveal answer").click());
    await act(async () => button("I got it").click());
    expect(button("Finish session").disabled).toBe(true);
    expect(button("Pause and return").disabled).toBe(true);
    expect(button("Review again").disabled).toBe(true);
    await act(async () => resolveSave(json({ is_correct: true })));
    expect(button("Finish session").disabled).toBe(false);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/attempts"))).toHaveLength(1);
  });
  it("offers retry on load failure and restores the session", async () => {
    let fail = true;
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(fail ? json({}, 503) : json(url.includes("/study-packs/") ? pack : session))));
    await mount();
    expect(container.textContent).toContain("Your saved progress is preserved");
    fail = false;
    await act(async () => button("Retry loading session").click());
    expect(container.textContent).toContain(item.question);
  });
  it("rejects a session belonging to a different pack", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(json(url.includes("/study-packs/") ? pack : { ...session, pack_id: "other-pack" }))));
    await mount();
    expect(container.textContent).toContain("Could not load this study session");
    expect(container.textContent).not.toContain(item.question);
  });
  it("resumes legacy skipped questions without losing later saved answers", async () => {
    const laterItem = { ...item, id: "later", question: "Later question", item_order: 1 };
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/attempts")) return Promise.resolve(json({ answer: item.answer, is_correct: true }));
      if (init?.method === "PATCH") return Promise.resolve(json({ ...session, current_item: 1 }));
      return Promise.resolve(json(url.includes("/study-packs/") ? { ...pack, study_pack_items: [item, laterItem] }
        : { ...session, current_item: 1, study_attempts: [{ item_id: "later", answer: laterItem.answer, is_correct: true }] }));
    }));
    await mount();
    expect(container.textContent).toContain(item.question);
    expect(container.textContent).toContain("Question 1");
    act(() => button("Reveal answer").click());
    await act(async () => button("I got it").click());
    await act(async () => button("Next question").click());
    expect(container.textContent).toContain("Later question");
    expect(container.textContent).toContain("Marked correct");
    expect(button("Finish session").disabled).toBe(false);
  });
  it("clears stale retry when quiz choice changes and uses the server grade", async () => {
    const quiz = { ...item, item_type: "multiple_choice", options: ["A", "B", "C", "D"], correct_option: 1 };
    let saves = 0;
    const fetch = vi.fn((url: string) => {
      if (url.endsWith("/attempts")) return Promise.resolve(++saves === 1 ? json({}, 503) : json({ is_correct: false }));
      return Promise.resolve(json(url.includes("/study-packs/") ? { ...pack, study_pack_items: [quiz] } : session));
    });
    vi.stubGlobal("fetch", fetch);
    await mount();
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    act(() => radios[0].click());
    await act(async () => button("Check answer").click());
    expect(button("Retry saving")).toBeDefined();
    act(() => radios[1].click());
    expect(button("Retry saving")).toBeUndefined();
    await act(async () => button("Check answer").click());
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/attempts"))).toHaveLength(2);
    expect(container.textContent).toContain("Marked to review");
  });
});
