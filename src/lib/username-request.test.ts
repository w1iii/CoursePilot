import { afterEach, describe, expect, it, vi } from "vitest";
import { saveUsernameRequest } from "./username-request";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("saveUsernameRequest", () => {
  it("sends a fresh token when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await saveUsernameRequest("Alex", async () => "token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  });

  it("falls back to same-origin cookies if token refresh stalls", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = saveUsernameRequest("Alex", () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(3000);
    await pending;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
