import { randomUUID } from "node:crypto";

/** Log only controlled metadata: upstream messages, objects and stacks can contain secrets. */
export function logServerError(operation: string, error: unknown, requestId = randomUUID()): string {
  const category = error instanceof TypeError ? "TypeError"
    : error instanceof RangeError ? "RangeError"
      : error instanceof Error ? "Error" : "UnknownError";
  console.error("server request failed", { operation, requestId, category });
  return requestId;
}
