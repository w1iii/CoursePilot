import OpenAI from "openai";
import { env, requireEnv } from "@/lib/env";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return client;
}

export function chatModel(): string {
  return env("OPENAI_MODEL") ?? "gpt-5";
}

export function embeddingModel(): string {
  return env("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
}

export const EMBEDDING_DIMENSIONS = 1536;
