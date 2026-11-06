import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signRagToken, verifyRagTokenForTest } from "@/lib/ai/rag-token";

describe("RAG signed tokens", () => {
  beforeEach(() => {
    process.env.RAG_SIGNING_SECRET = "test-rag-secret";
  });

  afterEach(() => {
    delete process.env.RAG_SIGNING_SECRET;
  });

  it("binds a token to the user, course, and scope", () => {
    const token = signRagToken({
      userId: "user-1",
      courseKey: "course-1",
      scope: "chat",
    });

    const [payload] = token.split(".");
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    expect(claims).toMatchObject({
      sub: "user-1",
      course: "course-1",
      scope: "chat",
    });
    expect(claims.exp - claims.iat).toBe(120);
    expect(verifyRagTokenForTest(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = signRagToken({
      userId: "user-1",
      courseKey: "course-1",
      scope: "chat",
    });
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature.slice(0, -1)}x`;

    expect(verifyRagTokenForTest(tampered)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = signRagToken({
      userId: "user-1",
      courseKey: "course-1",
      scope: "chat",
    });
    process.env.RAG_SIGNING_SECRET = "different-secret";

    expect(verifyRagTokenForTest(token)).toBe(false);
  });

  it("fails closed without a signing secret", () => {
    delete process.env.RAG_SIGNING_SECRET;

    expect(() =>
      signRagToken({
        userId: "user-1",
        courseKey: "course-1",
        scope: "chat",
      }),
    ).toThrow("Missing required environment variable: RAG_SIGNING_SECRET");
  });

  it("rejects an excessive TTL", () => {
    expect(() =>
      signRagToken({
        userId: "user-1",
        courseKey: "course-1",
        scope: "chat",
        ttlSeconds: 301,
      }),
    ).toThrow("RAG token TTL must be between 1 and 300");
  });
});
