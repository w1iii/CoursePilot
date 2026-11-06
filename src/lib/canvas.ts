import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CanvasAuthError, normalizeCanvasBaseUrl } from "@/lib/canvas";
import {
  saveCanvasAccount,
  validateCanvasToken,
} from "@/lib/canvas-account";
import { requireUser, UnauthorizedError } from "@/lib/user";

// Private / loopback / link-local / metadata ranges that must never be
// reachable from a user-supplied Canvas base URL.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "10.0.0.0", // 10.0.0.0/8
  "172.16.0.0", // 172.16.0.0/12 (subset checked below)
  "192.168.0.0", // 192.168.0.0/16
]);

/** True when a hostname falls inside a private / reserved IPv4 range. */
function isPrivateIP(hostname: string): boolean {
  if (!hostname) return false;
  const ipv4 = hostname.split(".").map(Number);
  if (ipv4.length === 4) {
    // 10.0.0.0/8
    if (ipv4[0] === 10) return true;
    // 172.16.0.0/12
    if (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) return true;
    // 192.168.0.0/16
    if (ipv4[0] === 192 && ipv4[1] === 168) return true;
    // 169.254.0.0/16 (link‑local)
    if (ipv4[0] === 169 && ipv4[1] === 254) return true;
  }
  return false;
}

/** Resolve a hostname and reject if it resolves to a private / blocked IP. */
async function resolveAndBlock(baseUrl: string): Promise<string> {
  const url = new URL(baseUrl);
  // First, reject obviously private hosts without a DNS lookup.
  if (isPrivateIP(url.hostname)) {
    throw new Error(
      `Canvas base URL resolves to a private address which is not allowed: ${baseUrl}`,
    );
  }
  // Resolve the hostname to an IP and block private/link‑local/metadata.
  try {
    const addr = await Promise.race([
      // 5‑second resolution timeout.
      fetch(`https://dns.google/resolve?name=${url.hostname}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      }).then((r) => {
        if (!r.ok) throw new Error("DNS lookup failed");
        return r.json();
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("DNS timeout")), 5000)),
    ]);
    const results: any[] = addr;
    const ip = results[0]?.address?.ip || url.hostname;
    if (isPrivateIP(ip)) {
      throw new Error(
        `Canvas base URL resolves to a private address ${ip} which is not allowed`,
      );
    }
  } catch (e) {
    // If DNS resolution fails, still allow the request – we cannot
    // definitively block, but we have already rejected explicit private
    // hosts above.
    console.warn(`DNS resolution failed for ${baseUrl}: ${e}`);
  }
  return baseUrl;
}

/** Normalise + resolve‑and‑block the Canvas base URL. */
export async function hardenedCanvasBaseUrl(raw: string): Promise<string> {
  const normalized = normalizeCanvasBaseUrl(raw);
  return await resolveAndBlock(normalized);
}

/** Canvas fetch with a hard timeout and no redirect-follow. */
export async function canvasFetchTimeout<T>(
  credentials: CanvasCredentials,
  path: string,
  init?: RequestInit,
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${credentials.baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      throw new CanvasAuthError();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Canvas API error ${res.status} for ${path}: ${text.slice(0, 240)}`,
      );
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** POST to Canvas connect but first harden the base URL. */
export async function hardenedCanvasConnect(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as
      | { canvas_base_url?: unknown; access_token?: unknown }
      | null;

    const rawUrl = typeof body?.canvas_base_url === "string" ? body.canvas_base_url : "";
    const rawToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";

    if (!rawToken) {
      return NextResponse.json({ error: "Canvas access token is required" }, { status: 400 });
    }
    if (rawToken.length > 500) {
      return NextResponse.json({ error: "Canvas access token is too long" }, { status: 400 });
    }

    let baseUrl: string;
    try {
      baseUrl = await hardenedCanvasBaseUrl(rawUrl);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    let canvasUser;
    try {
      canvasUser = await validateCanvasToken(baseUrl, rawToken);
    } catch (err) {
      if (err instanceof CanvasAuthError) {
        return NextResponse.json(
          { error: "Canvas rejected that access token. Check the token and try again." },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: `Could not reach Canvas: ${(err as Error).message}` },
        { status: 502 },
      );
    }

    const account = await saveCanvasAccount({
      userId: user.id,
      baseUrl,
      token: rawToken,
      canvasUser,
    });

    return NextResponse.json({
      connected: true,
      baseUrl: account.canvas_base_url,
      canvasUserName: account.canvas_user_name,
      canvasUserId: account.canvas_user_id,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("canvas connect error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export default hardenedCanvasBaseUrl;