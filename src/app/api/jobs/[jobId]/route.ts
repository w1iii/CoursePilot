import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/api-validation";

// Explicit dismissal, shared across tabs and devices.
export async function PATCH(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireUser();
    const { jobId } = await params;
    if (!isUuid(jobId)) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("background_jobs")
      .update({ read_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", user.id)
      .in("status", ["succeeded", "partial_failure", "failed"]).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Finished job not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof UnauthorizedError ? "Unauthorized" : "Could not dismiss notification" },
      { status: error instanceof UnauthorizedError ? 401 : 500 });
  }
}
