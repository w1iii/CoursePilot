import { beforeEach, afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/canvas-account", () => ({ getCanvasCredentials: vi.fn() }));
vi.mock("@/lib/canvas", () => ({ listCourses: vi.fn() }));
import { getCanvasCredentials } from "@/lib/canvas-account";
import { listCourses } from "@/lib/canvas";
import { withSharedIndexCounts } from "@/lib/ai/index-counts";

beforeEach(() => {
  vi.stubEnv("RAG_SHARED_INDEX_ENABLED", "true");
  vi.stubEnv("RAG_SIGNING_SECRET", "test-secret");
  vi.mocked(getCanvasCredentials).mockResolvedValue({ credentials: { baseUrl: "https://example.edu", token: "t" }, account: null } as never);
  vi.mocked(listCourses).mockResolvedValue([{ id: 42 }] as never);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("loads shared totals for enrolled selected courses and preserves other snapshots", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: 44, chunks: 120 }))));
  const rows = [
    { id: "a", canvas_course_id: 42, selected_for_rag: true, rag_document_count: 1, rag_chunk_count: 4 },
    { id: "b", canvas_course_id: 43, selected_for_rag: true, rag_document_count: 3, rag_chunk_count: 5 },
  ];
  const result = await withSharedIndexCounts("student", rows);
  expect(result[0]).toMatchObject({ rag_document_count: 44, rag_chunk_count: 120 });
  expect(result[1]).toEqual(rows[1]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("retains previous counts when lookup fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const rows = [{ id: "a", canvas_course_id: 42, selected_for_rag: true, rag_document_count: 44, rag_chunk_count: 120 }];
  expect(await withSharedIndexCounts("student", rows)).toEqual(rows);
});
