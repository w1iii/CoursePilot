import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => (req: NextRequest) => /^\/(dashboard|onboarding)(\/|$)/.test(req.nextUrl.pathname),
}));

import middleware from "./middleware";

describe("protected routes", () => {
  const run = middleware as unknown as (auth: () => Promise<{ userId: string | null }>, req: NextRequest) => Promise<Response | undefined>;

  it("redirects expired sessions to sign-in with the original destination", async () => {
    const req = new NextRequest("https://example.com/dashboard/settings?tab=courses");
    const response = await run(async () => ({ userId: null }), req);
    expect(response?.status).toBe(307);
    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe(req.url);
  });

  it("allows authenticated requests and public routes", async () => {
    expect(await run(async () => ({ userId: "user_1" }), new NextRequest("https://example.com/dashboard/settings"))).toBeUndefined();
    expect(await run(async () => ({ userId: null }), new NextRequest("https://example.com/sign-in"))).toBeUndefined();
  });
});
