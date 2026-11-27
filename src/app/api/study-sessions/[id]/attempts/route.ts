import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";
import { isUuid, readJsonObject } from "@/lib/api-validation";
import { apiFailure } from "@/lib/api-error";
import { hasUnsafeStudyCharacters } from "@/lib/study-focus";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(); const { id } = await params; const input = await readJsonObject(request);
    if (!isUuid(id) || !input || Object.keys(input).some((key) => !["itemId", "answer", "isCorrect", "confidence"].includes(key)) || !isUuid(input.itemId) || typeof input.answer !== "string" || input.answer.length > 4000 || typeof input.isCorrect !== "boolean" || (input.confidence != null && (!Number.isInteger(input.confidence) || (input.confidence as number) < 1 || (input.confidence as number) > 5))) return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    if (hasUnsafeStudyCharacters(input.answer)) return NextResponse.json({ error: "Remove hidden control characters from your answer.", field: "answer" }, { status: 400 });
    const { data, error } = await supabaseAdmin().rpc("save_study_attempt", {
      p_user_id: user.id, p_session_id: id, p_item_id: input.itemId,
      p_answer: input.answer, p_is_correct: input.isCorrect, p_confidence: input.confidence ?? null,
    });
    if (error?.code === "22023") return NextResponse.json({ error: "Choose a listed option or enter a nonblank written answer.", field: "answer" }, { status: 400 });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Session or question not found, or session already completed" }, { status: 404 });
    invalidateUserCache(user.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) { if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return apiFailure("study-attempts.save", error, "Could not save answer"); }
}
