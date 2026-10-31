const DEFAULT_API_URL = "https://canvas.instructure.com";

export interface CanvasCredentials {
  baseUrl: string;
  token: string;
}

export class CanvasAuthError extends Error {
  constructor(message = "Canvas rejected the access token") {
    super(message);
    this.name = "CanvasAuthError";
  }
}

/** Normalize a Canvas host: https, no trailing slash, no query/hash. */
export function normalizeCanvasBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Canvas URL is required");

  const explicitScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
  if (explicitScheme && explicitScheme !== "http" && explicitScheme !== "https") {
    throw new Error("Canvas URL must use https");
  }

  const withScheme = explicitScheme ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("Canvas URL is not a valid URL");
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("Canvas URL must use https");
  }
  if (url.username || url.password) throw new Error("Canvas URL must not contain credentials");

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

export function defaultCanvasBaseUrl(): string {
  return normalizeCanvasBaseUrl(process.env.CANVAS_API_URL ?? DEFAULT_API_URL);
}

function canvasErrorDetail(text: string): string {
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 240);
}

async function canvasFetch<T>(
  credentials: CanvasCredentials,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${credentials.baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Canvas paginates via Link header; keep it simple for now.
    next: { revalidate: 0 },
  });

  if (res.status === 401 || res.status === 403) {
    throw new CanvasAuthError();
  }
  if (!res.ok) {
    throw new Error(
      `Canvas API error ${res.status} for ${path}: ${canvasErrorDetail(await res.text())}`,
    );
  }
  return (await res.json()) as T;
}

export interface CanvasUser {
  id: number;
  name: string;
  short_name?: string;
  sortable_name?: string;
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

export async function getCanvasSelf(credentials: CanvasCredentials): Promise<CanvasUser> {
  return canvasFetch<CanvasUser>(credentials, "/users/self");
}

export async function listCourses(credentials: CanvasCredentials): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>(
    credentials,
    "/courses?enrollment_state=active&per_page=100",
  );
}

export async function listAssignments(
  credentials: CanvasCredentials,
  courseId: number,
): Promise<CanvasAssignment[]> {
  return canvasFetch<CanvasAssignment[]>(
    credentials,
    `/courses/${courseId}/assignments?per_page=100&order_by=due_at`,
  );
}

export async function listAnnouncements(
  credentials: CanvasCredentials,
  courseId: number,
): Promise<CanvasAnnouncement[]> {
  return canvasFetch<CanvasAnnouncement[]>(
    credentials,
    `/courses/${courseId}/discussion_topics?per_page=100&only_announcements=true`,
  );
}
