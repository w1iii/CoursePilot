import type { DashboardTask } from "@/app/dashboard/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITY_RANK: Record<DashboardTask["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export type DueTone = "overdue" | "today" | "soon" | "later" | "none";

export interface DueCopy {
  label: string;
  tone: DueTone;
}

export interface DashboardStats {
  open: number;
  dueThisWeek: number;
  high: number;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days from now until a due date. Negative means overdue. */
export function daysUntilDue(
  value: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const due = parseDate(value);
  if (!due) return null;
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

function shortDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Newspaper-friendly copy for a task deadline. */
export function dueCopy(
  value: string | null | undefined,
  now: Date = new Date(),
): DueCopy {
  const days = daysUntilDue(value, now);
  if (days === null) return { label: "No due date", tone: "none" };

  if (days < 0) {
    const count = Math.abs(days);
    return {
      label: `Overdue by ${count} ${count === 1 ? "day" : "days"}`,
      tone: "overdue",
    };
  }
  if (days === 0) return { label: "Due today", tone: "today" };
  if (days === 1) return { label: "Due tomorrow", tone: "today" };
  if (days <= 6) return { label: `Due in ${days} days`, tone: "soon" };
  return { label: `Due ${shortDate(value ?? "")}`, tone: "later" };
}

export function isOpen(task: DashboardTask): boolean {
  return task.status !== "completed";
}

export function computeStats(
  tasks: DashboardTask[],
  now: Date = new Date(),
): DashboardStats {
  const open = tasks.filter(isOpen);
  const dueThisWeek = open.filter((task) => {
    const days = daysUntilDue(task.due_date, now);
    return days !== null && days >= 0 && days <= 6;
  });

  return {
    open: open.length,
    dueThisWeek: dueThisWeek.length,
    high: open.filter((task) => task.priority === "high").length,
  };
}

/** Priority first, then earliest due date, then title. */
export function sortByPriority(tasks: DashboardTask[]): DashboardTask[] {
  return [...tasks].sort((a, b) => {
    const priorityDifference = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (priorityDifference !== 0) return priorityDifference;

    const aDue = parseDate(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = parseDate(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return a.title.localeCompare(b.title);
  });
}

export function topPriorities(tasks: DashboardTask[], limit = 5): DashboardTask[] {
  return sortByPriority(tasks.filter(isOpen)).slice(0, limit);
}

export function upcomingTasks(
  tasks: DashboardTask[],
  now: Date = new Date(),
): DashboardTask[] {
  return tasks.filter((task) => {
    const days = daysUntilDue(task.due_date, now);
    return isOpen(task) && days !== null && days >= 0;
  });
}

/** Earliest upcoming dated open task. */
export function nextUp(
  tasks: DashboardTask[],
  now: Date = new Date(),
): DashboardTask | null {
  const open = tasks.filter(isOpen);
  const dated = open
    .filter((task) => {
      const days = daysUntilDue(task.due_date, now);
      return days !== null && days >= 0;
    })
    .sort((a, b) => {
      const aDue = parseDate(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = parseDate(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });

  return dated[0] ?? null;
}

export function openTasksByCourse(tasks: DashboardTask[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    counts.set(task.course_id, (counts.get(task.course_id) ?? 0) + 1);
  }
  return counts;
}

const ACTION_WORDS =
  /\b(due|deadline|exam|quiz|submit|submission|schedule|reschedul|postpon|change|cancel|required|mandatory|reminder|extension)\w*/i;

const GREETING = /^(hi|hello|hey|dear|good (morning|afternoon|evening)|magandang (araw|umaga|hapon|gabi))\b[^.!?\n]{0,60}[,.:!?-]\s*/i;

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const clipped = (lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice)
    .replace(/[.,;:!?-]+$/, "")
    .trim();

  return `${clipped}…`;
}

/**
 * Extractive one-line summary for the announcement feed.
 *
 * Keeps the dashboard readable without a model call: strip greetings, prefer
 * the first action-bearing sentence, then clip at a word boundary.
 */
export function summarizeAnnouncement(
  content: string | null | undefined,
  maxChars = 130,
): string {
  if (!content) return "";

  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const withoutGreeting = normalized.replace(GREETING, "").trim();
  const body = withoutGreeting || normalized;

  const sentences =
    body
      .match(/[^.!?]+[.!?]*/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [body];

  const actionSentence = sentences.slice(0, 3).find((sentence) => ACTION_WORDS.test(sentence));
  const summary = actionSentence ?? sentences[0] ?? body;

  return clip(summary, maxChars);
}
