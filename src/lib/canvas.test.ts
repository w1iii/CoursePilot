import { describe, expect, it } from "vitest";

import { normalizeCanvasAccessToken, normalizeCanvasBaseUrl } from "@/lib/canvas";

describe("normalizeCanvasAccessToken", () => {
  it("accepts raw tokens and copied Bearer header values", () => {
    expect(normalizeCanvasAccessToken("  15373~abc123  ")).toBe("15373~abc123");
    expect(normalizeCanvasAccessToken("Bearer 15373~abc123")).toBe("15373~abc123");
    expect(normalizeCanvasAccessToken('"Bearer 15373~abc123"')).toBe("15373~abc123");
  });
});

describe("normalizeCanvasBaseUrl", () => {
  it("adds https and strips trailing slashes", () => {
    expect(normalizeCanvasBaseUrl("usls.instructure.com")).toBe(
      "https://usls.instructure.com",
    );
    expect(normalizeCanvasBaseUrl("https://usls.instructure.com///")).toBe(
      "https://usls.instructure.com",
    );
  });

  it("keeps an optional path prefix", () => {
    expect(normalizeCanvasBaseUrl("https://example.edu/canvas/")).toBe(
      "https://example.edu/canvas",
    );
  });

  it("allows http for local development only", () => {
    expect(normalizeCanvasBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(() => normalizeCanvasBaseUrl("http://example.edu")).toThrow(
      "Canvas URL must use https",
    );
  });

  it("rejects non-http schemes", () => {
    expect(() => normalizeCanvasBaseUrl("ftp://example.edu")).toThrow(
      "Canvas URL must use https",
    );
    expect(() => normalizeCanvasBaseUrl("javascript:alert(1)")).toThrow(
      "Canvas URL must use https",
    );
  });

  it("rejects credentials in the URL and empty input", () => {
    expect(() => normalizeCanvasBaseUrl("https://user:pass@example.edu")).toThrow(
      "Canvas URL must not contain credentials",
    );
    expect(() => normalizeCanvasBaseUrl("   ")).toThrow("Canvas URL is required");
  });
});
