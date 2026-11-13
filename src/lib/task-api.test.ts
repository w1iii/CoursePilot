import { describe, expect, it } from "vitest";
import { optionalDate, optionalText, readTaskJson, RequestValidationError } from "@/lib/task-api";

describe("task API input validation", () => {
  it("parses object JSON", async () => {
    await expect(readTaskJson(new Request("http://localhost", {
      method: "POST", body: JSON.stringify({ title: "Task" }),
    }))).resolves.toEqual({ title: "Task" });
  });

  it("rejects malformed and non-object JSON", async () => {
    for (const body of ["{", "null", "[]"]) {
      await expect(readTaskJson(new Request("http://localhost", { method: "POST", body })))
        .rejects.toBeInstanceOf(RequestValidationError);
    }
  });

  it("rejects oversized streamed bodies", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(33_000));
        controller.close();
      },
    });
    await expect(readTaskJson(new Request("http://localhost", {
      method: "POST", body, duplex: "half",
    } as RequestInit & { duplex: string })))
      .rejects.toThrow("Request body too large");
  });

  it("bounds optional text and normalizes dates", () => {
    expect(optionalText(null, "notes", 8)).toBeNull();
    expect(() => optionalText("123456789", "notes", 8)).toThrow(RequestValidationError);
    expect(optionalDate(null)).toBeNull();
    expect(optionalDate("2026-11-13T12:00:00Z")).toBe("2026-11-13T12:00:00.000Z");
    expect(() => optionalDate("tomorrow")).toThrow(RequestValidationError);
  });
});
