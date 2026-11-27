import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));
import { jobContext } from "@/lib/job-context";
import { ingestCanvasCourse } from "./ingest";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const input = { userId: "user-a", courseKey: "course-a", canvasCourseId: 1,
  canvasBaseUrl: "https://canvas.test", canvasAccessToken: "secret" };

describe("worker RAG ingestion", () => {
  beforeEach(() => {
    vi.stubEnv("RAG_API_URL", "http://rag.test");
    vi.stubEnv("RAG_SIGNING_SECRET", "test-secret");
    vi.stubEnv("RAG_SHARED_INDEX_ENABLED", "false");
    vi.stubEnv("RAG_INGEST_MAX_ATTEMPTS", "2");
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it("survives beyond onboarding timeout through short status requests", async () => {
    let elapsed = 0;
    const now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now + elapsed);
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      if (init.method === "POST") return json({ queued: true }, 202);
      elapsed += 120_000;
      return elapsed < 600_000 ? json({ status: "running", completed_modules: elapsed / 120_000 })
        : json({ status: "succeeded", result: { document_count: 4, chunk_count: 20 } });
    });
    vi.stubGlobal("fetch", fetcher);
    const progress = vi.fn();
    const result = await jobContext.run({ id: "job-a", progress }, () => ingestCanvasCourse(input));
    expect(elapsed).toBeGreaterThan(300_000);
    expect(result.documents).toBe(4);
    expect(fetcher.mock.calls.filter((call) => call[1].method === "POST")).toHaveLength(1);
    expect(fetcher.mock.calls[0][0]).toMatch(/\/ingestion\/jobs\/[a-f0-9]{64}$/);
    expect(progress).toHaveBeenCalled();
    expect(fetcher.mock.calls[0][1].body).toContain("canvas_access_token");
    expect(fetcher.mock.calls[1][1].body).toBeUndefined();
  });
  it("reuses stable job identity after unknown submission outcome", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("connection lost"))
      .mockResolvedValueOnce(json({}, 202))
      .mockResolvedValueOnce(json({ status: "succeeded", result: { document_count: 1 } }));
    vi.stubGlobal("fetch", fetcher);
    await jobContext.run({ id: "job-a", progress: vi.fn() }, () => ingestCanvasCourse(input));
    expect(fetcher.mock.calls[0][0]).toBe(fetcher.mock.calls[1][0]);
  });
  it("reports exhausted RAG worker failures rather than pretending success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url, init) =>
      init.method === "POST" ? json({}, 202) : json({ status: "failed", error: "Indexing failed" })));
    await expect(jobContext.run({ id: "job-a", progress: vi.fn() }, () => ingestCanvasCourse(input)))
      .rejects.toThrow("Indexing failed");
  });
});
