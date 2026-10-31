import { supabaseAdmin } from "@/lib/supabase";

export type AiFeature = "ask" | "ingest" | "sync";
export type AiStatus = "ok" | "error";

export interface AiRequestLog {
  userId: string | null;
  feature: AiFeature;
  status: AiStatus;
  latencyMs: number;
  model?: string | null;
  error?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
}

const MAX_ERROR_CHARS = 500;

/**
 * Record an AI call for latency/error inspection.
 *
 * Prompts and answers are intentionally never stored. Logging is best-effort:
 * telemetry failures must not break the request.
 */
export async function logAiRequest(entry: AiRequestLog): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from("ai_requests")
      .insert({
        user_id: entry.userId,
        feature: entry.feature,
        model: entry.model ?? null,
        latency_ms: Math.max(0, Math.round(entry.latencyMs)),
        status: entry.status,
        error: entry.error ? entry.error.slice(0, MAX_ERROR_CHARS) : null,
        prompt_tokens: entry.promptTokens ?? null,
        completion_tokens: entry.completionTokens ?? null,
      });

    if (error) {
      console.error("ai request log failed", error.message);
    }
  } catch (err) {
    console.error("ai request log failed", (err as Error).message);
  }
}

export function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}
