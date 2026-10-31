import {
  CanvasAuthError,
  listAnnouncements,
  listAssignments,
  listCourses,
  type CanvasCourse,
  type CanvasCredentials,
} from "@/lib/canvas";
import {
  getCanvasCredentials,
  markCanvasAccountInvalid,
  markCanvasAccountValid,
} from "@/lib/canvas-account";
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

/**
 * Sync Canvas courses, assignments, and announcements into Supabase.
 *
 * Uses the signed-in user's own Canvas connection (encrypted personal access
 * token). Course material for RAG lives in the separate CoursePilot-RAG
 * service (`../rag/canvas-ai-assistant`); `documents` stays 0 here.
 */
export async function syncCanvas(user: AppUser): Promise<SyncResult> {
  const sb = supabaseAdmin();
  const result: SyncResult = {
    courses: 0,
    tasks: 0,
    announcements: 0,
    documents: 0,
    errors: [],
  };

  const { credentials, account, source } = await getCanvasCredentials(user.id);

  let canvasCourses: CanvasCourse[];
  try {
    canvasCourses = await listCourses(credentials);
  } catch (err) {
    if (err instanceof CanvasAuthError) {
      if (account) await markCanvasAccountInvalid(user.id, account.canvas_base_url);
      result.errors.push("Canvas rejected your access token. Reconnect Canvas to continue.");
      return result;
    }
    result.errors.push(`Canvas courses fetch failed: ${(err as Error).message}`);
    return result;
  }

  if (source === "user" && account) {
    await markCanvasAccountValid(user.id, account.canvas_base_url);
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

      await syncAssignments(sb, credentials, course.id, cc, result);
      await syncAnnouncements(sb, credentials, course.id, cc, result);
    } catch (err) {
      result.errors.push(`Course ${cc.name} failed: ${(err as Error).message}`);
    }
  }

  return result;
}

type SupabaseAdmin = ReturnType<typeof supabaseAdmin>;

async function syncAssignments(
  sb: SupabaseAdmin,
  credentials: CanvasCredentials,
  courseId: string,
  cc: CanvasCourse,
  result: SyncResult,
): Promise<void> {
  try {
    const assignments = await listAssignments(credentials, cc.id);
    for (const a of assignments) {
      if (a.workflow_state === "deleted") continue;

      const task = {
        course_id: courseId,
        canvas_task_id: a.id,
        title: a.name,
        description: stripHtml(a.description),
        type: "assignment",
        due_date: a.due_at,
        is_manual: false,
      };

      const { data: existing } = await sb
        .from("academic_tasks")
        .select("id")
        .eq("course_id", courseId)
        .eq("canvas_task_id", a.id)
        .maybeSingle();

      const { error: taskErr } = existing
        ? await sb.from("academic_tasks").update(task).eq("id", existing.id)
        : await sb.from("academic_tasks").insert(task);

      if (taskErr) result.errors.push(`Task upsert failed (${a.name}): ${taskErr.message}`);
      else result.tasks += 1;
    }
  } catch (err) {
    reportCanvasError(err, `Assignments fetch failed (${cc.name})`, result);
  }
}

async function syncAnnouncements(
  sb: SupabaseAdmin,
  credentials: CanvasCredentials,
  courseId: string,
  cc: CanvasCourse,
  result: SyncResult,
): Promise<void> {
  try {
    const announcements = await listAnnouncements(credentials, cc.id);
    for (const ann of announcements) {
      if (ann.workflow_state === "deleted") continue;

      const { error: annErr } = await sb.from("announcements").upsert(
        {
          course_id: courseId,
          canvas_announcement_id: ann.id,
          title: ann.title,
          content: stripHtml(ann.message),
          posted_at: ann.posted_at,
        },
        { onConflict: "course_id,canvas_announcement_id" },
      );
      if (annErr) result.errors.push(`Announcement upsert failed: ${annErr.message}`);
      else result.announcements += 1;
    }
  } catch (err) {
    reportCanvasError(err, `Announcements fetch failed (${cc.name})`, result);
  }
}

function reportCanvasError(err: unknown, context: string, result: SyncResult): void {
  if (err instanceof CanvasAuthError) {
    result.errors.push(`${context}: Canvas rejected the access token`);
    return;
  }
  result.errors.push(`${context}: ${(err as Error).message}`);
}
