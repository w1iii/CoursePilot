export interface IndexedCourse {
  id: string;
  course_code: string | null;
  course_name: string;
}

export default function IndexedCourses({ courses }: { courses: IndexedCourse[] }) {
  if (courses.length === 0) {
    return <p className="rounded-xl border border-dashed border-border bg-surface-container-low p-space-lg text-sm text-text-muted">No indexed courses yet. Sync Canvas to index your selected courses.</p>;
  }

  return (
    <ul aria-label="Indexed courses" className="divide-y divide-border rounded-xl border border-border bg-surface-container-low">
      {courses.map((course) => (
        <li key={course.id} className="px-4 py-3 font-label-sm text-label-sm text-on-surface">
          {course.course_code ? `${course.course_code} — ` : ""}{course.course_name}
        </li>
      ))}
    </ul>
  );
}
