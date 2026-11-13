import { redirect } from "next/navigation";

import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const user = await requireUser();
  const { data } = await supabaseAdmin().from("users")
    .select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (data?.onboarding_completed_at) redirect("/dashboard/thread");
  return <OnboardingFlow />;
}
