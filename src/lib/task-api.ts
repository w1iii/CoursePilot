import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 32_000;

export async function enforceTaskWriteLimit(userId: string): Promise<NextResponse | null> {
  const limit = await checkRateLimit(userId);
  if (limit.allowed) return null;
  if (!limit.enforced) {
    return NextResponse.json({ error: "Rate limiter unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({
    error: rateLimitMessage(limit.scope),
    scope: limit.scope,
    retryAfterSeconds: limit.retryAfterSeconds,
  }, {
    status: 429,
    headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
  });
}

export async function readTaskJson(request: Request): Promise<unknown> {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) throw new RequestValidationError("Request body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestValidationError("Invalid JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestValidationError("Request body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new RequestValidationError("Invalid JSON body");
  }
}

export class RequestValidationError extends Error {}

export function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new RequestValidationError(`${field} must be a string of at most ${maxLength} characters`);
  }
  return value;
}

export function optionalDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new RequestValidationError("dueDate must be a valid date string");
  }
  return new Date(value).toISOString();
}
