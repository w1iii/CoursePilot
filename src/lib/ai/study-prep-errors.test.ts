import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/env", () => ({ env: () => undefined }));
vi.mock("@/lib/ai/rag-token", () => ({ signRagToken: () => "test-token" }));
vi.mock("@/lib/canvas-account", () => ({ getCanvasCredentials: vi.fn() }));
import { generateStudyPack } from "./study-prep";
import type { CourseOption } from "./rag";

afterEach(() => vi.unstubAllGlobals());

describe("study prep upstream failures", () => {
  it.each([422, 500, 504])("does not expose upstream details for HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "secret upstream details" }), { status })));
    const promise = generateStudyPack("user", { id: "course" } as CourseOption, { moduleIds: [1], mode: "quiz", count: 1, difficulty: "easy" });
    await expect(promise).rejects.toMatchObject({ status, message: expect.not.stringContaining("secret upstream details") });
  });
});
