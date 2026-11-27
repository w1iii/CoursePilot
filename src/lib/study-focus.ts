/** Fast checks, not a semantic classifier or a complete injection defense. */
export function hasUnsafeStudyCharacters(value: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\ud800-\udfff]/u.test(value);
}

export function validateStudyFocus(input: unknown): { value: string | null; error?: string; warning?: string } {
  if (input == null) return { value: null };
  if (typeof input !== "string") return { value: null, error: "Study focus must be text." };
  if (input.length > 300) return { value: null, error: "Keep study focus within 300 characters." };
  if (hasUnsafeStudyCharacters(input)) return { value: null, error: "Remove hidden control characters from study focus." };
  const value = input.normalize("NFC").trim();
  if (!value) return { value: null };
  if (!/[\p{L}\p{N}\p{Sm}]/u.test(value)) return { value: null, error: "Enter a topic, formula, or leave study focus blank." };
  const scan = value.normalize("NFKC").toLowerCase().replace(/\p{Cf}/gu, "").replace(/_/g, " ");
  const boundary = "(?:^|[.!?;\\n])\\s*(?:(?:also|then)\\s+)?(?:please\\s+)?";
  const override = new RegExp(boundary + "(?:ignore|disregard|override|bypass)\\s+(?:all\\s+)?(?:previous|prior|above|system|developer|safety)\\s+(?:instructions?|rules?|prompts?|constraints?)", "u");
  const reveal = new RegExp(boundary + "(?:show|reveal|print|expose|return)\\s+(?:(?:me|your|the|hidden|internal)\\s+)*(?:system|developer)\\s+(?:prompt|instructions?)", "u");
  if (override.test(scan) || reveal.test(scan) || /^\s*(?:<\|(?:system|developer)\|>|\[inst\])/u.test(scan)) {
    return { value: null, error: "Use study focus for course content, not instructions to override the assistant." };
  }
  // Advisory only: keyboard layouts and repeated scientific sequences can be legitimate.
  const noise = /^(?:(?:asdfghjkl|qwertyuiop|zxcvbnm)[\s\d]*)+$/u.test(scan) || /^(\S)\1{11,}$/u.test(scan);
  return { value, ...(noise ? { warning: "This looks like repeated or random text. Check your topic; it must be supported by the selected modules." } : {}) };
}
