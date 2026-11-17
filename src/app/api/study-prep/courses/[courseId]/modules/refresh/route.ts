import { NextResponse } from "next/server";
import { isUuid } from "@/lib/api-validation";
import { backfillModuleMetadata, sharedIndexEnabled } from "@/lib/ai/ingest";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";

export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
    const user = await requireUser();
    const { courseId } = await params;
    if (!isUuid(courseId)) return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) {
      if (!limit.enforced) return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
      return NextResponse.json({ error: rateLimitMessage(limit.scope) }, {
        status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }
    if (sharedIndexEnabled()) return NextResponse.json({ error: "Metadata refresh is unavailable for shared indexes" }, { status: 409 });
    const { data: course, error } = await supabaseAdmin().from("courses")
      .select("id, canvas_course_id").eq("id", courseId).eq("user_id", user.id)
      .eq("selected_for_rag", true).maybeSingle();
    if (error) throw error;
    if (!course) return NextResponse.json({ error: "Selected course not found" }, { status: 404 });
    const { credentials, source } = await getCanvasCredentials(user.id);
    if (source !== "user") return NextResponse.json({ error: "Connect your Canvas account first" }, { status: 409 });
    await backfillModuleMetadata({
      userId: user.id, courseKey: course.id, canvasCourseId: course.canvas_course_id,
      canvasBaseUrl: credentials.baseUrl, canvasAccessToken: credentials.token,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("module metadata refresh failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not refresh course modules" }, { status: 502 });
  }
}
