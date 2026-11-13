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
import {
  ingestCanvasCourse,
  ragIngestMaxCourses,
  ragIngestionEnabled,
  ragReindexHours,
} from "@/lib/ai/ingest";
import { elapsedMs, logAiRequest } from "@/lib/ai/log";
import {
  scoreAnnouncementImportance,
  scoreTaskPriority,
} from "@/lib/priority";
import { supabaseAdmin } from "@/lib/supabase";
import type { AppUser } from "@/lib/user";
import { withUserSyncLock } from "@/lib/sync-lock";

export interface SyncResult {
  courses: number;
  tasks: number;
  announcements: number;
  documents: number;
  ragDocuments: number;
  ragChunks: number;
  ragFailures: number;
  ragSkipped: number;
  ragFailureDetails: string[];
  ragSkippedDetails: string[];
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
  return withUserSyncLock(user.id, () => performSyncCanvas(user));
}

async function performSyncCanvas(user: AppUser): Promise<SyncResult> {
  const sb = supabaseAdmin();
  const result: SyncResult = {
    courses: 0,
    tasks: 0,
    announcements: 0,
    documents: 0,
    ragDocuments: 0,
    ragChunks: 0,
    ragFailures: 0,
    ragSkipped: 0,
    ragFailureDetails: [],
    ragSkippedDetails: [],
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

  if (ragIngestionEnabled()) {
    await ingestDueCourses(sb, user.id, credentials, result);
  }

  return result;
}

type SupabaseAdmin = ReturnType<typeof supabaseAdmin>;

/**
 * Ingest the least-recently-indexed courses into RAG, capped per sync so a
 * large Canvas account does not exceed request timeouts or embedding quotas.
 */
async function ingestDueCourses(
  sb: SupabaseAdmin,
  userId: string,
  credentials: CanvasCredentials,
  result: SyncResult,
): Promise<void> {
  const cutoff = new Date(Date.now() - ragReindexHours() * 60 * 60 * 1000).toISOString();

  const { data: dueCourses, error } = await sb
    .from("courses")
    .select("id, canvas_course_id, course_name")
    .eq("user_id", userId)
    .eq("selected_for_rag", true)
    .or(`rag_indexed_at.is.null,rag_indexed_at.lt.${cutoff}`)
    .order("rag_indexed_at", { ascending: true, nullsFirst: true })
    .limit(ragIngestMaxCourses());

  if (error) {
    result.errors.push(`RAG ingestion skipped: ${error.message}`);
    return;
  }

  for (const course of dueCourses ?? []) {
    const startedAt = Date.now();
    try {
      const ingestion = await ingestCanvasCourse({
        userId,
        courseKey: course.id,
        canvasCourseId: course.canvas_course_id,
        canvasBaseUrl: credentials.baseUrl,
        canvasAccessToken: credentials.token,
      });

      result.ragDocuments += ingestion.documents;
      result.ragChunks += ingestion.chunks;
      result.ragFailures += ingestion.failures;
      result.ragSkipped += ingestion.skipped;
      result.ragFailureDetails.push(...ingestion.failureDetails);
      result.ragSkippedDetails.push(...ingestion.skippedDetails);

      await logAiRequest({
        userId,
        feature: "ingest",
        status: ingestion.failures > 0 ? "error" : "ok",
        latencyMs: elapsedMs(startedAt),
        error:
          ingestion.failures > 0
            ? `${ingestion.failures} item(s) failed while ingesting ${course.course_name}`
            : null,
      });

      if (ingestion.failures > 0) {
        result.errors.push(
          `RAG ingestion for ${course.course_name}: ${ingestion.failures} item(s) failed` +
            (ingestion.failureDetails.length
              ? ` (${ingestion.failureDetails.slice(0, 3).join("; ")})`
              : ""),
        );
      }

      const { error: updateError } = await sb
        .from("courses")
        .update({
          // A completed crawl may contain permanent parse failures. Record the
          // attempt so those items do not force a full-course crawl every sync;
          // transient failures retry when the normal re-index window expires.
          rag_indexed_at: new Date().toISOString(),
          rag_document_count: ingestion.documents,
          rag_chunk_count: ingestion.chunks,
          rag_failure_count: ingestion.failures,
        })
        .eq("id", course.id);

      if (updateError) {
        result.errors.push(`RAG index status update failed (${course.course_name}): ${updateError.message}`);
      }
    } catch (err) {
      await logAiRequest({
        userId,
        feature: "ingest",
        status: "error",
        latencyMs: elapsedMs(startedAt),
        error: `${course.course_name}: ${(err as Error).message}`,
      });
      result.errors.push(`RAG ingestion failed (${course.course_name}): ${(err as Error).message}`);
    }
  }
}

async function syncAssignments(
  sb: SupabaseAdmin,
  credentials: CanvasCredentials,
  courseId: string,
  cc: CanvasCourse,
  result: SyncResult,
): Promise<void> {
  try {
    const errorsBefore = result.errors.length;
    const assignments = (await listAssignments(credentials, cc.id)).filter(
      (a) => a.workflow_state !== "deleted",
    );
    const seenIds: number[] = [];

    for (const a of assignments) {
      seenIds.push(a.id);

      const task = {
        course_id: courseId,
        canvas_task_id: a.id,
        title: a.name,
        description: stripHtml(a.description),
        type: "assignment",
        due_date: a.due_at,
        priority: scoreTaskPriority({ dueDate: a.due_at, type: "assignment" }),
        is_manual: false,
        removed_at: null,
      };

      const { data: existing, error: existingError } = await sb
        .from("academic_tasks")
        .select("id, due_date")
        .eq("course_id", courseId)
        .eq("canvas_task_id", a.id)
        .maybeSingle();
      if (existingError) throw new Error(`Task lookup failed: ${existingError.message}`);

      const dueDateChanged =
        existing?.due_date &&
        a.due_at &&
        new Date(existing.due_date).getTime() !== new Date(a.due_at).getTime();

      if (existing && dueDateChanged) {
        const { error: changeErr } = await sb.from("deadline_changes").insert({
          task_id: existing.id,
          course_id: courseId,
          title: a.name,
          old_due_date: existing.due_date,
          new_due_date: a.due_at,
        });
        if (changeErr) {
          result.errors.push(`Deadline change not recorded (${a.name}): ${changeErr.message}`);
        }
      }

      const { error: taskErr } = existing
        ? await sb.from("academic_tasks").update(task).eq("id", existing.id)
        : await sb.from("academic_tasks").insert(task);

      if (taskErr) result.errors.push(`Task upsert failed (${a.name}): ${taskErr.message}`);
      else result.tasks += 1;
    }

    if (result.errors.length === errorsBefore) {
      await markMissingTasksRemoved(sb, courseId, seenIds, result);
    }
  } catch (err) {
    reportCanvasError(err, `Assignments fetch failed (${cc.name})`, result);
  }
}

async function markMissingTasksRemoved(
  sb: SupabaseAdmin,
  courseId: string,
  seenIds: number[],
  result: SyncResult,
): Promise<void> {
  const query = sb
    .from("academic_tasks")
    .update({ removed_at: new Date().toISOString() })
    .eq("course_id", courseId)
    .eq("is_manual", false)
    .is("removed_at", null);

  const { error } =
    seenIds.length > 0
      ? await query.not("canvas_task_id", "in", `(${seenIds.join(",")})`)
      : await query.not("canvas_task_id", "is", null);

  if (error) {
    result.errors.push(`Removed-task reconciliation failed: ${error.message}`);
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
    const errorsBefore = result.errors.length;
    const announcements = (await listAnnouncements(credentials, cc.id)).filter(
      (ann) => ann.workflow_state !== "deleted",
    );
    const seenIds: number[] = [];

    for (const ann of announcements) {
      seenIds.push(ann.id);

      const content = stripHtml(ann.message);
      const { error: annErr } = await sb.from("announcements").upsert(
        {
          course_id: courseId,
          canvas_announcement_id: ann.id,
          title: ann.title,
          content,
          posted_at: ann.posted_at,
          importance_score: scoreAnnouncementImportance({
            title: ann.title,
            content,
            postedAt: ann.posted_at,
          }),
          removed_at: null,
        },
        { onConflict: "course_id,canvas_announcement_id" },
      );
      if (annErr) result.errors.push(`Announcement upsert failed: ${annErr.message}`);
      else result.announcements += 1;
    }

    if (result.errors.length === errorsBefore) {
      await markMissingAnnouncementsRemoved(sb, courseId, seenIds, result);
    }
  } catch (err) {
    reportCanvasError(err, `Announcements fetch failed (${cc.name})`, result);
  }
}

async function markMissingAnnouncementsRemoved(
  sb: SupabaseAdmin,
  courseId: string,
  seenIds: number[],
  result: SyncResult,
): Promise<void> {
  const query = sb
    .from("announcements")
    .update({ removed_at: new Date().toISOString() })
    .eq("course_id", courseId)
    .is("removed_at", null);

  const { error } =
    seenIds.length > 0
      ? await query.not("canvas_announcement_id", "in", `(${seenIds.join(",")})`)
      : await query.not("canvas_announcement_id", "is", null);

  if (error) {
    result.errors.push(`Removed-announcement reconciliation failed: ${error.message}`);
  }
}

function reportCanvasError(err: unknown, context: string, result: SyncResult): void {
  if (err instanceof CanvasAuthError) {
    result.errors.push(`${context}: Canvas rejected the access token`);
    return;
  }
  result.errors.push(`${context}: ${(err as Error).message}`);
}
