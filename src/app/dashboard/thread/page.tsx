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

      <ThreadView
        userName={displayName}
        userEmail={user.email}
        courses={courseOptions}
        initialQuestion={params.q?.trim() ?? ""}
        initialCourseId={params.course ?? courseOptions[0]?.id ?? ""}
        initialThreadId={params.tid ?? "thread"}
      />

    </>
  );
}
