import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Mono, DM_Sans, Fraunces } from "next/font/google";
import AuthRedirect from "@/components/AuthRedirect";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Habi — Weave your semester together",
  description:
    "Habi pulls your deadlines, modules, and notes from Canvas LMS into one calm, tidy week.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("habi:theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();',
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-body-md text-body-md text-on-surface">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "var(--accent)",
              colorBackground: "var(--surface)",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            },
            elements: {
              card: "border border-border bg-surface shadow-[0_20px_60px_var(--shadow-color)]",
              headerTitle: "font-display text-primary-container",
              headerSubtitle: "text-text-muted",
              formButtonPrimary:
                "bg-primary-container hover:bg-primary-hover text-dark-text shadow-sm",
              formFieldInput: "border-border bg-surface text-on-surface placeholder:text-text-muted",
              formFieldLabel: "text-on-surface",
              footerActionText: "text-text-muted",
              footerActionLink: "text-primary-container hover:text-primary-hover",
              identityPreviewEditButton: "text-primary-container hover:text-primary-hover",
            },
            options: {
              socialButtonsVariant: "blockButton",
              socialButtonsPlacement: "top",
              showOptionalFields: false,
            },
          }}
        >
          <AuthRedirect />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
