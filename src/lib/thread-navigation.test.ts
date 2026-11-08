import { describe, expect, it } from "vitest";
import { isThreadId, newThreadHref } from "@/lib/thread-navigation";

const id = "11111111-2222-4333-8444-555555555555";

describe("chat identity navigation", () => {
  it("assigns stable URL identity while preserving initial question and course", () => {
    const href = newThreadHref(id, { q: "What's due?", course: "course-id" });
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("tid")).toBe(id);
    expect(params.get("q")).toBe("What's due?");
    expect(params.get("course")).toBe("course-id");
    expect(isThreadId(params.get("tid") ?? undefined)).toBe(true);
  });

  it("rejects absent or malformed IDs before server rendering", () => {
    expect(isThreadId(undefined)).toBe(false);
    expect(isThreadId("not-a-uuid")).toBe(false);
    expect(isThreadId(id)).toBe(true);
  });
});
