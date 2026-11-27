import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), courses: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/user", () => ({ requireUser: mocks.user, UnauthorizedError: class UnauthorizedError extends Error {} }));
vi.mock("@/lib/ai/study-prep-courses", () => ({ listStudyPrepCourses: mocks.courses }));
vi.mock("@/lib/cache", () => ({ invalidateUserCache: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }) }) }) }));

import { UnauthorizedError } from "@/lib/user";
import { GET as courses } from "./study-prep/courses/route";
import { GET as modules } from "./study-prep/courses/[courseId]/modules/route";
import { GET as pack, DELETE as deletePack } from "./study-packs/[id]/route";
import { GET as sessions, POST as startSession } from "./study-packs/[id]/sessions/route";
import { GET as loadSession, PATCH as updateSession } from "./study-sessions/[id]/route";
import { POST as attempt } from "./study-sessions/[id]/attempts/route";

const id = "86f039b2-6993-4e98-a11b-c89e1bf3b407";
const request = () => new Request("http://localhost", { method: "POST", body: "{}" });
const idParams = () => ({ params: Promise.resolve({ id }) });
const calls = [
  ["study-prep.courses", () => courses()],
  ["study-prep.modules", () => modules(request(), { params: Promise.resolve({ courseId: id }) })],
  ["study-packs.load", () => pack(request(), idParams())],
  ["study-packs.delete", () => deletePack(request(), idParams())],
  ["study-sessions.list", () => sessions(request(), idParams())],
  ["study-sessions.create", () => startSession(request(), idParams())],
  ["study-sessions.load", () => loadSession(request(), idParams())],
  ["study-sessions.update", () => updateSession(request(), idParams())],
  ["study-attempts.save", () => attempt(request(), idParams())],
] as const;

describe("study routes error handling", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "user" }); });

  it.each(calls)("%s rejects unauthenticated requests", async (_operation, call) => {
    mocks.user.mockRejectedValue(new UnauthorizedError());
    expect((await call()).status).toBe(401);
  });

  it.each(calls)("%s logs unexpected failures safely", async (operation, call) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.user.mockRejectedValue(new Error("secret upstream details"));
    const response = await call();
    expect(response.status).toBe(operation === "study-prep.modules" ? 502 : 500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(log).toHaveBeenCalledWith("server request failed", expect.objectContaining({ operation, requestId: response.headers.get("x-request-id") }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret upstream details");
    log.mockRestore();
  });

  it("does not mistake a failed pack lookup for a missing pack", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "secret" } });
    const response = await startSession(request(), idParams());
    expect(response.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    log.mockRestore();
  });
});
