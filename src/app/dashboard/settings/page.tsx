import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <div className="min-h-full overflow-y-auto bg-background px-gutter-mobile py-space-xl md:px-gutter lg:px-margin-desktop lg:py-space-2xl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-space-xl">
          <p className="font-code-tag text-code-tag uppercase tracking-widest text-text-muted">
            Account
          </p>
          <h1 className="font-headline-lg text-headline-lg text-primary-container">Settings</h1>
          <p className="font-body-md text-body-md text-text-muted">
            Manage your profile and account preferences.
          </p>
        </div>
        <UserProfile path="/dashboard/settings" routing="path" />
      </div>
    </div>
  );
}
