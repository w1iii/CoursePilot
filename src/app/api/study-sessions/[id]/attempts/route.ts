import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid, readJsonObject } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params; const input = await readJsonObject(request);
    if (!isUuid(id) || !input || Object.keys(input).some((key) => !["itemId", "answer", "isCorrect", "confidence"].includes(key)) || !isUuid(input.itemId) || typeof input.answer !== "string" || input.answer.length > 4000 || typeof input.isCorrect !== "boolean" || (input.confidence != null && (!Number.isInteger(input.confidence) || (input.confidence as number) < 1 || (input.confidence as number) > 5))) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    const db = supabaseAdmin(); const { data: session, error: sessionError } = await db.from("study_sessions").select("id,pack_id,status").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || session.status === "completed") return NextResponse.json({ error: "Session not found or completed" }, { status: 404 });
    const { data: item, error: itemError } = await db.from("study_pack_items").select("id,item_type,answer,correct_option,options").eq("id", input.itemId).eq("pack_id", session.pack_id).maybeSingle();
    if (itemError) throw itemError;
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const isCorrect = item.item_type === "multiple_choice"
      ? Array.isArray(item.options) && item.options[item.correct_option ?? -1] === input.answer
      : input.isCorrect;
    const { data, error } = await db.from("study_attempts").upsert({ session_id: id, item_id: input.itemId, answer: input.answer, is_correct: isCorrect, confidence: input.confidence ?? null }, { onConflict: "session_id,item_id" }).select().single();
    if (error) throw error;
    const { count, error: countError } = await db.from("study_attempts").select("id", { count: "exact", head: true }).eq("session_id", id).eq("is_correct", true);
    if (countError) throw countError;
    const { error: updateError } = await db.from("study_sessions").update({ score: count ?? 0, last_active_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).neq("status", "completed");
    if (updateError) throw updateError;
    invalidateUserCache(user.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-attempts.save", error, "Could not save answer"); }
}
