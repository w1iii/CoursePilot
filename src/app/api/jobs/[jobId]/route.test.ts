import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn(), eq: vi.fn(), terminal: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: mocks.from }) }));
import { PATCH } from "./route";
import { UnauthorizedError } from "@/lib/user";
const id = "11111111-1111-4111-8111-111111111111";
const dismiss = (jobId = id) => PATCH(new Request("http://localhost"), { params: Promise.resolve({ jobId }) });

describe("job notification dismissal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "owner" });
    const query = { update: vi.fn().mockReturnThis(), eq: mocks.eq, in: mocks.terminal,
      select: vi.fn().mockReturnThis(), maybeSingle: mocks.single };
    mocks.eq.mockReturnValue(query);
    mocks.terminal.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    mocks.single.mockResolvedValue({ data: { id }, error: null });
  });
  it("dismisses only current owner's terminal job", async () => {
    expect((await dismiss()).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.terminal).toHaveBeenCalledWith("status", ["succeeded", "partial_failure", "failed"]);
  });
  it("does not expose jobs belonging to another owner or still running", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect((await dismiss()).status).toBe(404);
  });
  it("rejects invalid identifiers without querying storage", async () => {
    expect((await dismiss("bad-id")).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.user.mockRejectedValue(new UnauthorizedError());
    expect((await dismiss()).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
