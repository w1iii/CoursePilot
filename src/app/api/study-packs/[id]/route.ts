import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid study pack ID" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("study_packs").select("*,study_pack_items(*),course:courses(course_name,course_code)").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Study pack not found" }, { status: 404 });
    invalidateUserCache(user.id);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-packs.load", error, "Could not load study pack"); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid study pack ID" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("study_packs").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Study pack not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-packs.delete", error, "Could not delete study pack"); }
}
