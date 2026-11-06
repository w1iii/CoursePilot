import { env } from "@/lib/env";
import { type CanvasCredentials } from "@/lib/canvas";

/** Canvas credentials sourced from stored personal access tokens. */
export interface StoredCanvasAccount {
  id: string;
  user_id: string;
  canvas_base_url: string;
  access_token_encrypted: string;
  token_last_validated_at: string | null;
}

/** Credentials that come from the shared env token (only allowed locally). */
export function envCanvasCredentials(): CanvasCredentials | null {
  // In production the shared env token is strictly disallowed.
  if (env("NEXT_PUBLIC_NODE_ENV") === "production" || process.env.NODE_ENV === "production") {
    if (env("CANVAS_ALLOW_ENV_TOKEN") === "true") {
      throw new Error(
        "CANVAS_ALLOW_ENV_TOKEN must not be true in production. Set it to false or remove it.",
      );
    }
  }

  if (env("CANVAS_ALLOW_ENV_TOKEN") !== "true") return null;

  const token = env("CANVAS_ACCESS_TOKEN");
  if (!token) return null;

  const baseUrl = env("CANVAS_API_URL") ?? "https://canvas.instructure.com";
  return {
    baseUrl,
    token,
  };
}

/** Resolve the Canvas credentials for a user, preferring stored personal
 *  tokens over the shared env token (which is disabled in production). */
export async function getCanvasCredentials(userId: string): Promise<{
  credentials: CanvasCredentials;
  account: StoredCanvasAccount | null;
  source: "user" | "env";
}> {
  const account = await loadCanvasAccount(userId);

  if (account) {
    return {
      credentials: {
        baseUrl: account.canvas_base_url,
        token: decryptToken(account.access_token_encrypted),
      },
      account,
      source: "user",
    };
  }

  const fallback = envCanvasCredentials();
  if (fallback) {
    return { credentials: fallback, account: null, source: "env" };
  }

  throw new CanvasNotConnectedError();
}