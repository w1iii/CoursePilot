import { requireUser } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase";
import ThreadView from "./ThreadView";
import { randomUUID } from "crypto";
import type { ComponentProps } from "react";
import { messagesToTurns } from "@/lib/thread-turns";
import { redirect } from "next/navigation";
import { isThreadId, newThreadHref } from "@/lib/thread-navigation";
import { cacheUserRead } from "@/lib/cache";

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
  if (!isThreadId(params.tid)) {
    redirect(newThreadHref(randomUUID(), params));
  }
  const sb = supabaseAdmin();

  const { data: courses, error: coursesError } = await cacheUserRead("thread-courses", user.id, 300, async () => await sb
    .from("courses")
    .select("id, course_code, course_name, instructor, rag_indexed_at")
    .eq("user_id", user.id)
    .eq("selected_for_rag", true)
    .limit(50));

  if (coursesError) {
    throw new Error(`Failed to load courses: ${coursesError.message}`);
  }

  const courseOptions = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.course_name,
    code: course.course_code,
    instructor: course.instructor,
    indexed: Boolean(course.rag_indexed_at),
  }));

  const displayName = normalizeName(
    user.full_name?.trim() || user.email.split("@")[0] || "weaver",
  );

  // Hydrate existing conversations; new canonical IDs have no persisted row yet.
  let initialTurns: ComponentProps<typeof ThreadView>["initialTurns"];
  const threadId = params.tid;

  const { data: thread, error: threadError } = await sb
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  if (threadError) throw new Error(`Failed to load chat thread: ${threadError.message}`);
  if (thread) {
    const { data: messages, error: messagesError } = await sb
      .from("chat_messages")
      .select("id, role, content, metadata, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .order("role", { ascending: false });
    if (messagesError) throw new Error(`Failed to load chat messages: ${messagesError.message}`);
    if (messages) {
      initialTurns = messagesToTurns(messages as Array<Record<string, unknown>>) as ComponentProps<typeof ThreadView>["initialTurns"];
    }
  }

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-woven-dots absolute inset-0 opacity-60" />
      </div>

      <ThreadView
        key={threadId}
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
