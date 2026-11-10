import { revalidateTag, unstable_cache } from "next/cache";
import { env } from "@/lib/env";

const VERSION = "v1";
const USER_TAG_PREFIX = "coursepilot:user:";
const RESOURCE_TAG_PREFIX = "coursepilot:resource:";

export function userCacheTag(userId: string): string {
  return `${USER_TAG_PREFIX}${userId}`;
}

export function userResourceCacheTag(userId: string, resource: string): string {
  return `${RESOURCE_TAG_PREFIX}${userId}:${resource}`;
}

export function invalidateUserCache(userId: string): void {
  revalidateTag(userCacheTag(userId));
}

export function invalidateUserResourceCache(userId: string, ...resources: string[]): void {
  for (const resource of resources) {
    revalidateTag(userResourceCacheTag(userId, resource));
  }
}

/** Wrap user-scoped database reads in Next's server Data Cache. */
export function cacheUserRead<T>(
  resource: string,
  userId: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (env("CACHE_ENABLED") === "false") return loader();

  return unstable_cache(loader, [VERSION, resource, userId], {
    revalidate: ttlSeconds,
    tags: [userCacheTag(userId), userResourceCacheTag(userId, resource)],
  })();
}
