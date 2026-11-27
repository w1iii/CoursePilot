import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IndexedCourses from "./IndexedCourses";

describe("indexed courses", () => {
  it("renders course names without index metrics or per-course controls", () => {
    const html = renderToStaticMarkup(<IndexedCourses courses={[
      { id: "1", course_code: "CS101", course_name: "Programming" },
      { id: "2", course_code: null, course_name: "Writing" },
    ]} />);
    expect(html).toContain("CS101 — Programming");
    expect(html).toContain("Writing");
    expect(html).not.toMatch(/docs|chunks|failed|resync|<table|<button/i);
  });

  it("explains the empty state", () => {
    expect(renderToStaticMarkup(<IndexedCourses courses={[]} />)).toContain("No indexed courses yet");
  });
});
