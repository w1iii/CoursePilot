import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { enqueueJob } from "@/lib/jobs";
import { SyncInProgressError } from "@/lib/sync-lock";
import { isUuid } from "@/lib/api-validation";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const user = await requireUser();
    const { courseId } = await params;
    if (!isUuid(courseId)) return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) {
      if (!limit.enforced) return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
      return NextResponse.json({ error: rateLimitMessage(limit.scope) }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }

    const { data: course, error } = await supabaseAdmin()
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .eq("selected_for_rag", true)
      .maybeSingle();
    if (error) throw error;
    if (!course) return NextResponse.json({ error: "Course is not included for study indexing" }, { status: 404 });

    return NextResponse.json(await enqueueJob(user.id, "course_sync", { courseId }), {
      status: 202, headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof SyncInProgressError) return NextResponse.json({ error: error.message }, { status: 409, headers: { "Retry-After": "30" } });
    console.error("course sync failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Course synchronization failed" }, { status: 500 });
  }
}
