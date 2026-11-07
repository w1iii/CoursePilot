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

  // Reject bare schemes such as `javascript:alert(1)` while still allowing
  // host:port input like `example.edu:8443`.
  const bareScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):(?!\d)/i)?.[1]?.toLowerCase();
  if (!explicitScheme && bareScheme) {
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
  if (url.search || url.hash) throw new Error("Canvas URL must not contain query or fragment");

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

export function defaultCanvasBaseUrl(): string {
  return normalizeCanvasBaseUrl(process.env.CANVAS_API_URL ?? DEFAULT_API_URL);
}

export async function hardenedCanvasBaseUrl(raw: string): Promise<string> {
  const normalized = normalizeCanvasBaseUrl(raw);
  await validateCanvasUrl(normalized);
  return normalized;
}

async function canvasFetch<T>(
  credentials: CanvasCredentials,
  path: string,
): Promise<T> {
  // Revalidate even stored URLs; socket lookup is pinned to same validated IP.
  const baseUrl = normalizeCanvasBaseUrl(credentials.baseUrl);
  const response = await canvasRequest(`${baseUrl}/api/v1${path}`, credentials.token) as
    { status: number; body?: T };
  if (response.status === 401 || response.status === 403) {
    throw new CanvasAuthError();
  }
  return response.body as T;
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
import { canvasRequest, validateCanvasUrl } from "@/lib/canvas-network";
