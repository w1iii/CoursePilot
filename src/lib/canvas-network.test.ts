import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookup, request, agentClose, agentOptions } = vi.hoisted(() => ({
  lookup: vi.fn(), request: vi.fn(), agentClose: vi.fn(), agentOptions: vi.fn(),
}));
vi.mock("node:dns", () => ({ promises: { lookup } }));
vi.mock("undici", () => ({
  Agent: class {
    constructor(options: unknown) { agentOptions(options); }
    close = agentClose;
  },
  request,
}));

import { canvasRequest, isAllowedCanvasAddress, validateCanvasUrl } from "@/lib/canvas-network";

describe("Canvas network isolation", () => {
  beforeEach(() => {
    lookup.mockReset(); request.mockReset(); agentClose.mockReset(); agentOptions.mockReset();
    agentClose.mockResolvedValue(undefined);
  });

  it("blocks private, metadata, mapped and reserved addresses", () => {
    for (const ip of ["127.0.0.1", "169.254.169.254", "10.2.3.4", "192.168.1.2",
      "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
      expect(isAllowedCanvasAddress(ip), ip).toBe(false);
    }
    expect(isAllowedCanvasAddress("8.8.8.8")).toBe(true);
    expect(isAllowedCanvasAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("fails closed if any DNS answer is private or DNS fails", async () => {
    lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 }]);
    await expect(validateCanvasUrl("https://canvas.edu")).rejects.toThrow("disallowed");
    lookup.mockRejectedValue(new Error("DNS unavailable"));
    await expect(validateCanvasUrl("https://canvas.edu")).rejects.toThrow("DNS unavailable");
  });

  it("pins request lookup and refuses redirects with credentials", async () => {
    lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    request.mockResolvedValue({ statusCode: 302, body: { dump: vi.fn() } });
    await expect(canvasRequest("https://canvas.edu/api/v1/users/self", "token"))
      .rejects.toThrow("HTTP 302");
    expect(request).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      maxRedirections: 0, headers: expect.objectContaining({ Authorization: "Bearer token" }),
    }));
    expect(request.mock.calls[0][1].headers["User-Agent"]).toBe("CoursePilot/1.0");
    const pinned = agentOptions.mock.calls[0][0].connect.lookup;
    const callback = vi.fn();
    pinned("canvas.edu", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
    pinned("canvas.edu", { all: true }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, [{ address: "8.8.8.8", family: 4 }]);
    pinned("internal", {}, callback);
    expect(callback.mock.calls[2][0]).toBeInstanceOf(Error);
    expect(agentClose).toHaveBeenCalledOnce();
  });
});
