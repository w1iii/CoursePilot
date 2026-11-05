import { needsAction } from "@/lib/priority";
import { summarizeAnnouncement } from "@/lib/dashboard";
import type { Announcement } from "./types";

interface Props {
  announcements: Announcement[];
}

function postedLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnnouncementsFeed({ announcements }: Props) {
  return (
    <section aria-labelledby="announcements-heading">
      <div className="flex items-baseline justify-between gap-2 border-b border-primary-container/25 pb-1">
        <h2 id="announcements-heading" className="font-headline-sm text-headline-sm text-primary-container">
          Announcements
        </h2>
        <span className="paper-kicker text-text-muted">Campus bulletin</span>
      </div>

      {announcements.length === 0 ? (
        <p className="mt-space-sm font-body-sm text-body-sm text-text-muted">
          No announcements yet. Sync Canvas to pull the latest notices.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {announcements.map((announcement) => {
            const urgent =
              needsAction(announcement.title, announcement.content) ||
              (announcement.importanceScore ?? 0) >= 0.6;
            const summary = summarizeAnnouncement(announcement.content);

            return (
              <li key={announcement.id} className="py-space-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-code-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
                    {announcement.courseCode ?? announcement.courseName ?? "Course"}
                  </span>
                  <span className="font-code-tag text-[10px] text-text-muted/70">
                    {postedLabel(announcement.postedAt)}
                  </span>
                  {urgent && (
                    <span className="paper-stamp text-tertiary">Important</span>
                  )}
                </div>
                <h3 className="mt-1 font-body-md text-[15px] font-semibold leading-snug text-on-surface">
                  {announcement.title}
                </h3>
                {summary && (
                  <p className="mt-1 line-clamp-2 font-body-sm text-body-sm text-text-muted">
                    {summary}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
