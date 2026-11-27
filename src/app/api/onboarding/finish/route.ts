import { NextResponse } from "next/server";

import { invalidateUserCache } from "@/lib/cache";
import { listCourses } from "@/lib/canvas";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { isUuid, readJsonObject } from "@/lib/api-validation";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonObject(request);
    const requested = Array.isArray(body?.courseIds) ? body.courseIds : [];
    if (!body || Object.keys(body).some((key) => key !== "courseIds") || requested.length === 0 || requested.length > 100 || !requested.every(isUuid) || new Set(requested).size !== requested.length) {
      return NextResponse.json({ error: "Choose at least one course" }, { status: 400 });
    }

    const { credentials } = await getCanvasCredentials(user.id);
    const canvasCourses = await listCourses(credentials);
    const sb = supabaseAdmin();
    const { data: enrolledRows, error: enrolledError } = await sb.from("courses")
      .select("id, canvas_course_id").eq("user_id", user.id);
    if (enrolledError) throw enrolledError;
    const courseMap = new Map((enrolledRows ?? []).map((course) => [course.id, course.canvas_course_id]));
    const requestedCanvasIds = requested.map((id) => courseMap.get(id));
    const validCanvasIds = new Set(canvasCourses.map((course) => course.id));
    if (requestedCanvasIds.some((id) => id === undefined || !validCanvasIds.has(id))) {
      return NextResponse.json({ error: "One or more courses are not enrolled in this Canvas account" }, { status: 400 });
    }

    const { data: jobId, error: queueError } = await sb.rpc("finish_onboarding_queued", {
      p_user_id: user.id, p_course_ids: requested,
    });
    if (queueError) throw queueError;
    invalidateUserCache(user.id);
    return NextResponse.json({
      complete: true,
      selected: requested.length,
      jobId, queued: true,
    }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("onboarding completion failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not finish setup. Please retry." }, { status: 500 });
  }
}
