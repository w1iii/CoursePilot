import type { DeadlineChange } from "./types";

interface Props {
  changes: DeadlineChange[];
}

function shortDate(value: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DeadlineChanges({ changes }: Props) {
  return (
    <section aria-labelledby="deadline-changes-heading" className="mt-space-lg">
      <div className="flex items-baseline justify-between gap-2 border-b border-primary-container/25 pb-1">
        <h2
          id="deadline-changes-heading"
          className="font-headline-sm text-headline-sm text-primary-container"
        >
          Deadline changes
        </h2>
        <span className="paper-kicker text-text-muted">The wire</span>
      </div>

      {changes.length === 0 ? (
        <p className="mt-space-sm font-body-sm text-body-sm text-text-muted">
          No moved deadlines detected.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {changes.map((change) => (
            <li key={change.id} className="py-space-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="paper-stamp text-tertiary">Moved</span>
                <span className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
                  {change.courseCode ?? change.courseName ?? "Course"}
                </span>
              </div>
              <p className="mt-1 font-body-sm text-body-sm font-semibold leading-snug text-on-surface">
                {change.title}
              </p>
              <p className="mt-0.5 font-code-tag text-[11px] text-text-muted">
                <span className="line-through decoration-error/60">
                  {shortDate(change.oldDueDate)}
                </span>
                <span className="mx-1.5 text-tertiary" aria-hidden="true">
                  →
                </span>
                <span className="font-semibold text-primary-container">
                  {shortDate(change.newDueDate)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
