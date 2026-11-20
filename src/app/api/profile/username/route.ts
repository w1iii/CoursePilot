import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api-validation";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser, UnauthorizedError } from "@/lib/user";

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonObject(request);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    if (!body || Object.keys(body).some((key) => key !== "username") || username.length < 1 || username.length > 40 || /[\p{Cc}\p{Cf}]/u.test(username)) {
      return NextResponse.json({ error: "Enter a username between 1 and 40 characters." }, { status: 400 });
    }
    const { error } = await supabaseAdmin().from("users").update({ username }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ username }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("username update failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not save username. Please try again." }, { status: 500 });
  }
}
