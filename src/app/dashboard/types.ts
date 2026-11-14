export interface Course {
  id: string;
  name: string;
  code: string | null;
  instructor: string | null;
  semester: string | null;
  ragIndexedAt: string | null;
  ragDocumentCount: number | null;
  ragChunkCount: number | null;
  ragFailureCount: number | null;
  selectedForRag?: boolean;
}

export interface DashboardTask {
  id: string;
  course_id: string;
  canvas_task_id: number | null;
  title: string;
  description: string | null;
  type: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  is_manual: boolean;
  notes: string | null;
  courses?: { course_name: string; course_code: string | null } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string | null;
  importanceScore: number | null;
  postedAt: string | null;
  courseCode: string | null;
  courseName: string | null;
}
