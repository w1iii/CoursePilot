import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-rule)_1px,transparent_1px)] opacity-[0.05] [background-size:16px_16px]" />
      <div className="relative">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard/thread"
        />
      </div>
    </main>
  );
}
