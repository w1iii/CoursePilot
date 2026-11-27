import { runWorker } from "../src/lib/job-worker";

process.env.COURSEPILOT_WORKER = "true";
// Standalone workers have no Next.js request/cache context.
process.env.CACHE_ENABLED = "false";
runWorker().catch((error) => {
  console.error("Worker stopped", error instanceof Error ? error.name : "unknown");
  process.exit(1);
});
