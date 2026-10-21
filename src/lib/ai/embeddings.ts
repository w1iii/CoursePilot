import { embeddingModel, openai } from "@/lib/ai/openai";

export async function embedText(text: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: embeddingModel(),
    input: text,
  });
  return res.data[0].embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai().embeddings.create({
    model: embeddingModel(),
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
