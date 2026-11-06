"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { resolveTheme, toggleTheme, type ResolvedTheme } from "@/lib/theme";

export interface SavedThread {
  id: string;
  title: string;
  updatedAt: string;
}

export const THREADS_CHANGED_EVENT = "habi:threads-changed";

interface Props {
  activeThreadId?: string;
  userName: string;
  userEmail: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ThreadSidebar({
  activeThreadId,
  userName,
  userEmail,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}: Props) {
  const pathname = usePathname();
  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const syncTheme = () => setTheme(resolveTheme());
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", syncTheme);

    return () => {
      observer.disconnect();
      query.removeEventListener("change", syncTheme);
    };
  }, []);

  function handleThemeToggle() {
    setTheme(toggleTheme());
    onCloseMobile();
  }

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch("/api/threads", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as SavedThread[];
      setThreads(data);
    };
    void refresh();
    window.addEventListener(THREADS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(THREADS_CHANGED_EVENT, refresh);
  }, []);

  const groupedThreads = useMemo(() => {
    const filtered = threads.filter((thread) =>
      thread.title.toLowerCase().includes(search.toLowerCase()),
    );
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = startOfToday - 86_400_000;
    const week = startOfToday - 7 * 86_400_000;
    return [
      { label: "Today", items: filtered.filter((thread) => new Date(thread.updatedAt).getTime() >= startOfToday) },
      { label: "Yesterday", items: filtered.filter((thread) => {
        const time = new Date(thread.updatedAt).getTime();
        return time >= yesterday && time < startOfToday;
      }) },
      { label: "Previous 7 days", items: filtered.filter((thread) => new Date(thread.updatedAt).getTime() < yesterday && new Date(thread.updatedAt).getTime() >= week) },
    ].filter((group) => group.items.length > 0);
  }, [search, threads]);

  async function deleteThread(threadId: string) {
    try {
      const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}`, { method: "DELETE" });
      if (!response.ok) return;
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
      window.dispatchEvent(new Event(THREADS_CHANGED_EVENT));
    } catch {
      // Keep the existing item visible when the request fails.
    }
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-primary/20 lg:hidden"
        />
      )}
      <aside
        id="habi-sidebar"
        aria-label="Sidebar"
        className={`z-40 flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-container-low text-on-surface transition-[width,transform] duration-200 ${
          collapsed ? "w-[52px]" : "w-[240px]"
        } ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-[min(260px,85vw)] translate-x-0 shadow-[8px_0_28px_var(--shadow-color)]"
            : "fixed inset-y-0 left-0 -translate-x-full md:static md:translate-x-0 md:shadow-none"
        } md:flex`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border px-3 ${
            collapsed ? "w-[52px]" : "w-[240px]"
          } ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-1.5">
            <span
              className={`font-headline-md text-headline-md lowercase tracking-tight text-primary-container ${
                collapsed ? "hidden" : ""
              }`}
            >
              habi
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-container hover:text-primary-container md:block"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            aria-controls="habi-sidebar"
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? "left_panel_open" : "left_panel_close"}
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-container md:hidden"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className={`${collapsed ? "w-[52px] px-1.5" : "w-[240px]"} shrink-0 p-2`}>
          <Link
            href="/dashboard/thread"
            onClick={onCloseMobile}
            className={`group flex min-h-9 items-center gap-2 rounded-lg bg-accent px-2.5 py-2 font-label-md text-label-md text-on-accent shadow-sm transition-colors hover:bg-accent-hover ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "New chat" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className={collapsed ? "hidden" : ""}>New chat</span>
            <span className="ml-auto hidden rounded bg-on-accent/15 px-1.5 py-0.5 font-code-tag text-[10px] text-on-accent/80 group-hover:inline">
              ⌘K
            </span>
          </Link>
        </div>

        <div
          className={`${collapsed ? "w-[52px] px-1.5" : "w-[240px] px-2"} min-h-0 flex-1 overflow-y-auto pb-3`}
        >
          <nav className="mb-4 space-y-0.5">
            {[
              { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
            ].map((item) => {
              const active =
                item.label === "Chats"
                  ? pathname.startsWith("/dashboard/thread")
                  : item.href === "/dashboard" && pathname === "/dashboard";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={`flex min-h-8 items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm transition-colors ${
                    collapsed ? "justify-center px-0" : ""
                  } ${
                    active
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-text-muted hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span className={collapsed ? "hidden" : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {!collapsed && (
            <label className="relative mb-4 block">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[17px] text-text-muted">
                search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats"
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2.5 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-text-muted focus:border-tertiary-container"
              />
            </label>
          )}
          <p
            className={`px-2 pb-1.5 pt-1.5 text-[11px] leading-4 text-text-muted ${
              collapsed ? "hidden" : ""
            }`}
          >
            Recents
          </p>
          {!collapsed && threads.length === 0 ? (
            <p className="px-2 py-1.5 font-body-sm text-body-sm text-text-muted">
              Your conversations will appear here.
            </p>
          ) : !collapsed ? (
            <div className="space-y-3">
              {groupedThreads.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1 text-[11px] leading-4 text-text-muted">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((thread) => (
                      <div
                        key={thread.id}
                        className={`group flex min-h-7 items-center gap-1 rounded-lg px-2 py-0.5 font-body-sm text-xs transition-colors ${
                          activeThreadId === thread.id
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-text-muted hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        <Link
                          href={`/dashboard/thread?tid=${encodeURIComponent(thread.id)}`}
                          onClick={onCloseMobile}
                          className="min-w-0 flex-1 truncate"
                        >
                          {thread.title}
                        </Link>
                        <span className="shrink-0 font-code-tag text-[9px] opacity-70">
                          {dateLabel(thread.updatedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteThread(thread.id)}
                          className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-error-container hover:text-on-error-container group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Delete ${thread.title}`}
                          title="Delete chat"
                        >
                          <span className="material-symbols-outlined text-[8px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {groupedThreads.length === 0 && (
                <p className="px-3 py-2 font-body-sm text-body-sm text-text-muted">
                  No matching chats.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className={`${collapsed ? "w-[52px] px-1.5" : "w-[240px]"} shrink-0 border-t border-border p-2`}>
          <button
            type="button"
            onClick={handleThemeToggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={`mb-1 flex min-h-8 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm text-text-muted transition-colors hover:bg-surface-container hover:text-on-surface ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
            <span className={collapsed ? "hidden" : ""}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <Link
            href="/dashboard/settings"
            onClick={onCloseMobile}
            title={collapsed ? "Settings" : undefined}
            className={`mb-1 flex min-h-8 items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm text-text-muted transition-colors hover:bg-surface-container hover:text-on-surface ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span className={collapsed ? "hidden" : ""}>Settings</span>
          </Link>
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              onClick={onCloseMobile}
              title={collapsed ? "Log out" : undefined}
              className={`mt-1 flex min-h-8 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm text-text-muted transition-colors hover:bg-error-container hover:text-on-error-container ${
                collapsed ? "justify-center px-0" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className={collapsed ? "hidden" : ""}>Log out</span>
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
