import { embedText } from "@/lib/ai/embeddings";
import { chatModel, openai } from "@/lib/ai/openai";
import { supabaseAdmin } from "@/lib/supabase";

interface RetrievedDoc {
  id: string;
  course_id: string;
  source_type: string;
  title: string;
  content: string;
  similarity: number;
}

export interface RagAnswer {
  answer: string;
  sources: { id: string; title: string; source_type: string; similarity: number }[];
  model: string;
}

const SYSTEM_PROMPT = `You are CoursePilot, an academic assistant for a college student.
Answer ONLY using the retrieved Canvas context below. Do not invent facts.
If the context does not contain the answer, say so plainly and suggest what the student should check in Canvas.
Be concise. Prefer short lists and explicit due dates.`;

export async function answerQuestion(userId: string, question: string): Promise<RagAnswer> {
  const queryEmbedding = await embedText(question);

  const { data, error } = await supabaseAdmin().rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: 8,
    similarity_cut: 0.2,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const docs = (data ?? []) as RetrievedDoc[];

  if (docs.length === 0) {
    return {
      answer:
        "I could not find anything in your synced Canvas data that matches that question. Try syncing your courses first.",
      sources: [],
      model: chatModel(),
    };
  }

  const context = docs
    .map((d, i) => `[${i + 1}] (${d.source_type}) ${d.title}\n${d.content.slice(0, 2000)}`)
    .join("\n\n---\n\n");

  const completion = await openai().chat.completions.create({
    model: chatModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Retrieved Canvas context:\n\n${context}\n\nStudent question: ${question}`,
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content ?? "(no answer)";

  return {
    answer,
    sources: docs.map((d) => ({
      id: d.id,
      title: d.title,
      source_type: d.source_type,
      similarity: Number(d.similarity.toFixed(3)),
    })),
    model: chatModel(),
  };
}
