import { requireUser } from "@/lib/user";
import DashboardShell from "../DashboardShell";
import StudyPrepHome from "./study-prep-home";

function displayName(value: string | null | undefined, email: string): string {
  const name = value?.trim() || email.split("@")[0] || "student";
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function Page() {
  const user = await requireUser();

  return (
    <DashboardShell userName={user.username?.trim() || displayName(user.full_name, user.email)} userEmail={user.email}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <StudyPrepHome />
      </div>
    </DashboardShell>
  );
}
