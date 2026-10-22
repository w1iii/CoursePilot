import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
}

export async function requireUser(): Promise<AppUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? `${userId}@placeholder.local`;
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || null : null;

  const { data, error } = await supabaseAdmin()
    .from("users")
    .upsert(
      { clerk_user_id: userId, email, full_name: fullName },
      { onConflict: "clerk_user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert user: ${error?.message ?? "no row returned"}`);
  }
  return data as AppUser;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
