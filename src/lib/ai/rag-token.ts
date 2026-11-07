import { createHmac } from "node:crypto";

import { requireEnv } from "@/lib/env";

type RagScope = "chat" | "ingest";

/** Short-lived service token, bound to one user, internal course ID and operation. */
export function signRagToken(input: {
  userId: string;
  courseKey: string;
  scope: RagScope;
  ttlSeconds?: number;
}): string {
  const { userId, courseKey, scope, ttlSeconds = 120 } = input;
  if (!userId || !courseKey || courseKey.length > 64) {
    throw new Error("RAG token requires a user and valid course key");
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) {
    throw new Error("RAG token TTL must be between 1 and 300 seconds");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    course: courseKey,
    scope,
    iat: now,
    exp: now + ttlSeconds,
  })).toString("base64url");
  const signature = createHmac("sha256", requireEnv("RAG_SIGNING_SECRET"))
    .update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
