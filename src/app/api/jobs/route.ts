import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateUserCache } from "@/lib/cache";

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await supabaseAdmin().from("background_jobs")
      .select("id,kind,status,progress,result,error,created_at,finished_at,read_at")
      .eq("user_id", user.id)
      .or("status.in.(queued,running),read_at.is.null")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof UnauthorizedError ? "Unauthorized" : "Could not load background work" },
      { status: error instanceof UnauthorizedError ? 401 : 500 });
  }
}

// Revalidation must run inside Next, not in the standalone worker process.
export async function POST() {
  try {
    const user = await requireUser();
    invalidateUserCache(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof UnauthorizedError ? "Unauthorized" : "Could not refresh data" },
      { status: error instanceof UnauthorizedError ? 401 : 500 });
  }
}
