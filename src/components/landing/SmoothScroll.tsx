"use client";

import { useEffect } from "react";

const HEADER_OFFSET = 80;
const DURATION = 720;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Gliding scroll for in-page anchors. Driven by rAF instead of CSS
 * `scroll-behavior` so it works even when the OS requests reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    let frame = 0;

    function cancel() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function scrollToTarget(target: HTMLElement, hash: string) {
      cancel();

      const start = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const destination = Math.min(
        Math.max(target.getBoundingClientRect().top + start - HEADER_OFFSET, 0),
        max,
      );

      if (Math.abs(destination - start) < 2) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        return;
      }

      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }

      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / DURATION, 1);
        window.scrollTo(0, start + (destination - start) * easeInOutCubic(progress));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          frame = 0;
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      };
      frame = requestAnimationFrame(step);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = anchor?.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      scrollToTarget(target, hash);
    }

    // Let the user take over mid-glide.
    const interrupt = () => cancel();

    document.addEventListener("click", onClick);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });

    return () => {
      cancel();
      document.removeEventListener("click", onClick);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
    };
  }, []);

  return null;
}
