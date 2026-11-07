import {
  defaultCanvasBaseUrl,
  getCanvasSelf,
  type CanvasCredentials,
  type CanvasUser,
} from "@/lib/canvas";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";

export interface CanvasAccountRow {
  id: string;
  user_id: string;
  canvas_base_url: string;
  canvas_user_id: number | null;
  canvas_user_name: string | null;
  access_token_encrypted: string;
  token_last_validated_at: string | null;
  invalid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasAccountStatus {
  connected: boolean;
  needsReconnect: boolean;
  baseUrl: string | null;
  canvasUserName: string | null;
  canvasUserId: number | null;
  lastValidatedAt: string | null;
  source: "user" | "env" | null;
}

export class CanvasNotConnectedError extends Error {
  constructor() {
    super("Canvas is not connected. Add your Canvas URL and access token first.");
    this.name = "CanvasNotConnectedError";
  }
}

export async function loadCanvasAccount(userId: string): Promise<CanvasAccountRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("canvas_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load Canvas account: ${error.message}`);
  return (data as CanvasAccountRow | null) ?? null;
}

function envCanvasCredentials(): CanvasCredentials | null {
  if (env("CANVAS_ALLOW_ENV_TOKEN") !== "true") return null;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Shared Canvas environment token is forbidden in production");
  }

  const token = env("CANVAS_ACCESS_TOKEN");
  if (!token) return null;

  return {
    baseUrl: defaultCanvasBaseUrl(),
    token,
  };
}

/**
 * Resolve the Canvas credentials for a user.
 *
 * Stored personal access tokens win. The shared env token is only used when
 * CANVAS_ALLOW_ENV_TOKEN=true (local development and tests).
 */
export async function getCanvasCredentials(userId: string): Promise<{
  credentials: CanvasCredentials;
  account: CanvasAccountRow | null;
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

export async function getCanvasStatus(userId: string): Promise<CanvasAccountStatus> {
  const account = await loadCanvasAccount(userId);

  if (account) {
    return {
      connected: true,
      needsReconnect: Boolean(account.invalid_at),
      baseUrl: account.canvas_base_url,
      canvasUserName: account.canvas_user_name,
      canvasUserId: account.canvas_user_id,
      lastValidatedAt: account.token_last_validated_at,
      source: "user",
    };
  }

  const fallback = envCanvasCredentials();
  if (fallback) {
    return {
      connected: true,
      needsReconnect: false,
      baseUrl: fallback.baseUrl,
      canvasUserName: null,
      canvasUserId: null,
      lastValidatedAt: null,
      source: "env",
    };
  }

  return {
    connected: false,
    needsReconnect: false,
    baseUrl: null,
    canvasUserName: null,
    canvasUserId: null,
    lastValidatedAt: null,
    source: null,
  };
}

export async function saveCanvasAccount(input: {
  userId: string;
  baseUrl: string;
  token: string;
  canvasUser: CanvasUser;
}): Promise<CanvasAccountRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("canvas_accounts")
    .upsert(
      {
        user_id: input.userId,
        canvas_base_url: input.baseUrl,
        canvas_user_id: input.canvasUser.id,
        canvas_user_name: input.canvasUser.name,
        access_token_encrypted: encryptToken(input.token),
        token_last_validated_at: now,
        invalid_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,canvas_base_url" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save Canvas account: ${error?.message ?? "no row returned"}`);
  }
  return data as CanvasAccountRow;
}

export async function validateCanvasToken(
  baseUrl: string,
  token: string,
): Promise<CanvasUser> {
  return getCanvasSelf({ baseUrl, token });
}

export async function markCanvasAccountInvalid(userId: string, baseUrl: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("canvas_accounts")
    .update({ invalid_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("canvas_base_url", baseUrl);

  if (error) {
    console.error("Failed to mark Canvas account invalid", error.message);
  }
}

export async function markCanvasAccountValid(userId: string, baseUrl: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("canvas_accounts")
    .update({ invalid_at: null, token_last_validated_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("canvas_base_url", baseUrl);

  if (error) {
    console.error("Failed to mark Canvas account valid", error.message);
  }
}

export async function disconnectCanvasAccount(userId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("canvas_accounts")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to disconnect Canvas: ${error.message}`);
}
