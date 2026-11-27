// Disposable localhost-only PostgreSQL validation. Never reads project DB env.
import { spawnSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const name = `coursepilot-study-validation-${randomUUID().slice(0, 8)}`;
let started = false;
function run(args, input) {
  const result = spawnSync("docker", args, { cwd: root, input, encoding: "utf8", timeout: 120_000 });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || "Docker validation failed");
  return result.stdout;
}
const sql = (input) => run(["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "study_validation"], input);
try {
  run(["run", "--detach", "--rm", "--name", name, "--label", "purpose=coursepilot-disposable-validation",
    "--env", "POSTGRES_DB=study_validation", "--env", "POSTGRES_PASSWORD=local-validation-only", "postgres:17"]);
  started = true;
  run(["exec", name, "sh", "-c", "for i in $(seq 1 60); do pg_isready -h 127.0.0.1 -U postgres -d study_validation >/dev/null 2>&1 && exit 0; sleep 0.5; done; exit 1"]);
  sql("create role anon; create role authenticated; create role service_role bypassrls;");
  for (const file of [
    "supabase/schema.sql",
    "supabase/migrations/202611140001_study_prep.sql",
    "supabase/migrations/202611270001_background_jobs.sql",
    "supabase/migrations/202611270002_study_reliability.sql",
    "supabase/tests/background_jobs.sql",
    "supabase/tests/study_reliability.sql",
  ]) {
    sql(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
    console.log(`PASS ${file}`);
  }

  // Real concurrent connections: retries cannot create duplicate sessions.
  sql(`
    insert into users(id,clerk_user_id,email) values('11111111-1111-4111-8111-111111111111','concurrent','concurrent@example.test');
    insert into courses(id,user_id,canvas_course_id,course_name,selected_for_rag) values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',1,'Concurrent',true);
    insert into study_packs(id,user_id,course_id,title,mode,difficulty,item_count,source_index_version)
      values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','Concurrent','flashcards','easy',1,'v1');
    insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,citations,difficulty)
      values('33333333-3333-4333-8333-333333333333',0,'flashcard','Q','A','E','[{"id":"source"}]','easy');
  `);
  const parallelSql = (query) => new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", name, "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "study_validation"], { cwd: root });
    let output = "", error = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(query);
  });
  const starts = await Promise.all(Array.from({ length: 4 }, () => parallelSql("select start_study_session('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333')->>'id';")));
  if (new Set(starts).size !== 1) throw new Error("Concurrent starts created different sessions");
  console.log("PASS concurrent session starts reuse one session");
  sql("select report_study_worker_ready(gen_random_uuid());");
  const enqueues = await Promise.all(Array.from({ length: 8 }, (_, index) => parallelSql(`select coalesce(job_id::text,rejection) from enqueue_study_prep_job('11111111-1111-4111-8111-111111111111','{"courseId":"22222222-2222-4222-8222-222222222222"}','concurrent:${index}');`)));
  if (enqueues.filter((result) => result === "limit").length !== 3) throw new Error("Concurrent generation exceeded five-request minute limit");
  console.log("PASS concurrent quota enforcement permits exactly five requests");
  const existingKey = enqueues.findIndex((result) => result !== "limit");
  const duplicateEnqueues = await Promise.all(Array.from({ length: 4 }, () => parallelSql(`select job_id from enqueue_study_prep_job('11111111-1111-4111-8111-111111111111','{"courseId":"22222222-2222-4222-8222-222222222222"}','concurrent:${existingKey}');`)));
  if (new Set(duplicateEnqueues).size !== 1 || duplicateEnqueues[0] !== enqueues[existingKey]) throw new Error("Duplicate delivery did not reuse job at quota");
  console.log("PASS concurrent duplicate delivery reuses existing job without quota charge");

  const itemId = await parallelSql("select id from study_pack_items where pack_id='33333333-3333-4333-8333-333333333333';");
  for (let index = 0; index < 6; index++) {
    const sessionId = await parallelSql("select start_study_session('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333')->>'id';");
    sql(`select save_study_attempt('11111111-1111-4111-8111-111111111111','${sessionId}','${itemId}','Wrong',false);`);
    await Promise.all([
      parallelSql(`select save_study_attempt('11111111-1111-4111-8111-111111111111','${sessionId}','${itemId}','A',true);`),
      parallelSql(`select update_study_session('11111111-1111-4111-8111-111111111111','${sessionId}',1,'completed');`),
    ]);
    const invariant = await parallelSql(`select status='completed' and score=(select count(*) from study_attempts where session_id='${sessionId}' and is_correct) from study_sessions where id='${sessionId}';`);
    if (invariant !== "t") throw new Error("Concurrent answer/completion left stale score");
  }
  console.log("PASS concurrent answer/completion keeps final scores consistent (six races)");
  for (const file of [
    "supabase/migrations/202611270003_single_active_study.sql",
    "supabase/tests/single_active_study.sql",
  ]) {
    sql(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
    console.log(`PASS ${file}`);
  }
  sql(`
    insert into users(id,clerk_user_id,email) values('44444444-4444-4444-8444-444444444444','single-concurrent','single-concurrent@example.test');
    insert into courses(id,user_id,canvas_course_id,course_name,selected_for_rag)
      values('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444',1,'Single concurrent',true);
  `);
  const guarded = await Promise.all(Array.from({ length: 8 }, (_, index) => parallelSql(`select job_id::text||':'||coalesce(rejection,'accepted') from enqueue_study_prep_job('44444444-4444-4444-8444-444444444444','{"courseId":"55555555-5555-4555-8555-555555555555","moduleIds":[${index + 1}]}','single:${index}');`)));
  if (new Set(guarded.map((result) => result.split(":")[0])).size !== 1 ||
    guarded.filter((result) => result.endsWith(":accepted")).length !== 1 ||
    guarded.filter((result) => result.endsWith(":busy")).length !== 7) throw new Error("Concurrent different-scope requests queued multiple study packs");
  const charge = await parallelSql("select count from study_generation_windows where user_id='44444444-4444-4444-8444-444444444444' and window_kind='day';");
  if (charge !== "1") throw new Error("Busy requests charged study quota");
  console.log("PASS eight concurrent different-scope requests create one job and one quota charge");
  for (const file of [
    "supabase/migrations/202611270004_study_answer_validation.sql",
    "supabase/tests/study_answer_validation.sql",
  ]) {
    sql(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
    console.log(`PASS ${file}`);
  }
} finally {
  if (started) {
    run(["stop", "--time", "5", name]);
    console.log("Disposable database removed. No production database accessed.");
  }
}
