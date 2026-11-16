import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("allows the study pack function more time than its upstream request timeout", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/study-packs/route.ts"), "utf8");
  const client = readFileSync(resolve(process.cwd(), "src/lib/ai/study-prep.ts"), "utf8");
  const duration = route.match(/export const maxDuration = (\d+);/);
  const timeout = client.match(/const STUDY_PREP_TIMEOUT_MS = ([\d_]+);/);
  expect(duration).not.toBeNull();
  expect(timeout).not.toBeNull();
  expect(Number(duration![1]) * 1000).toBeGreaterThan(Number(timeout![1].replaceAll("_", "")));
});
