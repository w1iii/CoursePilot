import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import UsernameForm from "./UsernameForm";

it("shows username form without placeholder test heading", () => {
  const html = renderToStaticMarkup(<UsernameForm initialUsername="student" />);
  expect(html).toContain("Coursa username");
  expect(html).not.toContain("> Test <");
  expect(html).not.toContain("<h1");
});
