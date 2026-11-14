import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/api-validation";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, sessionId } = await params;
    if (!isUuid(id) || !isUuid(sessionId)) return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    const { data, error } = await supabaseAdmin()
      .from("study_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("pack_id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Study session not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("study session delete failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not delete study session" }, { status: 500 });
  }
}
