import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import ThreadView from "./ThreadView";

interface PageProps {
  searchParams: Promise<{ q?: string; course?: string; tid?: string }>;
}

function normalizeName(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ThreadPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const sb = supabaseAdmin();

  const { data: courses, error: coursesError } = await sb
    .from("courses")
    .select("id, course_code, course_name, instructor")
    .eq("user_id", user.id)
    .limit(50);

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  const courseOptions = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
    instructor: course.instructor,
  }));

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-mesh-canvas absolute -inset-[30%] opacity-60" />
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <main className="relative z-10 min-h-[calc(100vh-40px)] w-full">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col px-gutter-mobile pb-space-5xl md:px-gutter">
          <ThreadView
            userName={displayName}
            userEmail={user.email}
            courses={courseOptions}
            initialQuestion={params.q?.trim() ?? ""}
            initialCourseId={params.course ?? courseOptions[0]?.id ?? ""}
            initialThreadId={params.tid ?? "thread"}
          />
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
            <a href="/dashboard" className="transition-colors hover:text-primary">
              Ask Habi
            </a>
            <a href="/dashboard#courses" className="transition-colors hover:text-primary">
              Courses
            </a>
            <a href="/dashboard#canvas" className="transition-colors hover:text-primary">
              Sync Settings
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
