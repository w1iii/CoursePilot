export interface ThreadTurn {
  id: string;
  question: string;
  courseId: string;
  createdAt: string;
  status: "loading" | "done" | "error";
  response?: Record<string, unknown>;
  error?: string;
}

export function hasPersistedTurns<T>(turns: T[] | undefined): boolean {
  return Boolean(turns?.length);
}

export function messagesToTurns(messages: Array<Record<string, unknown>>): ThreadTurn[] {
  const turns = new Map<string, ThreadTurn>();
  for (const message of messages) {
    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const turnId = typeof metadata.turnId === "string" ? metadata.turnId : String(message.id);
    if (message.role === "user") {
      turns.set(turnId, {
        id: turnId,
        question: String(message.content),
        courseId: typeof metadata.courseId === "string" ? metadata.courseId : "",
        createdAt: String(message.created_at),
        status: "loading",
      });
    } else if (message.role === "assistant") {
      const turn = turns.get(turnId);
      if (!turn) continue;
      turn.status = metadata.status === "error" ? "error" : "done";
      if (turn.status === "error") turn.error = String(message.content);
      else if (metadata.response && typeof metadata.response === "object" && !Array.isArray(metadata.response)) {
        turn.response = metadata.response as Record<string, unknown>;
      }
    }
  }
  return [...turns.values()];
}
