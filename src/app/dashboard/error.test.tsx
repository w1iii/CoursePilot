// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import DashboardError from "./error";

it("shows a safe message and lets users retry", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  const reset = vi.fn();
  act(() => root.render(<DashboardError error={new Error("private upstream detail")} reset={reset} />));
  expect(container.textContent).toContain("Please try again");
  expect(container.textContent).not.toContain("private upstream detail");
  act(() => container.querySelector("button")!.click());
  expect(reset).toHaveBeenCalledOnce();
  act(() => root.unmount());
  vi.unstubAllGlobals();
});
