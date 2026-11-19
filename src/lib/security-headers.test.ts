import { describe, expect, it } from "vitest";
import config from "../../next.config";

describe("security header configuration", () => {
  it("covers root and nested routes without expanding CSP enforcement", async () => {
    const rules = await config.headers!();
    const global = rules.find((rule) => rule.source === "/:path*");
    expect(global).toBeDefined();
    expect(global?.headers.map((header) => header.key)).toEqual(expect.arrayContaining([
      "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
      "Content-Security-Policy-Report-Only",
    ]));
    expect(rules.find((rule) => rule.source === "/:all")?.headers).toEqual([
      expect.objectContaining({ key: "Content-Security-Policy" }),
    ]);
  });
});
