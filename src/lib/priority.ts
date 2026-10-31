export type TaskPriority = "low" | "medium" | "high";

const HEAVY_TYPES = new Set(["exam", "project", "quiz"]);

const URGENT_ANNOUNCEMENT_KEYWORDS = [
  "deadline",
  "due",
  "exam",
  "quiz",
  "postpone",
  "postponed",
  "reschedule",
  "rescheduled",
  "cancel",
  "cancelled",
  "canceled",
  "urgent",
  "required",
  "mandatory",
  "action required",
  "submission",
  "submit",
  "extension",
  "changed",
  "change of schedule",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function bump(priority: TaskPriority): TaskPriority {
  if (priority === "low") return "medium";
  if (priority === "medium") return "high";
  return "high";
}

/**
 * Deterministic task priority so sync never depends on an LLM.
 *
 * Urgency by due date is the main signal; exams, projects, and quizzes get one
 * level of extra weight when they are within two weeks. Tasks without a due
 * date stay at the safe default, `medium`.
 */
export function scoreTaskPriority(input: {
  dueDate: string | null;
  type: string;
  now?: Date;
}): TaskPriority {
  if (!input.dueDate) return "medium";

  const due = new Date(input.dueDate);
  if (Number.isNaN(due.getTime())) return "medium";

  const now = input.now ?? new Date();
  const daysUntil = (due.getTime() - now.getTime()) / DAY_MS;

  let priority: TaskPriority;
  if (daysUntil <= 2) priority = "high";
  else if (daysUntil <= 7) priority = "medium";
  else priority = "low";

  if (daysUntil <= 14 && HEAVY_TYPES.has(input.type.toLowerCase())) {
    priority = bump(priority);
  }

  return priority;
}

/**
 * Deterministic announcement importance in the range 0..1.
 *
 * Deadline/change language raises importance because those posts usually
 * require action; recency adds a small nudge.
 */
export function scoreAnnouncementImportance(input: {
  title: string;
  content: string | null;
  postedAt: string | null;
  now?: Date;
}): number {
  const text = `${input.title} ${input.content ?? ""}`.toLowerCase();
  let score = 0.25;

  const hits = URGENT_ANNOUNCEMENT_KEYWORDS.filter((keyword) => text.includes(keyword));
  score += Math.min(0.45, hits.length * 0.15);

  if (/\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)) {
    score += 0.1;
  }

  if (input.postedAt) {
    const posted = new Date(input.postedAt);
    if (!Number.isNaN(posted.getTime())) {
      const ageDays = ((input.now ?? new Date()).getTime() - posted.getTime()) / DAY_MS;
      if (ageDays <= 3) score += 0.1;
    }
  }

  return Math.min(1, Math.round(score * 100) / 100);
}

/** Announcements that look action-required, used for dashboard sorting. */
export function needsAction(title: string, content: string | null): boolean {
  const text = `${title} ${content ?? ""}`.toLowerCase();
  return URGENT_ANNOUNCEMENT_KEYWORDS.some((keyword) => text.includes(keyword));
}
