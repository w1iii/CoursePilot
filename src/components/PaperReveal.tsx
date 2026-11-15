"use client";

import { useEffect, useRef } from "react";
import { animate, createScope } from "animejs";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function PaperReveal({ children, className, delay = 0 }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      if (self?.matches.reduceMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      animate(root.current!, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 700,
        delay,
        ease: "out(3)",
      });
    });
    return () => scope.revert();
  }, [delay]);

  return <div ref={root} className={`paper-reveal${className ? ` ${className}` : ""}`}>{children}</div>;
}
