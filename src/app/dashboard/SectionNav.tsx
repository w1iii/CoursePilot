"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "announcements", label: "Announcements" },
  { id: "courses", label: "Courses" },
  { id: "tasks", label: "Tasks" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const SCROLL_DURATION = 900;
const ACTIVE_OFFSET = 140;

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export default function SectionNav() {
  const [active, setActive] = useState<SectionId>("announcements");
  const navRef = useRef<HTMLElement>(null);
  const animationRef = useRef<number | null>(null);
  const lockUntilRef = useRef(0);

  const scrollToSection = useCallback((id: SectionId) => {
    const scroller = document.getElementById("dashboard-scroll");
    const section = document.getElementById(id);
    if (!scroller || !section) return;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setActive(id);
    lockUntilRef.current = performance.now() + SCROLL_DURATION + 150;

    const navHeight = navRef.current?.offsetHeight ?? 0;
    const start = scroller.scrollTop;
    const target =
      start +
      section.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top -
      navHeight -
      12;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    const destination = Math.max(0, Math.min(target, maxScroll));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scroller.scrollTop = destination;
      return;
    }

    const startedAt = performance.now();
    const distance = destination - start;

    function step(now: number) {
      const progress = Math.min(1, (now - startedAt) / SCROLL_DURATION);
      scroller!.scrollTop = start + distance * easeInOutCubic(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
      }
    }

    animationRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const scroller = document.getElementById("dashboard-scroll");
    if (!scroller) return;

    let frame = 0;

    const updateActive = () => {
      frame = 0;
      if (performance.now() < lockUntilRef.current) return;

      const scrollerTop = scroller.getBoundingClientRect().top;
      let current: SectionId = "announcements";
      let closestTop = Number.NEGATIVE_INFINITY;

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        const top = element.getBoundingClientRect().top - scrollerTop;
        if (top <= ACTIVE_OFFSET && top > closestTop) {
          closestTop = top;
          current = section.id;
        }
      }

      if (
        scroller.scrollTop + scroller.clientHeight >=
        scroller.scrollHeight - 8
      ) {
        current = "tasks";
      }

      setActive((previous) => (previous === current ? previous : current));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    };

    updateActive();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Dashboard sections"
      className="sticky top-0 z-20 border-y border-primary-container/25 bg-background/95 py-2 backdrop-blur-sm"
    >
      <ul className="flex items-center justify-center gap-space-lg sm:gap-space-xl">
        {SECTIONS.map((section) => {
          const isActive = active === section.id;

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={isActive ? "true" : undefined}
                className={`paper-kicker relative block px-1 pb-1.5 pt-1 text-center transition-colors ${
                  isActive
                    ? "text-primary-container"
                    : "text-text-muted hover:text-on-surface"
                }`}
              >
                {section.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-[2px] transition-colors ${
                    isActive ? "bg-primary-container" : "bg-transparent"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
