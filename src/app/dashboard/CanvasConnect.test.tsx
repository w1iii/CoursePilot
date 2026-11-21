// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import CanvasConnect, { type CanvasStatus } from "./CanvasConnect";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("shows an accessible safe error and allows retry when disconnect fails", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private upstream detail")).mockResolvedValueOnce(new Response("{}", { status: 200 })));
  const container = document.createElement("div");
  const root = createRoot(container);
  const status: CanvasStatus = { connected: true, needsReconnect: false, baseUrl: "https://school.instructure.com", canvasUserName: "Test", canvasUserId: 1, lastValidatedAt: null, source: "user" };
  act(() => root.render(<CanvasConnect initialStatus={status} defaultBaseUrl="https://school.instructure.com" />));
  const disconnect = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Disconnect")!;
  await act(async () => { disconnect.click(); });
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not disconnect Canvas");
  expect(container.textContent).not.toContain("private upstream detail");
  expect(container.textContent).toContain("Connected");
  await act(async () => { disconnect.click(); });
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain("Not connected");
  expect(refresh).toHaveBeenCalledOnce();
  act(() => root.unmount());
});
