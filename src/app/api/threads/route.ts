import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheUserRead } from "@/lib/cache";
import { logServerError } from "@/lib/server-error";

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await cacheUserRead("thread-list", user.id, 15, async () => await supabaseAdmin()
      .from("chat_threads")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(50));
    if (error) throw new Error(`Failed to load chat threads: ${error.message}`);
    return NextResponse.json(
      (data ?? []).map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updated_at,
      })),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const requestId = logServerError("threads.list", error);
    return NextResponse.json({ error: "Failed to load chat threads" }, { status: 500, headers: { "X-Request-ID": requestId } });
  }
}
