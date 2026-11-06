"use client";

import { useEffect, useRef, useState } from "react";
import ThreadSidebar from "./ThreadSidebar";

interface Props {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  activeThreadId?: string;
}

export default function DashboardShell({ children, userName, userEmail, activeThreadId }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem("habi:sidebar-collapsed") === "true");
    } catch {
      // Use the expanded default when storage is unavailable.
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((collapsed) => {
          const next = !collapsed;
          try {
            localStorage.setItem("habi:sidebar-collapsed", String(next));
          } catch {
            // The layout remains usable without persistence.
          }
          return next;
        });
      }
      if (event.key === "Escape" && mobileOpen) setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem("habi:sidebar-collapsed", String(next));
      } catch {
        // The layout remains usable without persistence.
      }
      return next;
    });
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <ThreadSidebar
        activeThreadId={activeThreadId}
        userName={userName}
        userEmail={userEmail}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-accent p-2 text-on-accent shadow-sm transition-colors hover:bg-accent-hover md:hidden"
        aria-label="Open navigation"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
