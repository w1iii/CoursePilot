import { env } from "@/lib/env";

const API_URL = (env("CANVAS_API_URL") ?? "https://canvas.instructure.com").replace(/\/$/, "");

function canvasErrorDetail(text: string): string {
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 240);
}

async function canvasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = env("CANVAS_ACCESS_TOKEN");
  if (!token) throw new Error("Missing CANVAS_ACCESS_TOKEN");

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Canvas paginates via Link header; keep it simple for now.
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(
      `Canvas API error ${res.status} for ${path}: ${canvasErrorDetail(await res.text())}`,
    );
  }
  return (await res.json()) as T;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  enrollments?: { type: string; user_id: number }[];
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number | null;
  workflow_state: string;
}

export interface CanvasAnnouncement {
  id: number;
  title: string;
  message: string | null;
  posted_at: string | null;
  workflow_state: string;
}

export async function listCourses(): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>("/courses?enrollment_state=active&per_page=100");
}

export async function listAssignments(courseId: number): Promise<CanvasAssignment[]> {
  return canvasFetch<CanvasAssignment[]>(
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at`,
  );
}

export async function listAnnouncements(courseId: number): Promise<CanvasAnnouncement[]> {
  return canvasFetch<CanvasAnnouncement[]>(
    `/courses/${courseId}/discussion_topics?per_page=100&only_announcements=true`,
  );
}
