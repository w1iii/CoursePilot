import { revalidateTag, unstable_cache } from "next/cache";
import { env } from "@/lib/env";

const VERSION = "v1";
const USER_TAG_PREFIX = "coursepilot:user:";

export function userCacheTag(userId: string): string {
  return `${USER_TAG_PREFIX}${userId}`;
}

export function invalidateUserCache(userId: string): void {
  revalidateTag(userCacheTag(userId));
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
    tags: [userCacheTag(userId)],
  })();
}
