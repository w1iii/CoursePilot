import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import AskBox from "./AskBox";
import DashboardShell from "./DashboardShell";

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
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-mesh-canvas absolute -inset-[30%] opacity-60" />
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center bg-background px-gutter-mobile py-space-xl md:px-gutter lg:py-space-2xl">
          <AskBox userName={greetingName} courses={courseOptions} />
        </div>
      </div>
    </DashboardShell>
  );
}
