export const MAX_QUESTION_WORDS = 500;
// Bound unusually long words and request sizes independently of the word limit.
export const MAX_QUESTION_CHARS = 16000;

export function countQuestionWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

export function validQuestion(value: string): boolean {
  return countQuestionWords(value) <= MAX_QUESTION_WORDS && value.length <= MAX_QUESTION_CHARS;
}
