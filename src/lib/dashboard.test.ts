import { describe, expect, it } from "vitest";

import {
  computeStats,
  daysUntilDue,
  dueCopy,
  nextUp,
  openTasksByCourse,
  summarizeAnnouncement,
  topPriorities,
  upcomingTasks,
} from "@/lib/dashboard";
import type { DashboardTask } from "@/app/dashboard/types";

const now = new Date(2026, 10, 5, 12, 0, 0);

function at(days: number, hour = 9): string {
  return new Date(2026, 10, 5 + days, hour).toISOString();
}

function task(overrides: Partial<DashboardTask> & Pick<DashboardTask, "id" | "title">): DashboardTask {
  const base: DashboardTask = {
    id: overrides.id,
    course_id: "course-1",
    canvas_task_id: null,
    title: overrides.title,
    description: null,
    type: "assignment",
    due_date: null,
    priority: "medium",
    status: "pending",
    is_manual: false,
    notes: null,
    courses: null,
  };

  return { ...base, ...overrides };
}

describe("daysUntilDue", () => {
  it("compares calendar days", () => {
    expect(daysUntilDue(at(0, 23), now)).toBe(0);
    expect(daysUntilDue(at(1, 1), now)).toBe(1);
    expect(daysUntilDue(at(-2), now)).toBe(-2);
    expect(daysUntilDue(null, now)).toBeNull();
  });
});

describe("dueCopy", () => {
  it("describes overdue, today, tomorrow, and this week", () => {
    expect(dueCopy(at(-1), now)).toEqual({
      label: "Overdue by 1 day",
      tone: "overdue",
    });
    expect(dueCopy(at(0), now)).toEqual({ label: "Due today", tone: "today" });
    expect(dueCopy(at(1), now)).toEqual({ label: "Due tomorrow", tone: "today" });
    expect(dueCopy(at(4), now)).toEqual({ label: "Due in 4 days", tone: "soon" });
    expect(dueCopy(null, now)).toEqual({ label: "No due date", tone: "none" });
  });

  it("falls back to a short date for later work", () => {
    const copy = dueCopy(at(10), now);
    expect(copy.tone).toBe("later");
    expect(copy.label).toMatch(/Nov/);
  });
});

describe("computeStats", () => {
  it("counts open, due-this-week, and high-priority tasks", () => {
    const tasks = [
      task({ id: "1", title: "Lab", due_date: at(1), priority: "high" }),
      task({ id: "2", title: "Reading", due_date: at(5) }),
      task({ id: "3", title: "Later", due_date: at(12), priority: "high" }),
      task({ id: "4", title: "Today", due_date: at(0) }),
      task({ id: "5", title: "Done", due_date: at(1), status: "completed" }),
    ];

    expect(computeStats(tasks, now)).toEqual({
      open: 4,
      dueThisWeek: 3,
      high: 2,
    });
  });
});

describe("topPriorities", () => {
  it("orders by priority then due date and drops completed work", () => {
    const tasks = [
      task({ id: "low", title: "Low", priority: "low", due_date: at(1) }),
      task({ id: "high-late", title: "High late", priority: "high", due_date: at(3) }),
      task({ id: "high-soon", title: "High soon", priority: "high", due_date: at(1) }),
      task({ id: "done", title: "Done", priority: "high", status: "completed" }),
      task({ id: "undated", title: "Undated", priority: "high", due_date: null }),
    ];

    expect(topPriorities(tasks).map((item) => item.id)).toEqual([
      "high-soon",
      "high-late",
      "undated",
      "low",
    ]);
  });
});

describe("upcomingTasks", () => {
  it("excludes overdue, undated, and completed tasks", () => {
    const tasks = [
      task({ id: "upcoming", title: "Upcoming", due_date: at(1) }),
      task({ id: "overdue", title: "Overdue", due_date: at(-1) }),
      task({ id: "undated", title: "Undated" }),
      task({ id: "done", title: "Done", due_date: at(1), status: "completed" }),
    ];

    expect(upcomingTasks(tasks, now).map((item) => item.id)).toEqual(["upcoming"]);
  });
});

describe("nextUp", () => {
  it("picks the earliest upcoming dated open task", () => {
    const tasks = [
      task({ id: "later", title: "Later", due_date: at(4) }),
      task({ id: "overdue", title: "Overdue", due_date: at(-1) }),
      task({ id: "undated", title: "Undated" }),
    ];

    expect(nextUp(tasks, now)?.id).toBe("later");
  });

  it("returns null when no upcoming task exists", () => {
    expect(
      nextUp(
        [task({ id: "overdue", title: "Overdue", due_date: at(-1) }), task({ id: "undated", title: "Undated" })],
        now,
      ),
    ).toBeNull();
  });

  it("returns null when nothing is open", () => {
    expect(nextUp([task({ id: "done", title: "Done", status: "completed" })], now)).toBeNull();
  });
});

describe("openTasksByCourse", () => {
  it("counts only open tasks per course", () => {
    const counts = openTasksByCourse([
      task({ id: "1", title: "A", course_id: "c1" }),
      task({ id: "2", title: "B", course_id: "c1", status: "completed" }),
      task({ id: "3", title: "C", course_id: "c2" }),
    ]);

    expect(counts.get("c1")).toBe(1);
    expect(counts.get("c2")).toBe(1);
  });
});

describe("summarizeAnnouncement", () => {
  it("strips greetings and prefers the action sentence", () => {
    const summary = summarizeAnnouncement(
      "Hi everyone! Welcome to week 4. The final project deadline moved to 12 November. Office hours are on Friday.",
    );

    expect(summary).toBe("The final project deadline moved to 12 November.");
  });

  it("falls back to the first sentence when nothing is actionable", () => {
    const summary = summarizeAnnouncement("The library is open until 9pm. Bring your student ID.");
    expect(summary).toBe("The library is open until 9pm.");
  });

  it("clips long text at a word boundary", () => {
    const summary = summarizeAnnouncement(
      "This is a very long announcement without punctuation that keeps going and going and should be shortened so the dashboard stays easy to scan and read at a glance without overwhelming the student with a wall of text",
    );

    expect(summary.endsWith("…")).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(131);
    expect(summary).not.toMatch(/\s…$/);
  });

  it("normalizes whitespace and handles empty content", () => {
    expect(summarizeAnnouncement("Line   one\n\ttwo.")).toBe("Line one two.");
    expect(summarizeAnnouncement(null)).toBe("");
    expect(summarizeAnnouncement("   ")).toBe("");
  });
});
