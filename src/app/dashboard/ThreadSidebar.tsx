"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export interface SavedThread {
  id: string;
  title: string;
  updatedAt: string;
}

export const THREAD_INDEX_KEY = "habi:threads";
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

function readThreads(): SavedThread[] {
  try {
    const value = JSON.parse(localStorage.getItem(THREAD_INDEX_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
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

  useEffect(() => {
    const refresh = () => setThreads(readThreads());
    refresh();
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
          collapsed ? "w-14" : "w-[260px]"
        } ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-[min(280px,85vw)] translate-x-0 shadow-[8px_0_28px_rgba(21,55,13,0.16)]"
            : "fixed inset-y-0 left-0 -translate-x-full md:static md:translate-x-0 md:shadow-none"
        } md:flex`}
      >
        <div
          className={`flex h-16 w-[260px] shrink-0 items-center border-b border-border px-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2">
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

        <div className={`w-[260px] shrink-0 p-3 ${collapsed ? "px-2" : ""}`}>
          <Link
            href="/dashboard/thread"
            onClick={onCloseMobile}
            className={`group flex items-center gap-2 rounded-lg bg-primary-container py-2.5 font-label-md text-label-md text-dark-text shadow-sm transition-colors hover:bg-primary-hover ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
            title={collapsed ? "New chat" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className={collapsed ? "hidden" : ""}>New chat</span>
            <span className="ml-auto hidden rounded bg-white/15 px-1.5 py-0.5 font-code-tag text-[10px] text-dark-text/80 group-hover:inline">
              ⌘K
            </span>
          </Link>
        </div>

        <div
          className={`w-[260px] min-h-0 flex-1 overflow-y-auto pb-4 ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          <nav className="mb-5 space-y-1">
            {[
              { label: "Chats", icon: "chat_bubble", href: "/dashboard/thread" },
              { label: "Projects", icon: "folder", href: "/dashboard#courses" },
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
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-colors ${
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
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-text-muted">
                search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 font-body-sm text-body-sm text-on-surface outline-none placeholder:text-text-muted focus:border-tertiary-container"
              />
            </label>
          )}
          <p
            className={`px-3 pb-2 pt-2 font-code-tag text-[10px] uppercase tracking-wider text-text-muted ${
              collapsed ? "hidden" : ""
            }`}
          >
            Recent chats
          </p>
          {!collapsed && threads.length === 0 ? (
            <p className="px-3 py-2 font-body-sm text-body-sm text-text-muted">
              Your conversations will appear here.
            </p>
          ) : !collapsed ? (
            <div className="space-y-4">
              {groupedThreads.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 font-code-tag text-[10px] uppercase tracking-wider text-text-muted">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/dashboard/thread?tid=${encodeURIComponent(thread.id)}`}
                        onClick={onCloseMobile}
                        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 font-body-sm text-body-sm transition-colors ${
                          activeThreadId === thread.id
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-text-muted hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        <span className="min-w-0 truncate">{thread.title}</span>
                        <span className="shrink-0 font-code-tag text-[10px] opacity-70">
                          {dateLabel(thread.updatedAt)}
                        </span>
                      </Link>
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

        <div className={`w-[260px] shrink-0 border-t border-border p-3 ${collapsed ? "px-2" : ""}`}>
          <div
            className={`flex items-center gap-2 rounded-lg py-2 ${
              collapsed ? "justify-center px-0" : "px-2"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-sm text-label-sm font-semibold text-on-secondary-container">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
              <p className="truncate font-label-sm text-label-sm text-on-surface">{userName}</p>
              <p className="truncate font-code-tag text-[10px] text-text-muted">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
