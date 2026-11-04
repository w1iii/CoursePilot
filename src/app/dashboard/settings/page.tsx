import { requireUser } from "@/lib/user";
import DashboardShell from "../DashboardShell";
import SettingsNav from "./SettingsNav";

function normalizeName(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );

  return (
    <DashboardShell
      userName={displayName}
      userEmail={user.email}
    >
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
          <div className="mb-space-xl shrink-0 rounded-xl p-space-xl">
            <p className="font-code-tag text-code-tag uppercase tracking-widest text-text-muted">
              Account
            </p>
            <h1 className="font-headline-lg text-headline-lg text-primary-container">Settings</h1>
            <p className="font-body-md text-body-md text-text-muted">
              Manage your account preferences.
            </p>
          </div>
          <SettingsNav />
          <div className="min-h-0 w-full flex-1 overflow-hidden rounded-xl bg-transparent p-0 pb-space-xl">
            <div className="rounded-xl p-space-xl">
              <p className="font-label-md text-label-md text-primary-container">Workspace preferences</p>
              <p className="mt-1 font-body-md text-body-md text-text-muted">
                Settings for your Habi workspace will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
