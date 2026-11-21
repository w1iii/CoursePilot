import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: "Invalid study pack ID" }, { status: 400 }); const { data, error } = await supabaseAdmin().from("study_sessions").select("*").eq("pack_id", id).eq("user_id", user.id).order("last_active_at", { ascending: false }); if (error) throw error; return NextResponse.json(data ?? []); }
  catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-sessions.list", error, "Could not load sessions"); }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await params; if (!isUuid(id)) return NextResponse.json({ error: "Invalid study pack ID" }, { status: 400 }); const db = supabaseAdmin();
    const { data: pack, error: packError } = await db.from("study_packs").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (packError) throw packError;
    if (!pack) return NextResponse.json({ error: "Study pack not found" }, { status: 404 });
    const { data, error } = await db.from("study_sessions").insert({ pack_id: id, user_id: user.id }).select().single(); if (error) throw error; invalidateUserCache(user.id); return NextResponse.json(data, { status: 201 });
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-sessions.create", error, "Could not start session"); }
}
