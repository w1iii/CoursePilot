import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function encryptionKey(): Buffer {
  const raw = requireEnv("TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

/** Encrypt a secret with AES-256-GCM. Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv, tag, ciphertext].map((part) =>
    typeof part === "string" ? part : part.toString("base64url"),
  ).join(".");
}

/** Decrypt a value produced by {@link encryptToken}. Throws when tampered with. */
export function decryptToken(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Unsupported encrypted token format");
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
