import { pathToFileURL } from "node:url";

// Fixed staging host: never send the synthetic session to an arbitrary URL.
const STAGING_ORIGIN = "https://coursepilot-staging.vercel.app";
const COURSE_PATH = "/api/study-prep/courses";

export async function runSmoke({ cookie, fetchImpl = fetch }) {
  if (!cookie || /[\r\n]/.test(cookie)) throw new Error("Synthetic session cookie is missing or invalid");
  const response = await fetchImpl(`${STAGING_ORIGIN}${COURSE_PATH}`, {
    method: "GET",
    headers: { cookie, accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 200) throw new Error(`Authenticated course check returned HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) throw new Error("Authenticated course check returned an invalid response");
  return { courseCount: body.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runSmoke({ cookie: process.env.SYNTHETIC_SESSION_COOKIE });
    console.log(`Authenticated staging course check passed (${result.courseCount} courses).`);
  } catch (error) {
    // Do not log response bodies, request headers, or upstream exception details.
    console.error(error instanceof Error && /^(Synthetic session|Authenticated course)/.test(error.message)
      ? error.message : "Authenticated staging course check failed");
    process.exitCode = 1;
  }
}
