import { describe, expect, it } from "vitest";
import { SESSION_EXPIRED, syncErrorMessage } from "./sync-errors";

describe("sync error messages", () => {
  it("offers reauthentication for expired sessions", () => {
    expect(syncErrorMessage(401)).toBe(SESSION_EXPIRED);
  });

  it.each([400, 409, 429, 503])("gives an actionable message for %i", (status) => {
    expect(syncErrorMessage(status)).not.toBe(syncErrorMessage(500));
  });

  it("does not expose unexpected server errors", () => {
    expect(syncErrorMessage(502)).toBe("Sync could not be completed. Please try again.");
  });
});
