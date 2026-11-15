import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/ingest", () => ({ sharedIndexEnabled: vi.fn() }));
vi.mock("@/lib/ai/rag", () => ({ listCoursesForUser: vi.fn() }));
vi.mock("@/lib/ai/index-counts", () => ({ withSharedIndexCounts: vi.fn() }));
import { sharedIndexEnabled } from "@/lib/ai/ingest";
import { listCoursesForUser } from "@/lib/ai/rag";
import { withSharedIndexCounts } from "@/lib/ai/index-counts";
import { listStudyPrepCourses } from "@/lib/ai/study-prep-courses";

beforeEach(() => {
  vi.mocked(sharedIndexEnabled).mockReturnValue(true);
  vi.mocked(listCoursesForUser).mockResolvedValue([{
    id: "course-row", canvas_course_id: 42, course_name: "Rizal", course_code: null, rag_indexed_at: null,
  }]);
  vi.mocked(withSharedIndexCounts).mockImplementation(async (_userId, rows) => rows.map((row) => ({
    ...row, rag_document_count: 6, rag_chunk_count: 41,
  })));
});

it("treats a populated shared index as available despite missing local timestamp", async () => {
  const [course] = await listStudyPrepCourses("student-2");
  expect(course.rag_indexed_at).toBeTruthy();
  expect(course.rag_document_count).toBe(6);
  expect(course.rag_chunk_count).toBe(41);
});

it("does not mark empty shared indexes available", async () => {
  vi.mocked(withSharedIndexCounts).mockImplementation(async (_userId, rows) => rows);
  const [course] = await listStudyPrepCourses("student-2");
  expect(course.rag_indexed_at).toBeNull();
});
