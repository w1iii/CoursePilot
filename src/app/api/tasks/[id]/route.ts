import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_STATUSES = new Set(["pending", "completed"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

async function ownsTask(userId: string, taskId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("academic_tasks")
    .select("id, is_manual, course_id, courses!inner(user_id)")
    .eq("id", taskId)
    .single();
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

    const existing = await ownsTask(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body?.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "status must be pending or completed" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body?.priority !== undefined) {
      if (!VALID_PRIORITIES.has(body.priority)) {
        return NextResponse.json({ error: "priority must be low, medium, or high" }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    if (body?.notes !== undefined) updates.notes = body.notes;
    if (body?.title !== undefined) updates.title = body.title;
    if (body?.dueDate !== undefined) updates.due_date = body.dueDate;

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
    return NextResponse.json({ task: data });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

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

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
