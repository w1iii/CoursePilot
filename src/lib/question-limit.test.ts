import { describe, expect, it } from "vitest";
import { countQuestionWords, MAX_QUESTION_CHARS, validQuestion } from "./question-limit";

describe("question limits", () => {
  it("counts whitespace-separated words including newlines and unicode spaces", () => {
    expect(countQuestionWords("  one\n two\tthree\u00a0four ")).toBe(4);
    expect(countQuestionWords("  \n ")).toBe(0);
  });
  it("accepts 500 words and rejects 501 and oversized single words", () => {
    expect(validQuestion(Array(500).fill("word").join(" "))).toBe(true);
    expect(validQuestion(Array(501).fill("word").join(" "))).toBe(false);
    expect(validQuestion("x".repeat(MAX_QUESTION_CHARS + 1))).toBe(false);
  });
});
