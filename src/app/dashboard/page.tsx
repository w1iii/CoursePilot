import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { defaultCanvasBaseUrl } from "@/lib/canvas";
import { getCanvasStatus } from "@/lib/canvas-account";
import AskBox from "./AskBox";
import CanvasConnect from "./CanvasConnect";
import SyncButton from "./SyncButton";
import TaskManager from "./TaskManager";

async function loadCourseContent(courseIds: string[]) {
  if (courseIds.length === 0) {
    return { tasks: [], announcements: [] };
  }

  const sb = supabaseAdmin();
  const [{ data: tasks, error: tasksError }, { data: announcements, error: announcementsError }] =
    await Promise.all([
      sb
        .from("academic_tasks")
        .select("id, title, type, due_date, priority, status, courses(course_name)")
        .in("course_id", courseIds)
        .eq("status", "pending")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20),
      sb
        .from("announcements")
        .select("id, title, posted_at, courses(course_name)")
        .in("course_id", courseIds)
        .order("posted_at", { ascending: false })
        .limit(10),
    ]);

  if (tasksError) throw new Error(`Failed to load tasks: ${tasksError.message}`);
  if (announcementsError) {
    throw new Error(`Failed to load announcements: ${announcementsError.message}`);
  }

  return { tasks: tasks ?? [], announcements: announcements ?? [] };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const sb = supabaseAdmin();

  const nowIso = new Date().toISOString();

  const [{ data: courses, error: coursesError }, canvasStatus] = await Promise.all([
    sb
      .from("courses")
      .select("id, course_code, course_name, instructor")
      .eq("user_id", user.id)
      .limit(50),
    getCanvasStatus(user.id),
  ]);

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  const courseIds = (courses ?? []).map((course) => course.id);
  const { tasks, announcements } = await loadCourseContent(courseIds);

  const todayTasks = (tasks ?? []).filter((t) => {
    if (!t.due_date) return false;
    return t.due_date.slice(0, 10) === nowIso.slice(0, 10);
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">Signed in as {user.email}</p>
        </div>
        <SyncButton connected={canvasStatus.connected} />
      </header>

      <CanvasConnect initialStatus={canvasStatus} defaultBaseUrl={defaultCanvasBaseUrl()} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold">Today&apos;s Priorities</h2>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing due today.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {todayTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span>{t.title}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      t.priority === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : t.priority === "medium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold">Upcoming Deadlines</h2>
          {(tasks ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No pending tasks. Sync Canvas to pull work in.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {(tasks ?? []).slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold">Important Announcements</h2>
          {(announcements ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No announcements yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {(announcements ?? []).map((a) => (
                <li key={a.id}>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-zinc-500">
                    {(a.courses as { course_name?: string } | null)?.course_name ?? "Course"}
                    {a.posted_at ? ` · ${new Date(a.posted_at).toLocaleDateString()}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-lg font-semibold">Courses</h2>
          {(courses ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No courses synced yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {(courses ?? []).map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.course_code ?? "—"}</span> {c.course_name}
                  {c.instructor && (
                    <span className="block text-xs text-zinc-500">{c.instructor}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TaskManager
        courses={(courses ?? []).map((c) => ({
          id: c.id,
          name: c.course_name,
          code: c.course_code,
        }))}
      />

      <AskBox
        courses={(courses ?? []).map((c) => ({
          id: c.id,
          name: c.course_name,
          code: c.course_code,
        }))}
      />
    </main>
  );
}
