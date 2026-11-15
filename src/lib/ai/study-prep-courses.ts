import { sharedIndexEnabled } from "@/lib/ai/ingest";
import { listCoursesForUser, type CourseOption } from "@/lib/ai/rag";
import { withSharedIndexCounts } from "@/lib/ai/index-counts";

/** Resolve shared availability from RAG itself; local per-student timestamps may lag. */
export async function listStudyPrepCourses(userId: string): Promise<CourseOption[]> {
  const courses = await listCoursesForUser(userId);
  if (!sharedIndexEnabled()) return courses;
  const counted = await withSharedIndexCounts(userId, courses.map((course) => ({
    ...course,
    selected_for_rag: true,
    rag_document_count: null as number | null,
    rag_chunk_count: null as number | null,
  })));
  return counted.map((course) => ({
    ...course,
    rag_indexed_at: course.rag_indexed_at ||
      ((course.rag_document_count ?? 0) > 0 || (course.rag_chunk_count ?? 0) > 0
        ? new Date().toISOString()
        : null),
  }));
}
