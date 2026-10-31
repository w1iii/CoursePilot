import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseAdminMock, fromMock } = vi.hoisted(() => ({
  supabaseAdminMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock("@/lib/crypto", () => ({
  decryptToken: (value: string) => value.replace(/^encrypted:/, ""),
  encryptToken: (value: string) => `encrypted:${value}`,
}));

import {
  CanvasNotConnectedError,
  disconnectCanvasAccount,
  getCanvasCredentials,
  getCanvasStatus,
  saveCanvasAccount,
} from "@/lib/canvas-account";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

function builder(result: QueryResult) {
  const self: Record<string, unknown> = {};
  const chain = () => self;
  Object.assign(self, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    update: vi.fn(chain),
    upsert: vi.fn(chain),
    delete: vi.fn(chain),
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  });
  return self;
}

const storedAccount = {
  id: "account-1",
  user_id: "user-a",
  canvas_base_url: "https://usls.instructure.com",
  canvas_user_id: 45082,
  canvas_user_name: "Test Student",
  access_token_encrypted: "encrypted:canvas-token",
  token_last_validated_at: "2026-10-31T00:00:00.000Z",
  invalid_at: null,
  created_at: "2026-10-31T00:00:00.000Z",
  updated_at: "2026-10-31T00:00:00.000Z",
};

function mockTable(result: QueryResult) {
  const q = builder(result);
  fromMock.mockReturnValue(q);
  supabaseAdminMock.mockReturnValue({ from: fromMock });
  return q;
}

describe("canvas account credentials", () => {
  beforeEach(() => {
    fromMock.mockReset();
    delete process.env.CANVAS_ALLOW_ENV_TOKEN;
    delete process.env.CANVAS_ACCESS_TOKEN;
    process.env.CANVAS_API_URL = "https://canvas.instructure.com";
  });

  it("prefers the user's stored token over the shared env token", async () => {
    const query = mockTable({ data: storedAccount, error: null });
    process.env.CANVAS_ALLOW_ENV_TOKEN = "true";
    process.env.CANVAS_ACCESS_TOKEN = "shared-token";

    const resolved = await getCanvasCredentials("user-a");

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(resolved.source).toBe("user");
    expect(resolved.credentials).toEqual({
      baseUrl: "https://usls.instructure.com",
      token: "canvas-token",
    });
  });

  it("uses the shared env token only when explicitly allowed", async () => {
    mockTable({ data: null, error: null });
    process.env.CANVAS_ACCESS_TOKEN = "shared-token";

    await expect(getCanvasCredentials("user-a")).rejects.toBeInstanceOf(
      CanvasNotConnectedError,
    );

    process.env.CANVAS_ALLOW_ENV_TOKEN = "true";
    const resolved = await getCanvasCredentials("user-a");
    expect(resolved.source).toBe("env");
    expect(resolved.credentials.token).toBe("shared-token");
  });

  it("flags a rejected token for reconnection", async () => {
    mockTable({
      data: { ...storedAccount, invalid_at: "2026-10-31T01:00:00.000Z" },
      error: null,
    });

    const status = await getCanvasStatus("user-a");

    expect(status.connected).toBe(true);
    expect(status.needsReconnect).toBe(true);
    expect(status.source).toBe("user");
  });

  it("reports a disconnected user when no env fallback exists", async () => {
    mockTable({ data: null, error: null });

    const status = await getCanvasStatus("user-a");

    expect(status).toEqual({
      connected: false,
      needsReconnect: false,
      baseUrl: null,
      canvasUserName: null,
      canvasUserId: null,
      lastValidatedAt: null,
      source: null,
    });
  });

  it("encrypts the token on save", async () => {
    const query = mockTable({ data: storedAccount, error: null });

    await saveCanvasAccount({
      userId: "user-a",
      baseUrl: "https://usls.instructure.com",
      token: "canvas-token",
      canvasUser: { id: 45082, name: "Test Student" },
    });

    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        access_token_encrypted: "encrypted:canvas-token",
        canvas_user_id: 45082,
        invalid_at: null,
      }),
      { onConflict: "user_id,canvas_base_url" },
    );
  });

  it("deletes only the signed-in user's connection", async () => {
    const query = mockTable({ data: null, error: null });

    await disconnectCanvasAccount("user-a");

    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
