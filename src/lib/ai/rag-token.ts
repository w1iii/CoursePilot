import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export type RagScope = "chat" | "ingest";

const MAX_TTL_SECONDS = 300;

interface RagTokenInput {
  userId: string;
  courseKey: string;
  scope: RagScope;
  ttlSeconds?: number;
}

function secret(): string {
  const value = env("RAG_SIGNING_SECRET");
  if (!value) {
    throw new Error("Missing required environment variable: RAG_SIGNING_SECRET");
  }
  return value;
}

function base64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Create a short-lived token bound to one user and one internal course UUID.
 *
 * The RAG service verifies this token and refuses requests whose course_key
 * does not match the signed claim. The shared static RAG tokens are gone.
 */
export function signRagToken({
  userId,
  courseKey,
  scope,
  ttlSeconds = 120,
}: RagTokenInput): string {
  if (!userId || !courseKey) {
    throw new Error("RAG token requires a user and course key");
  }
  if (ttlSeconds <= 0 || ttlSeconds > MAX_TTL_SECONDS) {
    throw new Error(`RAG token TTL must be between 1 and ${MAX_TTL_SECONDS}`);
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      sub: userId,
      course: courseKey,
      scope,
      iat: issuedAt,
      exp: issuedAt + ttlSeconds,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

/**
 * Test-only helper. Verifies a token with the configured signing secret.
 * Production verification happens in the RAG service.
 */
export function verifyRagTokenForTest(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
