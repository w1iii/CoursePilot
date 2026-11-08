import { describe, expect, it, vi } from "vitest";

const { canvasRequest } = vi.hoisted(() => ({ canvasRequest: vi.fn() }));
vi.mock("@/lib/canvas-network", () => ({ canvasRequest, validateCanvasUrl: vi.fn() }));

import { listAssignments } from "@/lib/canvas";

describe("Canvas pagination", () => {
  it("loads all pages before returning assignments", async () => {
    canvasRequest.mockReset().mockResolvedValueOnce({
      status: 200, body: [{ id: 1 }],
      link: '<https://canvas.edu/api/v1/courses/4/assignments?page=2>; rel="next"',
    }).mockResolvedValueOnce({ status: 200, body: [{ id: 2 }] });
    const assignments = await listAssignments({ baseUrl: "https://canvas.edu", token: "token" }, 4);
    expect(assignments.map((a) => a.id)).toEqual([1, 2]);
    expect(canvasRequest).toHaveBeenCalledTimes(2);
  });

  it("rejects cross-origin next links", async () => {
    canvasRequest.mockReset().mockResolvedValue({
      status: 200, body: [], link: '<https://attacker.test/api/v1/tasks>; rel="next"',
    });
    await expect(listAssignments({ baseUrl: "https://canvas.edu", token: "t" }, 4))
      .rejects.toThrow("outside API origin");
    expect(canvasRequest).toHaveBeenCalledTimes(1);
  });

  it("rejects pagination loops", async () => {
    canvasRequest.mockReset().mockResolvedValue({
      status: 200, body: [],
      link: '<https://canvas.edu/api/v1/courses/4/assignments?per_page=100&order_by=due_at>; rel="next"',
    });
    await expect(listAssignments({ baseUrl: "https://canvas.edu", token: "t" }, 4))
      .rejects.toThrow("pagination limit exceeded");
  });
});
