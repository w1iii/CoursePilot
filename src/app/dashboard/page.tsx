import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { getCanvasStatus } from "@/lib/canvas-account";
import { defaultCanvasBaseUrl } from "@/lib/canvas";
import DashboardShell from "./DashboardShell";
import CanvasConnect from "./CanvasConnect";
import SyncButton from "./SyncButton";
import TaskBoard, { type DashboardTask } from "./TaskBoard";

export default async function DashboardPage() {
  const user = await requireUser();
  const sb = supabaseAdmin();

  const { data: courses, error: coursesError } = await sb
    .from("courses")
    .select("id, course_code, course_name, instructor")
    .eq("user_id", user.id)
    .limit(50);

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  let tasks: unknown[] = [];
  if ((courses ?? []).length > 0) {
    const taskResult = await sb
      .from("academic_tasks")
      .select("id, course_id, canvas_task_id, title, description, type, due_date, priority, status, is_manual, notes, courses(course_name, course_code)")
      .in("course_id", (courses ?? []).map((course) => course.id))
      .is("removed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50);
    if (taskResult.error) throw new Error(`Failed to load tasks: ${taskResult.error.message}`);
    tasks = taskResult.data ?? [];
  }

  const courseOptions = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
  }));

  function normalizeName(value: string): string {
    if (value !== value.toUpperCase()) return value;
    return value
      .toLowerCase()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );
  const firstName = displayName.split(/\s+/)[0];
  const greetingName = firstName;
  const canvasStatus = await getCanvasStatus(user.id);
  return (
    <DashboardShell
      userName={greetingName}
      userEmail={user.email}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-mesh-canvas absolute -inset-[30%] opacity-60" />
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-space-2xl bg-background px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <div className="grid gap-space-lg lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
            <TaskBoard initialTasks={(tasks ?? []) as DashboardTask[]} courses={courseOptions} />
            <div className="space-y-space-lg">
              <CanvasConnect initialStatus={canvasStatus} defaultBaseUrl={defaultCanvasBaseUrl()} />
              <section className="rounded-2xl border border-border bg-surface p-space-lg shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-surface-tint">sync</span>
                    <h2 className="font-headline-sm text-headline-sm text-primary-container">Canvas sync</h2>
                  </div>
                  <SyncButton connected={canvasStatus.connected && !canvasStatus.needsReconnect} />
                </div>
                <p className="mt-2 font-body-sm text-body-sm text-text-muted">
                  Sync keeps your dashboard tasks and course material index current.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
