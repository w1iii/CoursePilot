import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { defaultCanvasBaseUrl } from "@/lib/canvas";
import { getCanvasStatus } from "@/lib/canvas-account";
import AskBox from "./AskBox";
import CanvasConnect from "./CanvasConnect";
import SyncButton from "./SyncButton";

export default async function DashboardPage() {
  const user = await requireUser();
  const sb = supabaseAdmin();

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
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-mesh-canvas absolute -inset-[30%] opacity-60" />
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 shadow-[0_1px_2px_rgba(21,55,13,0.05)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1120px] items-center justify-between gap-space-lg px-gutter">
          <div className="flex items-center gap-space-2xl">
            <a
              href="/dashboard"
              className="group flex items-center gap-space-sm focus:outline-none"
            >
              <span className="font-headline-md text-headline-md lowercase tracking-tight text-primary-container transition-colors group-hover:text-primary">
                habi
              </span>
              <span className="h-4 w-[2px] rotate-12 rounded-full bg-tertiary-container transition-transform group-hover:rotate-45" />
            </a>
            <nav className="hidden items-center gap-space-xs lg:flex">
              <a
                href="#ask-habi"
                aria-current="page"
                className="rounded-lg bg-secondary-container px-space-md py-space-sm font-label-md text-label-md text-on-secondary-container shadow-[0_1px_2px_rgba(21,55,13,0.08)] transition-all"
              >
                Ask Habi
              </a>
              <a
                href="#courses"
                className="rounded-lg px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
              >
                Courses
              </a>
              <a
                href="#canvas"
                className="rounded-lg px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
              >
                Canvas Sync
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm pl-space-xs">
              <div className="hidden flex-col text-right xl:flex">
                <span className="font-label-sm text-label-sm font-semibold leading-none text-on-surface">
                  {displayName}
                </span>
                <span className="font-code-tag text-code-tag text-text-muted">{user.email}</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary ring-2 ring-surface ring-offset-1 ring-offset-border">
                {initials ? (
                  <span className="font-label-sm text-label-sm font-semibold text-on-primary">
                    {initials}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-on-primary">
                    person
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-[calc(100vh-140px)] w-full pt-20">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-space-2xl px-gutter-mobile py-space-xl md:px-gutter lg:py-space-2xl">
          <AskBox userName={greetingName} courses={courseOptions} />
        </div>
      </main>

      <footer className="relative z-10 mt-auto w-full border-t border-border bg-surface-container-low">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-space-lg px-margin py-space-2xl md:flex-row">
          <div className="flex items-center gap-space-md">
            <span className="font-headline-sm text-headline-sm lowercase text-primary-container">
              habi
            </span>
            <span className="h-3 w-[1px] bg-outline-variant" />
            <span className="font-body-sm text-body-sm text-text-muted">
              Hinabi para sa&apos;yo · Works with Canvas LMS
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant">
            <a href="#ask-habi" className="transition-colors hover:text-primary">
              Ask Habi
            </a>
            <a href="#courses" className="transition-colors hover:text-primary">
              Courses
            </a>
            <a href="#canvas" className="transition-colors hover:text-primary">
              Sync Settings
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
