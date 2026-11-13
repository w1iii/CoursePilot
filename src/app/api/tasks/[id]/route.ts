import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserResourceCache } from "@/lib/cache";
import { enforceTaskWriteLimit, optionalDate, optionalText, readTaskJson, RequestValidationError } from "@/lib/task-api";

const VALID_STATUSES = new Set(["pending", "completed"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_TYPES = new Set(["assignment", "quiz", "exam", "project", "activity", "reading"]);

async function ownsTask(userId: string, taskId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("academic_tasks")
    .select("id, is_manual, course_id, courses!inner(user_id)")
    .eq("id", taskId)
    .single();
  if (error) throw new Error("Task ownership lookup failed");
  if (!data) return null;
  const owner = (data.courses as unknown as { user_id: string }).user_id;
  if (owner !== userId) return null;
  return data;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const limited = await enforceTaskWriteLimit(user.id);
    if (limited) return limited;

    const existing = await ownsTask(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await readTaskJson(req) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof RequestValidationError) {
        return NextResponse.json({ error: err.message }, { status: err.message === "Request body too large" ? 413 : 400 });
      }
      throw err;
    }
    const allowedFields = new Set(["status", "priority", "type", "notes", "title", "dueDate"]);
    if (Object.keys(body).some((key) => !allowedFields.has(key))) {
      throw new RequestValidationError("Unknown task field");
    }
    const updates: Record<string, unknown> = {};

    if (body?.status !== undefined) {
      if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "status must be pending or completed" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body?.priority !== undefined) {
      if (typeof body.priority !== "string" || !VALID_PRIORITIES.has(body.priority)) {
        return NextResponse.json({ error: "priority must be low, medium, or high" }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    if (body?.type !== undefined) {
      if (typeof body.type !== "string" || !VALID_TYPES.has(body.type)) {
        return NextResponse.json(
          { error: `type must be one of: ${[...VALID_TYPES].join(", ")}` },
          { status: 400 },
        );
      }
      updates.type = body.type;
    }
    if (body.notes !== undefined) updates.notes = optionalText(body.notes, "notes", 8_000);
    if (body.title !== undefined) {
      const title = optionalText(body.title, "title", 255);
      if (!title?.trim()) throw new RequestValidationError("title must not be empty");
      updates.title = title.trim();
    }
    if (body.dueDate !== undefined) updates.due_date = optionalDate(body.dueDate);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    updates.updated_at = new Date().toISOString();

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("academic_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    invalidateUserResourceCache(user.id, "tasks", "dashboard-tasks", "dashboard-deadlines");
    return NextResponse.json({ task: data });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof RequestValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.message === "Request body too large" ? 413 : 400 });
    }
    console.error("task update failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const limited = await enforceTaskWriteLimit(user.id);
    if (limited) return limited;

    const existing = await ownsTask(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!existing.is_manual) {
      return NextResponse.json(
        { error: "Canvas-synced tasks cannot be deleted. Mark them completed instead." },
        { status: 400 },
      );
    }

    const sb = supabaseAdmin();
    const { error } = await sb.from("academic_tasks").delete().eq("id", id);
    if (error) throw new Error(error.message);

    invalidateUserResourceCache(user.id, "tasks", "dashboard-tasks", "dashboard-deadlines");
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("task delete failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
