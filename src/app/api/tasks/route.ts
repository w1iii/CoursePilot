import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { cacheUserRead, invalidateUserResourceCache } from "@/lib/cache";
import { enforceTaskWriteLimit, optionalDate, optionalText, readTaskJson, RequestValidationError } from "@/lib/task-api";

const VALID_TYPES = new Set(["assignment", "quiz", "exam", "project", "activity", "reading"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

export async function GET() {
  try {
    const user = await requireUser();

    // Shared per-user budget across limited routes (configured in rate-limit.ts).
    const limit = await checkRateLimit(user.id);
    if (!limit.allowed) {
      if (!limit.enforced) {
        return NextResponse.json({ error: "Rate limiter unavailable" }, {
          status: 503, headers: { "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json(
        {
          error: rateLimitMessage(limit.scope),
          scope: limit.scope,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const sb = supabaseAdmin();

    const { data: courses, error: coursesError } = await cacheUserRead("task-course-ids", user.id, 30, async () => await sb
      .from("courses")
      .select("id")
      .eq("user_id", user.id));

    if (coursesError) throw new Error(coursesError.message);

    const courseIds = (courses ?? []).map((course) => course.id);
    if (courseIds.length === 0) {
      return NextResponse.json({ tasks: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const { data, error } = await cacheUserRead("tasks", user.id, 15, async () => await sb
      .from("academic_tasks")
      .select("id, course_id, canvas_task_id, title, description, type, due_date, priority, status, is_manual, notes, created_at, courses(course_name, course_code)")
      .in("course_id", courseIds)
      .is("removed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }));

    if (error) throw new Error(error.message);

    return NextResponse.json({ tasks: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("task list failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await enforceTaskWriteLimit(user.id);
    if (limited) return limited;
    let body: Record<string, unknown>;
    try {
      body = await readTaskJson(req) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof RequestValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.message === "Request body too large" ? 413 : 400 });
      }
      throw err;
    }

    const { title, courseId, description, type, dueDate, priority, notes } = body ?? {};
    const allowedFields = new Set(["title", "courseId", "description", "type", "dueDate", "priority", "notes"]);
    if (Object.keys(body).some((key) => !allowedFields.has(key))) {
      throw new RequestValidationError("Unknown task field");
    }
    if (typeof title !== "string" || !title.trim() || title.length > 255) {
      throw new RequestValidationError("title is required and must be at most 255 characters");
    }
    if (typeof courseId !== "string" || !/^[0-9a-f-]{36}$/i.test(courseId)) {
      throw new RequestValidationError("courseId must be a valid ID");
    }
    if (type !== undefined && type !== null && (typeof type !== "string" || !VALID_TYPES.has(type))) {
      throw new RequestValidationError(`type must be one of: ${[...VALID_TYPES].join(", ")}`);
    }
    if (priority !== undefined && priority !== null && (typeof priority !== "string" || !VALID_PRIORITIES.has(priority))) {
      throw new RequestValidationError(`priority must be one of: ${[...VALID_PRIORITIES].join(", ")}`);
    }
    const safeDescription = optionalText(description, "description", 20_000);
    const safeNotes = optionalText(notes, "notes", 8_000);
    const safeDueDate = optionalDate(dueDate);

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
        title: title.trim(),
        description: safeDescription,
        type: type ?? "assignment",
        due_date: safeDueDate,
        priority: priority ?? "medium",
        notes: safeNotes,
        is_manual: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    invalidateUserResourceCache(user.id, "tasks", "dashboard-tasks", "dashboard-deadlines");
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof RequestValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.message === "Request body too large" ? 413 : 400 });
    }
    console.error("task create failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
