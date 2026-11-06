import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabaseAdmin: supabaseAdminMock }));

import {
  answerQuestion,
  CourseSelectionError,
  listCoursesForUser,
  RagServiceError,
} from "@/lib/ai/rag";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

function query(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    in: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  });
  return builder;
}

const courses = [
  {
    id: "course-1",
    canvas_course_id: 51680,
    course_name: "Artificial Intelligence",
    course_code: "BSCS 4C",
  },
  {
    id: "course-2",
    canvas_course_id: 40001,
    course_name: "Wellness",
    course_code: "GEC 1",
  },
];

function mockCourses(result: QueryResult) {
  const from = vi.fn(() => query(result));
  supabaseAdminMock.mockReturnValue({ from });
  return from;
}

describe("course resolution", () => {
  beforeEach(() => {
    process.env.RAG_API_URL = "http://rag.test";
    process.env.RAG_SIGNING_SECRET = "test-rag-secret";
  });

  it("scopes course lookup to the signed-in user", async () => {
    const from = mockCourses({ data: [courses[0]], error: null });

    await listCoursesForUser("user-a");

    const builder = from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(from).toHaveBeenCalledWith("courses");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("surfaces course lookup failures", async () => {
    mockCourses({ data: null, error: { message: "database down" } });

    await expect(listCoursesForUser("user-a")).rejects.toThrow(
      "Failed to load courses: database down",
    );
  });

  it("refuses a course that belongs to someone else", async () => {
    mockCourses({ data: [courses[0]], error: null });

    await expect(answerQuestion("user-a", "hi", "course-2")).rejects.toBeInstanceOf(
      CourseSelectionError,
    );
  });

  it("requires a course selection when several are synced", async () => {
    mockCourses({ data: courses, error: null });

    await expect(answerQuestion("user-a", "hi")).rejects.toThrow(
      "Select a course before asking.",
    );
  });
});

describe("answerQuestion", () => {
  beforeEach(() => {
    process.env.RAG_API_URL = "http://rag.test/";
    process.env.RAG_SIGNING_SECRET = "test-rag-secret";
  });

  it("sends the service token and maps citations", async () => {
    mockCourses({ data: [courses[0]], error: null });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answer: "Grounded answer [S1].",
          grounded: true,
          model: "gemini-3.6-flash",
          citations: [
            {
              label: "S1",
              chunk_id: "chunk-1",
              document_id: "doc-1",
              title: "Week 1",
              source_type: "PDF",
              chunk_index: 3,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await answerQuestion("user-a", "What is attention?", "course-1");

    expect(result.answer).toContain("Grounded answer");
    expect(result.model).toBe("gemini-3.6-flash");
    expect(result.grounded).toBe(true);
    expect(result.course).toEqual({ id: "course-1", name: "Artificial Intelligence" });
    expect(result.sources).toEqual([
      {
        id: "chunk-1",
        label: "S1",
        title: "Week 1",
        source_type: "PDF",
        chunk_index: 3,
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://rag.test/api/v1/chat");
    expect(init.headers).toHaveProperty("X-RAG-Token");
    expect(JSON.parse(init.body as string)).toEqual({
      course_key: "course-1",
      question: "What is attention?",
    });
  });

  it("maps RAG auth failures to a service error", async () => {
    mockCourses({ data: [courses[0]], error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Invalid RAG token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await answerQuestion("user-a", "hi", "course-1").catch((err) => err);

    expect(error).toBeInstanceOf(RagServiceError);
    expect((error as RagServiceError).status).toBe(401);
    expect((error as Error).message).toBe("Invalid RAG token");
  });

  it("reports an unreachable RAG service", async () => {
    mockCourses({ data: [courses[0]], error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(answerQuestion("user-a", "hi", "course-1")).rejects.toThrow(
      "RAG service unreachable",
    );
  });
});
