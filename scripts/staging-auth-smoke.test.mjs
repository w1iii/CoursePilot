import assert from "node:assert/strict";
import test from "node:test";
import { runSmoke } from "./staging-auth-smoke.mjs";

test("sends only a read-only authenticated request to the fixed staging host", async () => {
  const calls = [];
  const result = await runSmoke({ cookie: "session=synthetic", fetchImpl: async (...args) => {
    calls.push(args);
    return new Response("[]", { status: 200 });
  } });
  assert.equal(result.courseCount, 0);
  assert.equal(calls[0][0], "https://coursepilot-staging.vercel.app/api/study-prep/courses");
  assert.equal(calls[0][1].method, "GET");
  assert.equal(calls[0][1].redirect, "manual");
});

test("rejects missing, malformed and redirected sessions", async () => {
  await assert.rejects(runSmoke({ cookie: "" }), /missing or invalid/);
  await assert.rejects(runSmoke({ cookie: "bad\r\nheader" }), /missing or invalid/);
  await assert.rejects(runSmoke({ cookie: "session=synthetic", fetchImpl: async () => new Response(null, { status: 302 }) }), /HTTP 302/);
});

test("rejects a non-array response", async () => {
  await assert.rejects(runSmoke({ cookie: "session=synthetic", fetchImpl: async () => new Response("{}", { status: 200 }) }), /invalid response/);
});
