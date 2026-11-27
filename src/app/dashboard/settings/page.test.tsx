import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn() };
  return { query, from: vi.fn() };
});
vi.mock("@/lib/user", () => ({ requireUser: async () => ({ id: "user", email: "user@example.com" }) }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/cache", () => ({ cacheUserRead: async (_key: string, _user: string, _ttl: number, load: () => unknown) => load() }));
vi.mock("@/lib/canvas-account", () => ({ getCanvasStatus: async () => ({ connected: true, needsReconnect: false, lastValidatedAt: null }) }));
vi.mock("@/lib/canvas", () => ({ defaultCanvasBaseUrl: () => "https://canvas.example.com" }));
vi.mock("@clerk/nextjs", () => ({ SignOutButton: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../DashboardShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../CanvasConnect", () => ({ default: () => <div>Canvas connection</div> }));
vi.mock("../SyncButton", () => ({ default: () => <button>General sync</button> }));
vi.mock("./SettingsNav", () => ({ default: () => null }));
vi.mock("./DeleteAccount", () => ({ default: () => null }));
import SettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(mocks.query);
  mocks.query.select.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
  mocks.query.not.mockReturnValue(mocks.query);
  mocks.query.order.mockReturnValue(mocks.query);
  mocks.query.limit.mockResolvedValue({ data: [{ id: "1", course_code: "CS101", course_name: "Programming" }], error: null });
});

it("queries only selected indexed courses and renders general sync without workspace", async () => {
  const html = renderToStaticMarkup(await SettingsPage());
  expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user");
  expect(mocks.query.eq).toHaveBeenCalledWith("selected_for_rag", true);
  expect(mocks.query.not).toHaveBeenCalledWith("rag_indexed_at", "is", null);
  expect(html).toContain("CS101 — Programming");
  expect(html).toContain("General sync");
  expect(html).not.toContain("Workspace");
  expect(html).not.toContain("Dashboard defaults");
});
