import { describe, expect, it, vi } from "vitest";
import { logServerError } from "./server-error";

describe("server error logging", () => {
  it("correlates failures without logging upstream messages or objects", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = logServerError("example.load", new Error("secret session token"));
    expect(log).toHaveBeenCalledWith("server request failed", { operation: "example.load", requestId: id, category: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret session token");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    log.mockRestore();
  });
});
