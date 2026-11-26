import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ courses: vi.fn(), metadata: vi.fn(), generate: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: async () => ({ id: "user" }), UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/ai/study-prep-courses", () => ({ listStudyPrepCourses: mocks.courses }));
vi.mock("@/lib/ai/study-prep", () => ({ moduleMetadata: mocks.metadata, generateStudyPack: mocks.generate, StudyPrepServiceError: class extends Error {} }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: vi.fn() }));
import { POST } from "./route";

const courseId = "11111111-1111-4111-8111-111111111111";
const valid = { courseId, moduleIds: [1, 2], count: 15, mode: "quiz", difficulty: "mixed", topic: "key terms" };
const request = (body: unknown) => new Request("http://localhost/api/study-packs", { method: "POST", body: JSON.stringify(body) });

describe("study pack validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.courses.mockResolvedValue([{ id: courseId, rag_indexed_at: "2026-01-01" }]);
    mocks.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
    mocks.metadata.mockResolvedValue([{ id: 1, name: "One", chunks: 2 }, { id: 2, name: "Two", chunks: 3 }]);
  });
  it.each([{ moduleIds: [] }, { moduleIds: [1, 2, 3] }, { moduleIds: [1, 1] }, { moduleIds: [true] }, { count: 16 }, { topic: "x".repeat(301) }])("rejects invalid input %o", async (invalid) => {
    expect((await POST(request({ ...valid, ...invalid }))).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects a module not indexed for the selected course", async () => {
    expect((await POST(request({ ...valid, moduleIds: [1, 99] }))).status).toBe(422);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("passes both modules and focus to the generator", async () => {
    mocks.generate.mockResolvedValue({ title: "Pack", grounded: true, source_index_version: "v1", items: Array.from({ length: 15 }, () => ({ citations: [{ id: "source" }] })) });
    mocks.from.mockImplementation((table: string) => {
      if (table === "study_packs") return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "pack" }, error: null }) }) }) };
      return { insert: async () => ({ error: null }) };
    });
    expect((await POST(request(valid))).status).toBe(201);
    expect(mocks.generate).toHaveBeenCalledWith("user", expect.any(Object), expect.objectContaining({ moduleIds: [1, 2], topic: "key terms", count: 15 }), expect.any(String));
  });
});
