"use client";

import { useEffect, useRef } from "react";

export interface OrbitCourse {
  id: string;
  name: string;
  code: string | null;
}

interface Props {
  courses: OrbitCourse[];
  activeCourseId: string;
  onSelectCourse: (course: OrbitCourse) => void;
  onHubClick: () => void;
  compact?: boolean;
}

const NODE_COLORS = [
  "var(--color-rule)",
  "var(--color-accent)",
  "var(--color-link)",
  "var(--color-text-muted)",
  "var(--color-secondary)",
  "var(--color-outline)",
  "var(--color-accent)",
];
const ICONS = ["code", "biotech", "calculate", "history_edu", "hub", "menu_book", "science"];
const INNER_ANGLES = [30, 150, 270];
const OUTER_ANGLES = [90, 210, 330];

export default function LoomOrbit({
  courses,
  activeCourseId,
  onSelectCourse,
  onHubClick,
  compact = false,
}: Props) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hubRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const orbit = orbitRef.current;
    const svg = svgRef.current;
    const hub = hubRef.current;
    if (!orbit || !svg || !hub) return;

    let frame = 0;
    const linePool: SVGLineElement[] = [];

    function updateThreads() {
      if (!orbit || !svg || !hub) return;

      const orbitRect = orbit.getBoundingClientRect();
      const hubRect = hub.getBoundingClientRect();
      const hubCenterX = hubRect.left + hubRect.width / 2 - orbitRect.left;
      const hubCenterY = hubRect.top + hubRect.height / 2 - orbitRect.top;
      const nodes = orbit.querySelectorAll<HTMLElement>("[data-orbit-node]");

      while (linePool.length < nodes.length) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("stroke", "var(--color-text-muted)");
        line.setAttribute("stroke-width", "1.2");
        line.setAttribute("stroke-dasharray", "3, 4");
        line.setAttribute("opacity", "0.4");
        svg.appendChild(line);
        linePool.push(line);
      }

      nodes.forEach((node, index) => {
        const nodeRect = node.getBoundingClientRect();
        const line = linePool[index];
        if (!line) return;
        line.setAttribute("x1", hubCenterX.toFixed(1));
        line.setAttribute("y1", hubCenterY.toFixed(1));
        line.setAttribute(
          "x2",
          (nodeRect.left + nodeRect.width / 2 - orbitRect.left).toFixed(1),
        );
        line.setAttribute(
          "y2",
          (nodeRect.top + nodeRect.height / 2 - orbitRect.top).toFixed(1),
        );
      });

      frame = requestAnimationFrame(updateThreads);
    }

    frame = requestAnimationFrame(updateThreads);
    return () => {
      cancelAnimationFrame(frame);
      linePool.forEach((line) => line.remove());
    };
  }, [courses.length]);

  const inner = courses.slice(0, 3);
  const outer = courses.slice(3, 6);

  function renderNode(course: OrbitCourse, index: number, radius: "inner" | "outer", angle: number) {
    const color = NODE_COLORS[index % NODE_COLORS.length];
    const icon = ICONS[index % ICONS.length];
    const distance = radius === "inner" ? 0.27 : 0.36;
    const active = course.id === activeCourseId;

    return (
      <div
        key={course.id}
        className="loom-orbit__item"
        style={{
          transform: `rotate(${angle}deg) translate(calc(var(--size) * ${distance})) rotate(-${angle}deg)`,
        }}
      >
        <div className="loom-orbit__counter">
          <div className="loom-orbit__float" style={{ animationDelay: `${index * 0.6}s` }}>
            <button
              type="button"
              data-orbit-node
              onClick={() => onSelectCourse(course)}
              aria-pressed={active}
              title={`Ask about ${course.code ?? course.name}`}
              className={`loom-orbit__node orbit-node ${active ? "loom-orbit__node--active" : ""}`}
            >
              <span
                className="loom-orbit__node-icon material-symbols-outlined"
                style={{ backgroundColor: color }}
              >
                {icon}
              </span>
              <span className="min-w-0 text-left">
                <span className="loom-orbit__node-label block truncate">
                  {course.code?.split(" ")[0] ?? course.name.split(" ")[0]}
                </span>
                <span className="loom-orbit__node-badge block truncate">{course.name}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`loom-orbit ${compact ? "loom-orbit--compact" : ""}`} ref={orbitRef}>
      <svg className="loom-orbit__threads" ref={svgRef} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="threadGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-text-muted)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-highlight)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>
      <div className="loom-orbit__ring loom-orbit__ring--outer" />
      <div className="loom-orbit__ring loom-orbit__ring--inner" />

      <button
        type="button"
        className="loom-orbit__hub"
        ref={hubRef}
        onClick={onHubClick}
        title="Ask Habi"
        aria-label="Ask Habi"
      >
        <span className="loom-orbit__hub-pulse" aria-hidden="true" />
        <span className="loom-orbit__hub-glyph">h</span>
      </button>

      {inner.length > 0 && (
        <div className="loom-orbit__track loom-orbit__track--inner">
          {inner.map((course, index) =>
            renderNode(course, index, "inner", INNER_ANGLES[index % INNER_ANGLES.length]),
          )}
        </div>
      )}
      {outer.length > 0 && (
        <div className="loom-orbit__track loom-orbit__track--outer">
          {outer.map((course, index) =>
            renderNode(
              course,
              index + inner.length,
              "outer",
              OUTER_ANGLES[index % OUTER_ANGLES.length],
            ),
          )}
        </div>
      )}

      {courses.length === 0 && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap">
          <span className="rounded-full border border-border bg-surface/90 px-3 py-1 font-code-tag text-code-tag text-text-muted">
            Sync Canvas to weave your courses
          </span>
        </div>
      )}
    </div>
  );
}
