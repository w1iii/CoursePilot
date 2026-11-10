"use client";

interface Entry {
  value: unknown;
  expiresAt: number;
}

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export interface ClientCacheOptions {
  ttlMs?: number;
  /** Skip a fresh entry and hit the network. */
  force?: boolean;
}

/**
 * Fetch JSON through a short-lived in-memory cache.
 *
 * Concurrent callers share one request, which keeps a remounting component
 * from firing duplicate network reads.
 */
export async function cachedJson<T>(
  key: string,
  url: string,
  { ttlMs = 15_000, force = false }: ClientCacheOptions = {},
): Promise<T> {
  if (!force) {
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  })();

  inflight.set(key, request);
  try {
    const value = await request;
    entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  } finally {
    if (inflight.get(key) === request) inflight.delete(key);
  }
}

/** Drop cached entries, or every entry whose key starts with `keyPrefix`. */
export function invalidateClientCache(keyPrefix?: string): void {
  const matches = (key: string) => !keyPrefix || key.startsWith(keyPrefix);
  for (const key of entries.keys()) if (matches(key)) entries.delete(key);
  for (const key of inflight.keys()) if (matches(key)) inflight.delete(key);
}
