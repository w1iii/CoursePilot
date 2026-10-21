import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_TYPES = new Set(["assignment", "quiz", "exam", "project", "activity", "reading"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

export async function GET() {
  try {
    const user = await requireUser();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("academic_tasks")
      .select("id, course_id, canvas_task_id, title, description, type, due_date, priority, status, is_manual, notes, created_at, courses(course_name, course_code)")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);

    // Only expose tasks belonging to this user's courses.
    const { data: courseIds } = await sb
      .from("courses")
      .select("id")
      .eq("user_id", user.id);
    const allowed = new Set((courseIds ?? []).map((c) => c.id));
    const tasks = (data ?? []).filter((t) => allowed.has(t.course_id));

    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { title, courseId, description, type, dueDate, priority, notes } = body ?? {};
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }
    if (type && !VALID_TYPES.has(type)) {
      return NextResponse.json({ error: `type must be one of: ${[...VALID_TYPES].join(", ")}` }, { status: 400 });
    }
    if (priority && !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: `priority must be one of: ${[...VALID_PRIORITIES].join(", ")}` }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: course } = await sb
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single();
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data, error } = await sb
      .from("academic_tasks")
      .insert({
        course_id: courseId,
        title,
        description: description ?? null,
        type: type ?? "assignment",
        due_date: dueDate ?? null,
        priority: priority ?? "medium",
        notes: notes ?? null,
        is_manual: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
