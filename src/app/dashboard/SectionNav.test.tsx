// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import SectionNav from "./SectionNav";

describe("dashboard section navigation", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    vi.unstubAllGlobals();
  });

  it("lists only sections that exist on dashboard", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<SectionNav />));

    const labels = Array.from(container.querySelectorAll("nav button"), (button) => button.textContent?.trim());
    expect(labels).toEqual(["Announcements", "Tasks", "Capabilities"]);
    expect(labels).not.toContain("Courses");
  });
});
