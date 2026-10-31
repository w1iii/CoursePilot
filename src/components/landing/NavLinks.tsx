"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { id: "how-it-works", label: "How it works" },
  { id: "weave-preview", label: "Weave View" },
  { id: "ask-habi", label: "Ask Habi" },
  { id: "features", label: "Features" },
  { id: "faq", label: "FAQ" },
];

const HEADER_OFFSET = 96;

export default function NavLinks() {
  const [active, setActive] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (atBottom) {
        setActive(LINKS[LINKS.length - 1].id);
        return;
      }

      let current: string | null = null;
      for (const link of LINKS) {
        const section = document.getElementById(link.id);
        if (section && section.getBoundingClientRect().top <= HEADER_OFFSET) {
          current = link.id;
        }
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
  }, []);

  // Light up the clicked item immediately, even before the glide starts.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(null), 900);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const current = pending ?? active;

  return (
    <nav className="hidden items-center gap-space-lg lg:flex" aria-label="Sections">
      {LINKS.map((link) => {
        const isActive = current === link.id;
        return (
          <a
            key={link.id}
            href={`#${link.id}`}
            aria-current={isActive ? "location" : undefined}
            onClick={() => {
              setActive(link.id);
              setPending(link.id);
            }}
            className={
              isActive
                ? "rounded-lg bg-surface-container-high px-space-md py-space-xs font-bold text-primary"
                : "px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            }
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
