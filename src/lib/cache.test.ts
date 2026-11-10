import { beforeEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((loader: () => Promise<unknown>) => loader),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: unstableCacheMock,
}));

import {
  cacheUserRead,
  invalidateUserCache,
  invalidateUserResourceCache,
  userCacheTag,
  userResourceCacheTag,
} from "@/lib/cache";
import { revalidateTag } from "next/cache";

describe("user cache tags", () => {
  beforeEach(() => {
    vi.mocked(revalidateTag).mockClear();
    unstableCacheMock.mockClear();
    delete process.env.CACHE_ENABLED;
  });

  it("scopes tag to user ID", () => {
    expect(userCacheTag("user-123")).toBe("coursepilot:user:user-123");
  });

  it("invalidates that user's cache tag", () => {
    invalidateUserCache("user-123");
    expect(revalidateTag).toHaveBeenCalledWith("coursepilot:user:user-123");
  });

  it("invalidates selected user resource tags", () => {
    invalidateUserResourceCache("user-123", "tasks", "thread-list");
    expect(revalidateTag).toHaveBeenNthCalledWith(1, userResourceCacheTag("user-123", "tasks"));
    expect(revalidateTag).toHaveBeenNthCalledWith(2, userResourceCacheTag("user-123", "thread-list"));
  });

  it("bypasses Next cache when CACHE_ENABLED=false", async () => {
    process.env.CACHE_ENABLED = "false";
    const loader = vi.fn().mockResolvedValue("fresh");

    await expect(cacheUserRead("tasks", "user-123", 30, loader)).resolves.toBe("fresh");
    expect(loader).toHaveBeenCalledOnce();
    expect(unstableCacheMock).not.toHaveBeenCalled();
  });

  it("configures user and resource tags when server cache is enabled", async () => {
    const loader = vi.fn().mockResolvedValue("cached");

    await expect(cacheUserRead("tasks", "user-123", 30, loader)).resolves.toBe("cached");
    expect(unstableCacheMock).toHaveBeenCalledWith(loader, ["v1", "tasks", "user-123"], {
      revalidate: 30,
      tags: [userCacheTag("user-123"), userResourceCacheTag("user-123", "tasks")],
    });
  });
});
