import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ env: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/ai/metrics", () => ({ loadAskCacheMetrics: mocks.load }));
import { GET } from "./route";

function request(query = "", token = "secret") {
  return new NextRequest(`http://localhost/api/admin/cache-metrics${query}`, { headers: { authorization: `Bearer ${token}` } });
}

describe("cache metrics route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.env.mockImplementation((key: string) => key === "CACHE_METRICS_SECRET" ? "secret" : undefined);
    mocks.load.mockResolvedValue({ count: 1 });
  });

  it("requires a valid secret before reading metrics", async () => {
    expect((await GET(request("", "wrong"))).status).toBe(401);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("validates the window and returns private metrics", async () => {
    expect((await GET(request("?days=0"))).status).toBe(400);
    expect((await GET(request("?days=2&days=3"))).status).toBe(400);
    const response = await GET(request("?days=7"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.load).toHaveBeenCalledWith(7);
  });

  it("returns a safe correlated error on dependency failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.load.mockRejectedValue(new Error("private database credentials"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Metrics unavailable" });
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "cache-metrics.load", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("private database credentials");
    log.mockRestore();
  });
});
