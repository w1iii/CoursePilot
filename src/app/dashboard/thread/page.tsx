import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import ThreadView from "./ThreadView";
import { randomUUID } from "crypto";
import type { ComponentProps } from "react";

interface PageProps {
  searchParams: Promise<{ q?: string; course?: string; tid?: string }>;
}

function normalizeName(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ThreadPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const sb = supabaseAdmin();

  const { data: courses, error: coursesError } = await sb
    .from("courses")
    .select("id, course_code, course_name, instructor")
    .eq("user_id", user.id)
    .limit(50);

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  const courseOptions = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
    instructor: course.instructor,
  }));

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );

  // If a thread ID is provided in the URL, fetch the thread data immediately
  // so the conversation is visible on initial render instead of showing "new chat" first.
  let initialTurns: ComponentProps<typeof ThreadView>["initialTurns"];
  let threadId = params.tid && /^[0-9a-f-]{36}$/i.test(params.tid)
    ? params.tid
    : null;

  if (threadId) {
    const { data: thread, error: threadError } = await sb
      .from("chat_threads")
      .select("id, title, updated_at")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (!threadError && thread) {
      const { data: messages, error: messagesError } = await sb
        .from("chat_messages")
        .select("id, role, content, metadata, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!messagesError && messages) {
        initialTurns = messages.map((msg: {
          id: string; metadata: Record<string, unknown> | null;
          content: string; created_at: string;
        }) => ({
          id: typeof msg.metadata?.turnId === "string" ? msg.metadata.turnId : String(msg.id),
          question: String(msg.content),
          courseId: typeof msg.metadata?.courseId === "string" ? msg.metadata.courseId : "",
          createdAt: String(msg.created_at),
          status: "done" as const,
        }));
      }
    }
    // fallback to new UUID if thread not found
    if (!initialTurns) threadId = randomUUID();
  } else {
    threadId = randomUUID();
  }

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <ThreadView
        userName={displayName}
        userEmail={user.email}
        courses={courseOptions}
        initialQuestion={params.q?.trim() ?? ""}
        initialCourseId={params.course ?? courseOptions[0]?.id ?? ""}
        initialThreadId={threadId}
        initialTurns={initialTurns}
      />
    </>
  );
}
