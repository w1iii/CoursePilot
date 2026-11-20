import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api-validation";
import { invalidateUserCache } from "@/lib/cache";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body || Object.keys(body).length !== 1 || body.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  try {
    const sb = supabaseAdmin();
    const { data: user, error: lookupError } = await sb.from("users").select("id").eq("clerk_user_id", userId).maybeSingle();
    if (lookupError) throw lookupError;
    const { error } = await sb.rpc("delete_account_data", { p_clerk_user_id: userId });
    if (error) throw error;
    if (user) invalidateUserCache(user.id);
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("account deletion failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Account deletion could not be completed. Please retry or contact support." }, { status: 500 });
  }
}
