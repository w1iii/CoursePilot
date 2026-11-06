"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
  { label: "Profile", href: "/dashboard/profile", icon: "person" },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings navigation"
      className="mb-space-xl flex shrink-0 items-center gap-1 border-b border-border"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 font-label-md text-label-md transition-colors ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:border-border hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
