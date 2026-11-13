import SyncProvider from "./SyncProvider";
import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { data } = await supabaseAdmin().from("users")
    .select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (!data?.onboarding_completed_at) redirect("/onboarding");
  return <SyncProvider>{children}</SyncProvider>;
}
