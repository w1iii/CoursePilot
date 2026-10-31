import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ingestCanvasCourse,
  ragIngestMaxCourses,
  ragIngestionEnabled,
  ragReindexHours,
} from "@/lib/ai/ingest";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RAG ingestion client", () => {
  beforeEach(() => {
    process.env.RAG_API_URL = "http://rag.test/";
    process.env.RAG_ADMIN_TOKEN = "admin-secret";
    process.env.RAG_INGEST_MAX_ATTEMPTS = "2";
    process.env.RAG_INGEST_TIMEOUT_MS = "5000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends transient Canvas credentials with the admin token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          document_count: 4,
          chunk_count: 12,
          failure_count: 1,
          skipped_count: 2,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await ingestCanvasCourse({
      canvasCourseId: 51680,
      canvasBaseUrl: "https://usls.instructure.com",
      canvasAccessToken: "canvas-token",
    });

    expect(result).toEqual({ documents: 4, chunks: 12, failures: 1, skipped: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://rag.test/api/v1/ingestion/canvas-course");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Admin-Token": "admin-secret",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      course_id: 51680,
      canvas_base_url: "https://usls.instructure.com",
      canvas_access_token: "canvas-token",
    });
  });

  it("retries server errors and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 503))
      .mockResolvedValueOnce(jsonResponse({ document_count: 1, chunk_count: 2 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await ingestCanvasCourse({
      canvasCourseId: 1,
      canvasBaseUrl: "https://example.edu",
      canvasAccessToken: "t",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.documents).toBe(1);
  });

  it("does not retry client errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "Invalid admin token" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ingestCanvasCourse({
        canvasCourseId: 1,
        canvasBaseUrl: "https://example.edu",
        canvasAccessToken: "t",
      }),
    ).rejects.toThrow("RAG ingestion failed (401): Invalid admin token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last error after retries are exhausted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "unavailable" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ingestCanvasCourse({
        canvasCourseId: 1,
        canvasBaseUrl: "https://example.edu",
        canvasAccessToken: "t",
      }),
    ).rejects.toThrow("502");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reads cadence settings with sane fallbacks", () => {
    process.env.RAG_INGESTION_ENABLED = "false";
    process.env.RAG_INGEST_MAX_COURSES = "0";
    process.env.RAG_REINDEX_HOURS = "not-a-number";

    expect(ragIngestionEnabled()).toBe(false);
    expect(ragIngestMaxCourses()).toBe(3);
    expect(ragReindexHours()).toBe(24);
  });
});
