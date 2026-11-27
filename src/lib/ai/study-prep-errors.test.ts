import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/env", () => ({ env: () => undefined }));
vi.mock("@/lib/ai/rag-token", () => ({ signRagToken: () => "test-token" }));
vi.mock("@/lib/canvas-account", () => ({ getCanvasCredentials: vi.fn() }));
import { generateStudyPack, moduleMetadata } from "./study-prep";
import type { CourseOption } from "./rag";

afterEach(() => vi.unstubAllGlobals());

describe("study prep upstream failures", () => {
  it.each([422, 500, 504])("does not expose upstream details for HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "secret upstream details" }), { status })));
    const promise = generateStudyPack("user", { id: "course" } as CourseOption, { moduleIds: [1], mode: "quiz", count: 1, difficulty: "easy" });
    await expect(promise).rejects.toMatchObject({ status, message: expect.not.stringContaining("secret upstream details") });
  });
  it("maps module transport failures to safe actionable errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("secret service address")));
    await expect(moduleMetadata("user", { id: "course" } as CourseOption)).rejects.toMatchObject({
      status: 503, message: "Could not reach the course module service. Please retry shortly.",
    });
  });
  it("does not disguise malformed module responses as empty courses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(moduleMetadata("user", { id: "course" } as CourseOption)).rejects.toMatchObject({ status: 502 });
  });
  it.each(["TimeoutError", "AbortError", "TypeError"])("classifies %s without leaking transport details", async (name) => {
    const error = new Error("secret upstream address");
    error.name = name;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(generateStudyPack("user", { id: "course" } as CourseOption, {
      moduleIds: [1], mode: "flashcards", count: 1, difficulty: "easy",
    })).rejects.toMatchObject({ status: name === "TypeError" ? 503 : 504, message: expect.not.stringContaining("secret") });
  });
});
