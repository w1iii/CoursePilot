import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cachedJson, invalidateClientCache } from "@/lib/client-cache";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("client cache", () => {
  beforeEach(() => {
    invalidateClientCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves a fresh entry without a second request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(["thread"]));
    vi.stubGlobal("fetch", fetchMock);

    const first = await cachedJson<string[]>("threads", "/api/threads", { ttlMs: 15_000 });
    const second = await cachedJson<string[]>("threads", "/api/threads", { ttlMs: 15_000 });

    expect(first).toEqual(["thread"]);
    expect(second).toEqual(["thread"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forces a refetch when requested", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([1]))
      .mockResolvedValueOnce(jsonResponse([2]));
    vi.stubGlobal("fetch", fetchMock);

    await cachedJson<number[]>("threads", "/api/threads");
    const forced = await cachedJson<number[]>("threads", "/api/threads", { force: true });

    expect(forced).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent requests", async () => {
    let resolveRequest: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = cachedJson<string[]>("threads", "/api/threads");
    const second = cachedJson<string[]>("threads", "/api/threads");
    resolveRequest(jsonResponse(["thread"]));

    expect(await Promise.all([first, second])).toEqual([["thread"], ["thread"]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(jsonResponse(["thread"]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(cachedJson("threads", "/api/threads")).rejects.toThrow("Request failed: 500");
    await expect(cachedJson("threads", "/api/threads")).resolves.toEqual(["thread"]);
  });

  it("invalidates every key with a matching prefix", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([1]))
      .mockResolvedValueOnce(jsonResponse([2]));
    vi.stubGlobal("fetch", fetchMock);

    await cachedJson<number[]>("threads", "/api/threads");
    invalidateClientCache("threads");
    const after = await cachedJson<number[]>("threads", "/api/threads");

    expect(after).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
