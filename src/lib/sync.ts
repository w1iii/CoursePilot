import {
  listAnnouncements,
  listAssignments,
  listCourses,
  type CanvasCourse,
} from "@/lib/canvas";
import { embedText } from "@/lib/ai/embeddings";
import { supabaseAdmin } from "@/lib/supabase";
import type { AppUser } from "@/lib/user";

export interface SyncResult {
  courses: number;
  tasks: number;
  announcements: number;
  documents: number;
  errors: string[];
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function currentSemester(): string {
  const now = new Date();
  const term = now.getMonth() < 5 ? "Spring" : now.getMonth() < 8 ? "Summer" : "Fall";
  return `${term} ${now.getFullYear()}`;
}

export async function syncCanvas(user: AppUser): Promise<SyncResult> {
  const sb = supabaseAdmin();
  const result: SyncResult = { courses: 0, tasks: 0, announcements: 0, documents: 0, errors: [] };

  let canvasCourses: CanvasCourse[];
  try {
    canvasCourses = await listCourses();
  } catch (err) {
    result.errors.push(`Canvas courses fetch failed: ${(err as Error).message}`);
    return result;
  }

  for (const cc of canvasCourses) {
    try {
      const instructor = cc.enrollments?.find((e) => e.type === "TeacherEnrollment");

      const { data: course, error: courseErr } = await sb
        .from("courses")
        .upsert(
          {
            user_id: user.id,
            canvas_course_id: cc.id,
            course_code: cc.course_code,
            course_name: cc.name,
            instructor: instructor ? `Teacher user ${instructor.user_id}` : null,
            semester: currentSemester(),
          },
          { onConflict: "user_id,canvas_course_id" },
        )
        .select()
        .single();

      if (courseErr || !course) {
        result.errors.push(`Course upsert failed (${cc.name}): ${courseErr?.message}`);
        continue;
      }
      result.courses += 1;

      // Assignments -> academic_tasks + documents
      try {
        const assignments = await listAssignments(cc.id);
        for (const a of assignments) {
          if (a.workflow_state === "deleted") continue;

          const { error: taskErr } = await sb.from("academic_tasks").upsert(
            {
              course_id: course.id,
              canvas_task_id: a.id,
              title: a.name,
              description: stripHtml(a.description),
              type: "assignment",
              due_date: a.due_at,
              is_manual: false,
            },
            { onConflict: "course_id,canvas_task_id" },
          );
          if (taskErr) result.errors.push(`Task upsert failed (${a.name}): ${taskErr.message}`);
          else result.tasks += 1;

          const body = stripHtml(a.description);
          if (body) {
            await indexDocument(sb, {
              courseId: course.id,
              sourceType: "assignment",
              sourceId: a.id,
              title: a.name,
              content: `Assignment due ${a.due_at ?? "TBD"}: ${body}`,
              onDone: () => (result.documents += 1),
              onError: (m) => result.errors.push(m),
            });
          }
        }
      } catch (err) {
        result.errors.push(`Assignments fetch failed (${cc.name}): ${(err as Error).message}`);
      }

      // Announcements -> announcements table + documents
      try {
        const announcements = await listAnnouncements(cc.id);
        for (const ann of announcements) {
          if (ann.workflow_state === "deleted") continue;

          const { error: annErr } = await sb.from("announcements").upsert(
            {
              course_id: course.id,
              canvas_announcement_id: ann.id,
              title: ann.title,
              content: stripHtml(ann.message),
              posted_at: ann.posted_at,
            },
            { onConflict: "course_id,canvas_announcement_id" },
          );
          if (annErr) result.errors.push(`Announcement upsert failed: ${annErr.message}`);
          else result.announcements += 1;

          const body = stripHtml(ann.message);
          if (body) {
            await indexDocument(sb, {
              courseId: course.id,
              sourceType: "announcement",
              sourceId: ann.id,
              title: ann.title,
              content: body,
              onDone: () => (result.documents += 1),
              onError: (m) => result.errors.push(m),
            });
          }
        }
      } catch (err) {
        result.errors.push(`Announcements fetch failed (${cc.name}): ${(err as Error).message}`);
      }
    } catch (err) {
      result.errors.push(`Course ${cc.name} failed: ${(err as Error).message}`);
    }
  }

  return result;
}

type Supabase = ReturnType<typeof supabaseAdmin>;

async function indexDocument(
  sb: Supabase,
  opts: {
    courseId: string;
    sourceType: "announcement" | "module" | "page" | "assignment" | "syllabus";
    sourceId: number;
    title: string;
    content: string;
    onDone: () => void;
    onError: (msg: string) => void;
  },
): Promise<void> {
  try {
    const embedding = await embedText(`${opts.title}\n${opts.content}`);
    const { error } = await sb.from("documents").upsert(
      {
        course_id: opts.courseId,
        source_type: opts.sourceType,
        source_id: opts.sourceId,
        title: opts.title,
        content: opts.content,
        embedding,
      },
      { onConflict: "course_id,source_type,source_id" },
    );
    if (error) opts.onError(`Document index failed (${opts.title}): ${error.message}`);
    else opts.onDone();
  } catch (err) {
    opts.onError(`Embedding failed (${opts.title}): ${(err as Error).message}`);
  }
}
