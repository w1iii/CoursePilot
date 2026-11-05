import { openTasksByCourse } from "@/lib/dashboard";
import type { Course, DashboardTask } from "./types";

interface Props {
  courses: Course[];
  tasks: DashboardTask[];
}

const VISIBLE_COURSES = 5;

export default function CourseIndex({ courses, tasks }: Props) {
  const counts = openTasksByCourse(tasks);
  const visible = courses.slice(0, VISIBLE_COURSES);
  const remaining = Math.max(0, courses.length - visible.length);

  return (
    <section id="courses" aria-labelledby="course-index-heading" className="border-t border-primary-container/25 pt-space-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="course-index-heading" className="font-headline-sm text-headline-sm text-primary-container">
          Course index
        </h2>
        <span className="paper-kicker text-text-muted">{courses.length} enrolled</span>
      </div>

      {courses.length === 0 ? (
        <p className="mt-space-sm font-body-sm text-body-sm text-text-muted">
          No courses yet.
        </p>
      ) : (
        <ul className="mt-space-sm divide-y divide-border">
          {visible.map((course) => {
            const open = counts.get(course.id) ?? 0;
            const indexed = Boolean(course.ragIndexedAt);
            const issues = (course.ragFailureCount ?? 0) > 0;

            return (
              <li key={course.id} className="flex items-start gap-2 py-2">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    issues ? "bg-error" : indexed ? "bg-secondary" : "bg-tertiary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-label-sm text-label-sm text-on-surface">
                    {course.code ?? course.name}
                  </p>
                  <p className="truncate font-code-tag text-[10px] text-text-muted">
                    {course.code ? course.name : "Course"} · {open} open
                  </p>
                </div>
                <span className="paper-kicker shrink-0 text-[9px] text-text-muted">
                  {issues ? "Issues" : indexed ? "Indexed" : "Queued"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {remaining > 0 && (
        <p className="mt-2 font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
          +{remaining} more in settings
        </p>
      )}
    </section>
  );
}
