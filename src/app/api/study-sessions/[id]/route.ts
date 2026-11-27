import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid, readJsonObject } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("study_sessions")
      .select("*,study_attempts(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return apiFailure("study-sessions.load", error, "Could not load session");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params; const input = await readJsonObject(request);
    if (!isUuid(id) || !input || Object.keys(input).some((key) => !["status", "current_item"].includes(key)) || Object.keys(input).length === 0 || (input.status !== undefined && !["in_progress", "paused", "completed"].includes(input.status as string)) || (input.current_item !== undefined && (!Number.isInteger(input.current_item) || (input.current_item as number) < 0 || (input.current_item as number) > 1000))) return NextResponse.json({ error: "Invalid session update" }, { status: 400 });
    const { data, error } = await supabaseAdmin().rpc("update_study_session", {
      p_user_id: user.id, p_session_id: id,
      p_current_item: input.current_item ?? null, p_status: input.status ?? null,
    });
    if (error?.code === "22023") return NextResponse.json({ error: "Save an answer for each question before continuing. Refresh if your progress is out of date." }, { status: 409 });
    if (error) throw error; if (!data) return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 }); invalidateUserCache(user.id); return NextResponse.json(data);
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-sessions.update", error, "Could not update session"); }
}
