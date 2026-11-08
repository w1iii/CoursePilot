import { describe, expect, it } from "vitest";
import { messagesToTurns } from "@/lib/thread-turns";

describe("thread reconstruction", () => {
  it("combines user and assistant messages into one turn", () => {
    expect(messagesToTurns([
      { id: "u", role: "user", content: "Question", created_at: "2026-01-01T00:00:00Z",
        metadata: { turnId: "t", courseId: "course" } },
      { id: "a", role: "assistant", content: "Answer", metadata: { turnId: "t", status: "done",
        response: { answer: "Answer", sources: [] } } },
    ])).toEqual([expect.objectContaining({ id: "t", question: "Question", status: "done",
      response: { answer: "Answer", sources: [] } })]);
  });
});
