import { describe, expect, it } from "vitest";

import {
  needsAction,
  scoreAnnouncementImportance,
  scoreTaskPriority,
} from "@/lib/priority";

const now = new Date("2026-10-31T12:00:00.000Z");

function dueIn(days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("scoreTaskPriority", () => {
  it("marks work due within two days as high", () => {
    expect(scoreTaskPriority({ dueDate: dueIn(1), type: "reading", now })).toBe("high");
    expect(scoreTaskPriority({ dueDate: dueIn(-1), type: "assignment", now })).toBe("high");
  });

  it("marks work due this week as medium", () => {
    expect(scoreTaskPriority({ dueDate: dueIn(5), type: "assignment", now })).toBe("medium");
  });

  it("marks later work as low", () => {
    expect(scoreTaskPriority({ dueDate: dueIn(30), type: "reading", now })).toBe("low");
  });

  it("boosts exams and projects in the next two weeks", () => {
    expect(scoreTaskPriority({ dueDate: dueIn(12), type: "exam", now })).toBe("medium");
    expect(scoreTaskPriority({ dueDate: dueIn(6), type: "project", now })).toBe("high");
  });

  it("defaults to medium without a usable due date", () => {
    expect(scoreTaskPriority({ dueDate: null, type: "exam", now })).toBe("medium");
    expect(scoreTaskPriority({ dueDate: "not-a-date", type: "exam", now })).toBe("medium");
  });
});

describe("scoreAnnouncementImportance", () => {
  it("ranks deadline and change posts above general notices", () => {
    const urgent = scoreAnnouncementImportance({
      title: "Submission deadline moved",
      content: "The final project is due on 12 November. Rescheduled from October.",
      postedAt: dueIn(-1),
      now,
    });
    const general = scoreAnnouncementImportance({
      title: "Welcome to the course",
      content: "Say hello in the discussion board.",
      postedAt: dueIn(-20),
      now,
    });

    expect(urgent).toBeGreaterThan(general);
    expect(urgent).toBeLessThanOrEqual(1);
    expect(general).toBeGreaterThanOrEqual(0);
  });

  it("gives recent posts a small boost", () => {
    const base = { title: "Week 4 notes", content: null };

    const recent = scoreAnnouncementImportance({ ...base, postedAt: dueIn(-1), now });
    const old = scoreAnnouncementImportance({ ...base, postedAt: dueIn(-30), now });

    expect(recent).toBeGreaterThan(old);
  });

  it("flags action-required language", () => {
    expect(needsAction("Exam schedule changed", null)).toBe(true);
    expect(needsAction("Office hours", "Drop by if you like")).toBe(false);
  });
});
