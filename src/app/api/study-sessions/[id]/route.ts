import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params; const input = await request.json();
    if (input.status !== undefined && !["in_progress", "paused", "completed"].includes(input.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const values: Record<string, unknown> = { last_active_at: new Date().toISOString() };
    if (Number.isInteger(input.current_item) && input.current_item >= 0) values.current_item = input.current_item;
    if (["in_progress", "paused", "completed"].includes(input.status)) { values.status = input.status; if (input.status === "completed") values.completed_at = new Date().toISOString(); }
    const { data, error } = await supabaseAdmin().from("study_sessions").update(values).eq("id", id).eq("user_id", user.id).neq("status", "completed").select().maybeSingle();
    if (error) throw error; if (!data) return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 }); invalidateUserCache(user.id); return NextResponse.json(data);
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ error: "Could not update session" }, { status: 500 }); }
}
