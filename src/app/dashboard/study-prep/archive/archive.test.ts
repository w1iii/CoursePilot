import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArchiveList, { type History } from "../archive-list";

const history: History[] = Array.from({ length: 4 }, (_, i) => ({
  id: `pack-${i}`, title: `Pack ${i}`, mode: "quiz", module: null, topic: null, course: null,
  study_sessions: Array.from({ length: 2 }, (_, j) => ({ id: `session-${i}-${j}`, status: j ? "completed" : "active", score: 80, last_active_at: "2026-01-01" })),
}));
const render = (items: History[], preview = false) => renderToStaticMarkup(createElement(ArchiveList, { history: items, preview, onDelete: vi.fn() }));

describe("study archive", () => {
  it("links the preview to the archive and limits packs", () => {
    const html = render(history, true);
    expect(html).toContain('href="/dashboard/study-prep/archive"');
    expect(html).toContain("Pack 2");
    expect(html).not.toContain("Pack 3");
    expect(html).not.toContain("Delete session");
    expect(html).not.toContain("Resume session");
    expect(html).toContain("4 packs");
  });
  it("shows every pack and session counts without session actions", () => {
    const html = render(history);
    expect(html).toContain("Pack 3");
    expect(html).not.toContain("Delete session");
    expect(html).not.toContain("Resume session");
    expect(html).toContain('href="/dashboard/study-prep/pack-3"');
    expect(html).toContain("2 sessions");
  });
  it("shows an empty state and keeps the archive link available", () => {
    expect(render([])).toContain("Your first edition awaits.");
    expect(render([], true)).toContain('href="/dashboard/study-prep/archive"');
  });
});
