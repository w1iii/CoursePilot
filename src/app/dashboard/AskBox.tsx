"use client";

import { useState } from "react";

interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

interface RagSource {
  id: string;
  label: string;
  title: string;
  source_type: string;
  chunk_index: number;
}

interface RagResponse {
  answer: string;
  sources: RagSource[];
  model: string;
  grounded: boolean;
  course: { id: string; name: string };
}

export default function AskBox({ courses }: { courses: CourseOption[] }) {
  const [question, setQuestion] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, course_id: courseId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold">AI Academic Assistant</h2>
      {courses.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Sync Canvas first so the assistant has course material to search.
        </p>
      ) : (
        <form onSubmit={ask} className="flex flex-col gap-2 sm:flex-row">
          {courses.length > 1 && (
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              aria-label="Course"
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should I work on today?"
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">{data.course.name}</p>
          <p className="whitespace-pre-wrap text-sm leading-6">{data.answer}</p>
          {data.sources.length > 0 && (
            <div className="text-xs text-zinc-500">
              <p className="mb-1 font-medium text-zinc-600 dark:text-zinc-400">Sources</p>
              <ul className="flex flex-col gap-1">
                {data.sources.map((s) => (
                  <li key={`${s.id}-${s.label}`}>
                    [{s.label}] {s.title} · {s.source_type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
