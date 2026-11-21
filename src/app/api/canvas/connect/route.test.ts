import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn(), url: vi.fn(), validate: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit, rateLimitMessage: () => "Rate limited" }));
vi.mock("@/lib/canvas", () => ({ hardenedCanvasBaseUrl: mocks.url, normalizeCanvasAccessToken: (value: string) => value.trim(), CanvasAuthError: class CanvasAuthError extends Error {} }));
vi.mock("@/lib/canvas-account", () => ({ validateCanvasToken: mocks.validate, saveCanvasAccount: mocks.save }));
vi.mock("@/lib/cache", () => ({ invalidateUserResourceCache: vi.fn() }));
import { POST } from "./route";

function request(body: unknown) { return new Request("http://localhost/api/canvas/connect", { method: "POST", body: JSON.stringify(body) }) as NextRequest; }
const input = { canvas_base_url: "https://school.instructure.com", access_token: "secret-token" };

describe("Canvas connection route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user" });
    mocks.limit.mockResolvedValue({ allowed: true });
    mocks.url.mockResolvedValue(input.canvas_base_url);
    mocks.validate.mockResolvedValue({ id: 1 });
    mocks.save.mockResolvedValue({ canvas_base_url: input.canvas_base_url, canvas_user_name: "Test", canvas_user_id: 1 });
  });

  it("validates inputs and URL before handling credentials", async () => {
    expect((await POST(request({ ...input, access_token: "" }))).status).toBe(400);
    mocks.url.mockRejectedValue(new Error("disallowed"));
    expect((await POST(request(input))).status).toBe(400);
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it("saves validated connection without returning the token", async () => {
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain(input.access_token);
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("logs connectivity failures safely and does not save credentials", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.validate.mockRejectedValue(new Error("secret-token"));
    const response = await POST(request(input));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Could not reach Canvas" });
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation: "canvas.validate", requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token");
    expect(mocks.save).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
