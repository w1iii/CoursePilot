import { describe, expect, it } from "vitest";
import { isUuid, readJsonObject } from "./api-validation";

describe("API input validation helpers", () => {
  it("accepts RFC UUIDs and rejects malformed IDs", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("only parses JSON objects", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    expect(await readJsonObject(request)).toEqual({ ok: true });
    expect(await readJsonObject(new Request("http://localhost/api", { method: "POST", body: "[]" }))).toBeNull();
    expect(await readJsonObject(new Request("http://localhost/api", { method: "POST", body: "{" }))).toBeNull();
  });

  it("rejects oversized bodies", async () => {
    const body = JSON.stringify({ value: "x".repeat(65_000) });
    const request = new Request("http://localhost/api", { method: "POST", body });
    expect(await readJsonObject(request)).toBeNull();
  });
});
