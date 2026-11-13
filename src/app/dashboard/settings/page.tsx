import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

import { defaultCanvasBaseUrl } from "@/lib/canvas";
import { getCanvasStatus } from "@/lib/canvas-account";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/user";
import { cacheUserRead } from "@/lib/cache";
import CanvasConnect from "../CanvasConnect";
import DashboardShell from "../DashboardShell";
import type { Course } from "../types";
import AppearancePreferences from "./AppearancePreferences";
import CourseIndexTable from "./CourseIndexTable";
import SettingsNav from "./SettingsNav";
import SettingsSection, {
  ComingSoonBadge,
  SettingsGroup,
  SettingsRow,
} from "./SettingsSection";
import SyncButton from "../SyncButton";

interface RawCourse {
  id: string;
  course_code: string | null;
  course_name: string;
  instructor: string | null;
  semester: string | null;
  rag_indexed_at: string | null;
  rag_document_count: number | null;
  rag_chunk_count: number | null;
  rag_failure_count: number | null;
  selected_for_rag: boolean;
}

function normalizeName(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function joinedLabel(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function ComingSoonValue({ value }: { value: string }) {
  return <span className="font-label-sm text-label-sm text-text-muted">{value}</span>;
}

function DisabledAction({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      disabled
      className={`inline-flex h-8 items-center rounded-lg border px-2.5 font-label-sm text-label-sm disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-error/30 text-on-error-container"
          : "border-border bg-surface text-on-surface"
      }`}
    >
      {label}
    </button>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const sb = supabaseAdmin();

  const [canvas, coursesResult] = await Promise.all([
    cacheUserRead("canvas-status", user.id, 60, () => getCanvasStatus(user.id)),
    cacheUserRead("settings-courses", user.id, 300, async () => await sb
      .from("courses")
      .select(
        "id, course_code, course_name, instructor, semester, rag_indexed_at, rag_document_count, rag_chunk_count, rag_failure_count, selected_for_rag",
      )
      .eq("user_id", user.id)
      .order("course_name", { ascending: true })
      .limit(100)),
  ]);

  if (coursesResult.error) {
    throw new Error(`Failed to load course index: ${coursesResult.error.message}`);
  }

  const courses: Course[] = ((coursesResult.data ?? []) as RawCourse[]).map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
    instructor: course.instructor,
    semester: course.semester,
    ragIndexedAt: course.rag_indexed_at,
    ragDocumentCount: course.rag_document_count,
    ragChunkCount: course.rag_chunk_count,
    ragFailureCount: course.rag_failure_count,
    selectedForRag: course.selected_for_rag,
  }));

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );

  return (
    <DashboardShell userName={displayName} userEmail={user.email}>
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <div className="mb-space-lg shrink-0 px-1">
            <p className="font-code-tag text-code-tag uppercase tracking-widest text-text-muted">
              Account
            </p>
            <h1 className="font-headline-lg text-headline-lg text-primary-container">Settings</h1>
            <p className="font-body-md text-body-md text-text-muted">
              Manage your account preferences.
            </p>
          </div>

          <SettingsNav />

          <div className="min-h-0 w-full flex-1 overflow-y-auto pb-space-xl">
            <div className="mx-auto w-full max-w-[860px] space-y-space-xl">
              <SettingsGroup label="Connections" tag="Available now">
                <div className="rounded-2xl border border-border bg-surface p-space-lg shadow-sm">
                  <CanvasConnect
                    initialStatus={canvas}
                    defaultBaseUrl={defaultCanvasBaseUrl()}
                    embedded
                  />
                </div>
                <p className="px-1 font-body-sm text-body-sm text-text-muted">
                  Disconnecting Canvas removes your access token but keeps synced courses, tasks,
                  announcements, and indexed study material.
                </p>

                <SettingsSection
                  title="Sync & course index"
                  description="Pull your latest Canvas courses, tasks, and announcements. Course files and pages are indexed for Ask Habi."
                  action={<SyncButton connected={canvas.connected && !canvas.needsReconnect} />}
                >
                  <SettingsRow
                    label="Last token check"
                    helper="Canvas revalidates your token whenever the dashboard loads."
                  >
                    <span className="font-code-tag text-[11px] text-text-muted">
                      {formatTimestamp(canvas.lastValidatedAt)}
                    </span>
                  </SettingsRow>
                  <SettingsRow
                    label="Scheduled sync"
                    helper="Automatic sync runs once a day for connected accounts."
                  >
                    <span className="font-code-tag text-[11px] text-text-muted">Daily · 6:00 AM</span>
                  </SettingsRow>
                  <SettingsRow
                    label="Auto-sync"
                    helper="Per-account sync schedules are not configurable yet."
                    comingSoon
                  >
                    <ComingSoonValue value="Daily" />
                  </SettingsRow>
                  <div className="pt-space-md">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-label-md text-label-md text-on-surface">Course index</p>
                      <span className="font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
                        {courses.length} {courses.length === 1 ? "course" : "courses"}
                      </span>
                    </div>
                    <CourseIndexTable courses={courses} />
                  </div>
                </SettingsSection>
              </SettingsGroup>

              <SettingsGroup label="Workspace" tag="Partly available">
                <SettingsSection
                  title="Dashboard defaults"
                  description="Choose what the task ledger shows when you open the dashboard."
                >
                  <SettingsRow label="Default task filter" comingSoon>
                    <ComingSoonValue value="All tasks" />
                  </SettingsRow>
                  <SettingsRow label="Default course" comingSoon>
                    <ComingSoonValue value="All courses" />
                  </SettingsRow>
                  <SettingsRow
                    label="Hide completed tasks"
                    helper="Completed tasks stay filed on the dashboard."
                    comingSoon
                  >
                    <ComingSoonValue value="On" />
                  </SettingsRow>
                  <SettingsRow label="Due-soon window" comingSoon>
                    <ComingSoonValue value="7 days" />
                  </SettingsRow>
                  <SettingsRow label="Week starts on" comingSoon>
                    <ComingSoonValue value="Sunday" />
                  </SettingsRow>
                </SettingsSection>

                <AppearancePreferences />
              </SettingsGroup>

              <SettingsGroup label="Ask Habi" tag="Coming soon">
                <SettingsSection
                  title="Assistant"
                  description="Tune how Habi answers questions about your courses."
                >
                  <SettingsRow label="Always show citations" comingSoon>
                    <ComingSoonValue value="On" />
                  </SettingsRow>
                  <SettingsRow label="Preferred course for new chats" comingSoon>
                    <ComingSoonValue value="Auto" />
                  </SettingsRow>
                  <SettingsRow label="Answer style" comingSoon>
                    <ComingSoonValue value="Concise" />
                  </SettingsRow>
                  <SettingsRow
                    label="Chat history"
                    helper="Clear saved conversations from the sidebar."
                    comingSoon
                  >
                    <DisabledAction label="Clear chats" />
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title="Notifications"
                  description="Control when Habi nudges you about deadlines and announcements."
                >
                  <SettingsRow label="Deadline reminder" comingSoon>
                    <ComingSoonValue value="Off" />
                  </SettingsRow>
                  <SettingsRow label="Daily digest" comingSoon>
                    <ComingSoonValue value="Off" />
                  </SettingsRow>
                  <SettingsRow label="Deadline moved alerts" comingSoon>
                    <ComingSoonValue value="On" />
                  </SettingsRow>
                  <SettingsRow label="High-priority announcements" comingSoon>
                    <ComingSoonValue value="On" />
                  </SettingsRow>
                  <SettingsRow
                    label="Email notifications"
                    helper="Requires an email delivery service."
                    comingSoon
                  >
                    <ComingSoonValue value="Off" />
                  </SettingsRow>
                </SettingsSection>
              </SettingsGroup>

              <SettingsGroup label="Data & account" tag="Mostly coming soon">
                <SettingsSection
                  title="Data & privacy"
                  description="Your Canvas token is encrypted at rest. Ask Habi prompts are logged without their content."
                >
                  <SettingsRow
                    label="Export my data"
                    helper="Download courses, tasks, announcements, and chats as JSON."
                    comingSoon
                  >
                    <DisabledAction label="Download JSON" />
                  </SettingsRow>
                  <SettingsRow
                    label="Delete synced academic data"
                    helper="Remove Canvas-synced courses, tasks, and announcements from Habi."
                    comingSoon
                  >
                    <DisabledAction label="Delete data" danger />
                  </SettingsRow>
                  <SettingsRow
                    label="Delete account"
                    helper="This removes your profile and every record tied to it."
                    comingSoon
                  >
                    <DisabledAction label="Delete account" danger />
                  </SettingsRow>
                  <p className="py-3 font-body-sm text-body-sm text-text-muted first:pt-0 last:pb-0">
                    Disconnecting Canvas does not delete previously synced data or its search index.
                  </p>
                </SettingsSection>

                <SettingsSection title="Account" description="Your identity and sign-in session.">
                  <div className="flex items-center gap-space-md py-3 first:pt-0 last:pb-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md text-on-secondary-container">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-label-md text-label-md text-on-surface">
                        {displayName}
                      </p>
                      <p className="truncate font-code-tag text-[10px] text-text-muted">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <SettingsRow label="Member since">
                    <span className="font-code-tag text-[11px] text-text-muted">
                      {joinedLabel(user.created_at)}
                    </span>
                  </SettingsRow>
                  <SettingsRow
                    label="Profile"
                    helper="Update your name, email, password, and connected accounts."
                  >
                    <Link
                      href="/dashboard/profile"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                    >
                      Manage profile
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </SettingsRow>
                  <SettingsRow label="Session" helper="Sign out of Habi on this browser.">
                    <SignOutButton redirectUrl="/">
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        Sign out
                      </button>
                    </SignOutButton>
                  </SettingsRow>
                </SettingsSection>
              </SettingsGroup>

              <p className="px-1 pb-space-sm font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
                Habi · settings <ComingSoonBadge /> items are planned, not active controls.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
