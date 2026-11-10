import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (loader: () => Promise<unknown>) => loader,
}));

import { invalidateUserCache, userCacheTag } from "@/lib/cache";
import { revalidateTag } from "next/cache";

describe("user cache tags", () => {
  it("scopes tag to user ID", () => {
    expect(userCacheTag("user-123")).toBe("coursepilot:user:user-123");
  });

  it("invalidates that user's cache tag", () => {
    invalidateUserCache("user-123");
    expect(revalidateTag).toHaveBeenCalledWith("coursepilot:user:user-123");
  });
});
