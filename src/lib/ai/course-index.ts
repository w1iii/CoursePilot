import { createHash } from "node:crypto";

/** Must match RAG app/security/course_index.py exactly. */
export function normalizeCanvasInstance(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid Canvas instance URL");
  }
  return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
}

export function sharedCourseKey(canvasInstance: string, canvasCourseId: number): string {
  if (!Number.isSafeInteger(canvasCourseId) || canvasCourseId <= 0) {
    throw new Error("Invalid Canvas course ID");
  }
  return createHash("sha256")
    .update(`canvas-instance:v1:${normalizeCanvasInstance(canvasInstance)}:${canvasCourseId}`)
    .digest("hex");
}
