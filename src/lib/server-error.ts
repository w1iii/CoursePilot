import { randomUUID } from "node:crypto";

/** Log only controlled metadata: upstream messages, objects and stacks can contain secrets. */
export function logServerError(operation: string, error: unknown, requestId: string = randomUUID()): string {
  const category = error instanceof TypeError ? "TypeError"
    : error instanceof RangeError ? "RangeError"
      : error instanceof Error ? "Error" : "UnknownError";
  const detail = error instanceof Error ? error as Error & { code?: unknown; status?: unknown } : null;
  const codes = ["rag_timeout", "rag_unreachable", "rag_http_error", "invalid_response"];
  const code = typeof detail?.code === "string" && codes.includes(detail.code) ? detail.code : undefined;
  const status = typeof detail?.status === "number" && Number.isInteger(detail.status) &&
    detail.status >= 400 && detail.status <= 599 ? detail.status : undefined;
  console.error("server request failed", { operation, requestId, category, ...(code ? { code } : {}), ...(status ? { status } : {}) });
  return requestId;
}
