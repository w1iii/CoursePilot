export type FeatureStatus = "available" | "partial" | "coming-soon";

export interface ProductFeature {
  title: string;
  description: string;
  detail: string;
  icon: string;
  detailIcon: string;
  iconWrap: string;
  edge: string;
  iconText: string;
  status: FeatureStatus;
}

export const PRODUCT_FEATURES: ProductFeature[] = [
  {
    title: "Deadline Tracking",
    description: "Cross-course synchronization maps every Canvas assignment, quiz, and discussion prompt against one another so you never miss an overlapping crunch — and flags every due date that quietly moved.",
    detail: "Sync interval: real-time webhooks",
    icon: "timeline",
    detailIcon: "done_all",
    iconWrap: "bg-surface-container-high",
    edge: "bg-primary-container",
    iconText: "text-primary-container",
    status: "available",
  },
  {
    title: "Module Summaries",
    description: "Lengthy professor announcements and 60-page reading PDFs distilled into 3-minute synthesis briefs with actionable takeaway bullets.",
    detail: "Average reading time saved: 4.8 hrs/wk",
    icon: "article",
    detailIcon: "speed",
    iconWrap: "bg-secondary-container",
    edge: "bg-surface-tint",
    iconText: "text-primary-container",
    status: "partial",
  },
  {
    title: "Study Plans",
    description: "Dynamic, elastic pacing that automatically reshapes your calendar when life happens, professors shift dates, or you need an unplanned rest day.",
    detail: "Auto-rebalancing upon date changes",
    icon: "calendar_today",
    detailIcon: "auto_mode",
    iconWrap: "bg-surface-container",
    edge: "bg-tertiary-fixed-dim",
    iconText: "text-tertiary",
    status: "coming-soon",
  },
  {
    title: "Quiz & Exam Prep",
    description: "Instant flashcards, recall prompts, and practice quizzes synthesized directly from your professor’s uploaded lecture slides and past syllabi.",
    detail: "Spaced repetition study plan",
    icon: "quiz",
    detailIcon: "psychology",
    iconWrap: "bg-secondary-fixed",
    edge: "bg-primary-hover",
    iconText: "text-primary-container",
    status: "partial",
  },
];

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  available: "Available",
  partial: "Partially available",
  "coming-soon": "Coming soon",
};
