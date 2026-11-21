// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskLedger from "./TaskLedger";
import type { DashboardTask } from "./types";

const tasks: DashboardTask[] = [
  { id: "1", course_id: "c", canvas_task_id: 1, title: "Essay", description: "Write an essay", type: "assignment", due_date: null, priority: "high", status: "pending", is_manual: false, notes: "Read chapter one", courses: { course_name: "History", course_code: "HIST" } },
  { id: "2", course_id: "c", canvas_task_id: null, title: "Review", description: null, type: "task", due_date: null, priority: "low", status: "pending", is_manual: true, notes: null },
];

let container: HTMLDivElement;
let root: Root;
const onToggle = vi.fn(async () => {});
const onPriority = vi.fn(async () => {});

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<TaskLedger tasks={tasks} courses={[]} today="2026-11-21" error={null} setError={vi.fn()} onCreate={vi.fn(async () => {})} onToggle={onToggle} onPriority={onPriority} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === label || item.getAttribute("aria-label") === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => button.click());
}

describe("academic task details", () => {
  it("opens each task and displays its details, then closes", () => {
    clickButton("Essay");
    let dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain("Write an essay");
    expect(dialog.textContent).toContain("Read chapter one");
    expect(dialog.textContent).toContain("HIST");
    expect(dialog.textContent).toContain("high");
    clickButton("Close task details");
    expect(container.querySelector("dialog")).toBeNull();
    clickButton("Review");
    dialog = container.querySelector("dialog")!;
    expect(dialog.textContent).toContain("No description provided.");
    act(() => dialog.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("keeps completion and priority controls independent", () => {
    clickButton("Mark Essay complete");
    expect(onToggle).toHaveBeenCalledWith(tasks[0]);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Priority for Essay"]')!;
    act(() => { select.value = "low"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(onPriority).toHaveBeenCalledWith("1", "low");
    expect(container.querySelector("dialog")).toBeNull();
  });
});
