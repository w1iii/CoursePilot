import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import DashboardShell from "./DashboardShell";
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
  return (
    <DashboardShell
      userName={greetingName}
      userEmail={user.email}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <TaskBoard initialTasks={(tasks ?? []) as DashboardTask[]} courses={courseOptions} />
        </div>
      </div>
    </DashboardShell>
  );
}
