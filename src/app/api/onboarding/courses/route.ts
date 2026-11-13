import { NextResponse } from "next/server";

import { listCourses } from "@/lib/canvas";
import { getCanvasCredentials } from "@/lib/canvas-account";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";

export async function GET() {
  try {
    const user = await requireUser();
    const { credentials } = await getCanvasCredentials(user.id);
    const canvasCourses = await listCourses(credentials);
    const sb = supabaseAdmin();
    const { data: rows, error } = await sb
      .from("courses")
      .upsert(canvasCourses.map((course) => ({
        user_id: user.id,
        canvas_course_id: course.id,
        course_code: course.course_code || null,
        course_name: course.name,
      })), { onConflict: "user_id,canvas_course_id" })
      .select("id, canvas_course_id, course_code, course_name, selected_for_rag, rag_indexed_at");
    if (error) throw error;
    return NextResponse.json({ courses: rows ?? [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("onboarding course fetch failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not load your Canvas courses" }, { status: 502 });
  }
}
