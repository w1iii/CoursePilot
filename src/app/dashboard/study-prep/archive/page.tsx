import { requireUser } from "@/lib/user";
import DashboardShell from "../../DashboardShell";
import StudyPrepHome from "../study-prep-home";

export default async function ArchivePage() {
  const user = await requireUser();
  const name = user.username?.trim() || user.full_name?.trim() || user.email.split("@")[0] || "student";
  return <DashboardShell userName={name} userEmail={user.email}>
    <div className="min-h-0 flex-1 overflow-y-auto"><StudyPrepHome archive /></div>
  </DashboardShell>;
}
