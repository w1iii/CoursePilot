import { createHmac } from "node:crypto";

import { requireEnv } from "@/lib/env";
import { normalizeCanvasInstance, sharedCourseKey } from "@/lib/ai/course-index";

type RagScope = "chat" | "ingest" | "delete";

/** Short-lived service token, bound to one user, internal course ID and operation. */
export function signRagToken(input: {
  userId: string;
  courseKey: string;
  scope: RagScope;
  ttlSeconds?: number;
  canvasCourseId?: number;
  canvasInstance?: string;
}): string {
  const { userId, courseKey, scope, ttlSeconds = 120, canvasCourseId, canvasInstance } = input;
  if (!userId || !courseKey || courseKey.length > 64) {
    throw new Error("RAG token requires a user and valid course key");
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) {
    throw new Error("RAG token TTL must be between 1 and 300 seconds");
  }
  if ((scope === "ingest" || scope === "delete") && (!Number.isSafeInteger(canvasCourseId) || (canvasCourseId ?? 0) <= 0)) {
    throw new Error("Course operation token requires a Canvas course ID");
  }
  const shared = canvasInstance !== undefined;
  if (shared && courseKey !== sharedCourseKey(canvasInstance, canvasCourseId ?? 0)) {
    throw new Error("Shared course key does not match Canvas identity");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    course: courseKey,
    scope,
    ...(scope === "ingest" || scope === "delete" ? { canvas_course_id: canvasCourseId } : {}),
    ...(shared ? { shared: true, canvas_instance: normalizeCanvasInstance(canvasInstance), canvas_course_id: canvasCourseId } : {}),
    iat: now,
    exp: now + ttlSeconds,
  })).toString("base64url");
  const signature = createHmac("sha256", requireEnv("RAG_SIGNING_SECRET"))
    .update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
