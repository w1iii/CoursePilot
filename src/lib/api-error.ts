import { NextResponse } from "next/server";
import { logServerError } from "@/lib/server-error";

export function apiFailure(operation: string, error: unknown, message: string, status = 500) {
  const requestId = logServerError(operation, error);
  return NextResponse.json({ error: message }, { status, headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" } });
}
