import { describe, expect, it, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";

import { decryptToken, encryptToken } from "@/lib/crypto";

describe("token encryption", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a canvas token", () => {
    const token = "15373~abcdefghijklmnopqrstuvwxyz";

    const encrypted = encryptToken(token);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted)).toBe(token);
  });

  it("produces a different ciphertext for the same plaintext", () => {
    const token = "same-token";

    expect(encryptToken(token)).not.toBe(encryptToken(token));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptToken("secret-token");
    const [version, iv, tag, data] = encrypted.split(".");
    const tampered = [version, iv, tag, `${data.slice(0, -2)}AA`].join(".");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptToken("not-a-valid-payload")).toThrow(
      "Unsupported encrypted token format",
    );
  });

  it("rejects a key of the wrong size", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("short").toString("base64");

    expect(() => encryptToken("x")).toThrow("32-byte key");
  });

  it("cannot decrypt with a rotated key", () => {
    const encrypted = encryptToken("secret-token");
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

    expect(() => decryptToken(encrypted)).toThrow();
  });
});
