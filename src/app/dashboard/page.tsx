import { getCanvasStatus } from "@/lib/canvas-account";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/user";
import { cacheUserRead } from "@/lib/cache";
import AnnouncementsFeed from "./AnnouncementsFeed";
import AskHabiCard from "./AskHabiCard";
import CourseIndex from "./CourseIndex";
import DashboardPaper from "./DashboardPaper";
import DashboardShell from "./DashboardShell";
import DeadlineChanges from "./DeadlineChanges";
import PaperMasthead from "./PaperMasthead";
import type {
  Announcement,
  Course,
  DashboardTask,
  DeadlineChange,
} from "./types";

interface CourseJoin {
  course_name: string;
  course_code: string | null;
}

interface RawCourse {
  id: string;
  course_code: string | null;
  course_name: string;
  instructor: string | null;
  semester: string | null;
  rag_indexed_at: string | null;
  rag_document_count: number | null;
  rag_chunk_count: number | null;
  rag_failure_count: number | null;
}

interface RawTask {
  id: string;
  course_id: string;
  canvas_task_id: number | null;
  title: string;
  description: string | null;
  type: string;
  due_date: string | null;
  priority: DashboardTask["priority"];
  status: DashboardTask["status"];
  is_manual: boolean;
  notes: string | null;
  courses: CourseJoin | CourseJoin[] | null;
}

interface RawAnnouncement {
  id: string;
  title: string;
  content: string | null;
  importance_score: number | null;
  posted_at: string | null;
  courses: CourseJoin | CourseJoin[] | null;
}

interface RawDeadlineChange {
  id: string;
  title: string;
  old_due_date: string | null;
  new_due_date: string;
  detected_at: string;
  courses: CourseJoin | CourseJoin[] | null;
}

function joinedCourse(value: CourseJoin | CourseJoin[] | null): CourseJoin | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeName(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function semesterLabel(now: Date): string {
  const month = now.getMonth();
  const term = month < 5 ? "Spring" : month < 8 ? "Summer" : "Fall";
  return `${term} ${now.getFullYear()}`;
}


export default async function DashboardPage() {
  const user = await requireUser();
  const sb = supabaseAdmin();

  const [coursesResult, canvas] = await Promise.all([
    cacheUserRead("dashboard-courses", user.id, 60, async () => await sb
      .from("courses")
      .select("id, course_code, course_name, instructor, semester, rag_indexed_at, rag_document_count, rag_chunk_count, rag_failure_count")
      .eq("user_id", user.id)
      .limit(50)),
    getCanvasStatus(user.id),
  ]);

  if (coursesResult.error) {
    throw new Error(`Failed to load courses: ${coursesResult.error.message}`);
  }

  const courseRows = (coursesResult.data ?? []) as RawCourse[];
  const courseIds = courseRows.map((course) => course.id);

  let taskRows: RawTask[] = [];
  let announcementRows: RawAnnouncement[] = [];
  let deadlineRows: RawDeadlineChange[] = [];

  if (courseIds.length > 0) {
    const [tasksResult, announcementsResult, deadlineResult] = await Promise.all([
      cacheUserRead("dashboard-tasks", user.id, 30, async () => await sb
        .from("academic_tasks")
        .select(
          "id, course_id, canvas_task_id, title, description, type, due_date, priority, status, is_manual, notes, courses(course_name, course_code)",
        )
        .in("course_id", courseIds)
        .is("removed_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50)),
      cacheUserRead("dashboard-announcements", user.id, 60, async () => await sb
        .from("announcements")
        .select(
          "id, title, content, importance_score, posted_at, courses(course_name, course_code)",
        )
        .in("course_id", courseIds)
        .is("removed_at", null)
        .order("importance_score", { ascending: false, nullsFirst: false })
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(5)),
      cacheUserRead("dashboard-deadlines", user.id, 60, async () => await sb
        .from("deadline_changes")
        .select(
          "id, title, old_due_date, new_due_date, detected_at, courses(course_name, course_code)",
        )
        .in("course_id", courseIds)
        .order("detected_at", { ascending: false })
        .limit(4)),
    ]);

    if (tasksResult.error) {
      throw new Error(`Failed to load tasks: ${tasksResult.error.message}`);
    }
    if (announcementsResult.error) {
      throw new Error(`Failed to load announcements: ${announcementsResult.error.message}`);
    }
    if (deadlineResult.error) {
      throw new Error(`Failed to load deadline changes: ${deadlineResult.error.message}`);
    }

    taskRows = (tasksResult.data ?? []) as RawTask[];
    announcementRows = (announcementsResult.data ?? []) as RawAnnouncement[];
    deadlineRows = (deadlineResult.data ?? []) as RawDeadlineChange[];
  }

  const courses: Course[] = courseRows.map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
    instructor: course.instructor,
    semester: course.semester,
    ragIndexedAt: course.rag_indexed_at,
    ragDocumentCount: course.rag_document_count,
    ragChunkCount: course.rag_chunk_count,
    ragFailureCount: course.rag_failure_count,
  }));

  const tasks: DashboardTask[] = taskRows.map((task) => ({
    id: task.id,
    course_id: task.course_id,
    canvas_task_id: task.canvas_task_id,
    title: task.title,
    description: task.description,
    type: task.type,
    due_date: task.due_date,
    priority: task.priority,
    status: task.status,
    is_manual: task.is_manual,
    notes: task.notes,
    courses: joinedCourse(task.courses),
  }));

  const announcements: Announcement[] = announcementRows.map((announcement) => {
    const course = joinedCourse(announcement.courses);
    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      importanceScore: announcement.importance_score,
      postedAt: announcement.posted_at,
      courseCode: course?.course_code ?? null,
      courseName: course?.course_name ?? null,
    };
  });

  const deadlineChanges: DeadlineChange[] = deadlineRows.map((change) => {
    const course = joinedCourse(change.courses);
    return {
      id: change.id,
      title: change.title,
      oldDueDate: change.old_due_date,
      newDueDate: change.new_due_date,
      detectedAt: change.detected_at,
      courseCode: course?.course_code ?? null,
      courseName: course?.course_name ?? null,
    };
  });

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const edition = courseRows.find((course) => course.semester)?.semester ?? semesterLabel(now);

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );
  const firstName = displayName.split(/\s+/)[0];

  return (
    <DashboardShell userName={firstName} userEmail={user.email}>
      <div id="dashboard-scroll" className="min-h-0 flex-1 overflow-y-auto">
        <DashboardPaper
          initialTasks={tasks}
          courses={courses}
          today={now.toISOString()}
          edition={edition}
          canvas={canvas}
          masthead={
            <PaperMasthead
              userName={firstName}
              dateLabel={dateLabel}
              edition={edition}
              canvas={canvas}
            />
          }
          news={
            <>
              <AnnouncementsFeed announcements={announcements} />
              <DeadlineChanges changes={deadlineChanges} />
            </>
          }
          rail={
            <>
              <AskHabiCard />
              <CourseIndex courses={courses} tasks={tasks} />
            </>
          }
        />
      </div>
    </DashboardShell>
  );
}
