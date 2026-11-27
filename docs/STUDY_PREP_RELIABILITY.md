# Study Prep reliability rollout

## Changes

- Generate is locked immediately on submission and while any study job for the
  user is queued/running, including after navigation or in another tab. Completion
  or failure unlocks it. Unknown/unavailable job status fails closed.
- `202611270003_single_active_study.sql` enforces this on the server too, including
  legacy enqueue calls and concurrent requests with different courses/settings.
  Busy submissions reuse the existing job and do not charge additional quota.
  Existing queued jobs are preserved rather than deleted during upgrade.

- Web and app worker share study protocol **2** (`moduleIds`, one or two modules,
  maximum 15 items). Models and fallback order are unchanged.
- Database claims default to protocol 0 for legacy workers. These workers can
  still sync, but cannot claim study jobs. Updated workers explicitly pass 2.
- Updated workers publish readiness at startup, while idle, and with active-job
  heartbeats. New study requests return HTTP 503/`Retry-After` when no compatible
  worker has reported within 90 seconds. Active duplicate requests reuse their
  existing job even when workers or quota are unavailable.
- Dedicated study quota: 5 accepted jobs/minute, 40/day. Chat and metadata refresh
  do not consume this quota. Duplicate lookup, quota and enqueue are atomic.
  Validation failures before enqueue do not consume study quota.
- Starting a pack resumes its newest unfinished session. Concurrent starts and
  lost-response retries return the same session. Completing it allows a new one.
- Session owner checks, quiz grading, attempt upsert, score calculation, progress
  bounds and completion run in service-role-only database functions. Writes
  serialize on the session row. Completion requires persisted answers for all
  preceding questions; completed sessions cannot be edited.
- Session resume restores saved attempts. Pack questions use explicit item order.
  Legacy sessions with skipped questions resume at the first unanswered question
  without discarding later answers.
  Transient failures preserve the screen, selections, answer and retry controls.
  Source loading, missing metadata, missing indexed content and fetch failures
  have separate states and recovery actions.

## Required release order (not applied automatically)

1. Review and back up the app database. Check running study jobs before rollout:
   let legacy in-flight study jobs finish or stop the old app worker before
   publishing new requests. A claim change cannot interrupt already-running code.
2. Apply `supabase/migrations/202611270002_study_reliability.sql` **transactionally**
   to the app database, after the existing study/background-job migrations.
   Do not run a blanket historical migration repair or `db push`.
   Then apply `202611270003_single_active_study.sql` transactionally. If 002 is
   already installed, apply only 003; never rerun an installed migration.
3. Build/deploy the app worker from this same revision using `Dockerfile.worker`.
   Keep `CACHE_ENABLED=false`. No new secrets are required. Confirm a fresh
   `study_worker_heartbeats.last_seen_at` and a healthy process. Legacy workers
   may continue sync-only work during rollout.
4. Deploy web from the same revision. An unready worker must produce a recoverable
   503, not a false "queued" message or whole-course generation.
5. Run the authenticated checks below, then monitor queue age, readiness freshness,
   429/503 responses, failures and duplicate counts.

There is a deliberate fail-closed window between migration and compatible-worker
startup. Existing queued work remains durable. Do not restore legacy study claims
as a rollback shortcut; retain a protocol-2 worker or disable study submission.
Do not drop additive tables or reset user progress during rollback.

## Automated validation

```sh
npm test
npm run typecheck
npm run lint
npm run test:study-db
npm run build
```

`test:study-db` starts a disposable PostgreSQL 17 Docker container without mounting
project data, using project DB credentials, or reading database environment
variables. It applies schema/migrations, verifies ownership, grants, quota
separation, readiness, protocol fencing, grading and progress, then exercises real
concurrent connections for session starts, quota, dedupe and completion/score
races. The container is removed even on failure. CI runs it separately.

## Authenticated acceptance checks

1. Select a synced course and one/two indexed modules; generate a small pack.
   Verify questions/citations match only selected modules. Navigate away and back;
   open the completion notification and begin studying.
2. Repeat generation while pending: one active job, one quota charge. Chat usage
   must not exhaust study quota. A 429 displays a cooldown and retains inputs.
3. Start from two tabs or retry after a simulated lost response: same unfinished
   session. Pause, refresh and resume: same question, answers and score.
4. Disconnect networking during start, answer save and progress save: screen/input
   survives; explicit retry succeeds. Next/Finish and Pause cannot race a pending
   answer save. Revealing a flashcard alone does not mark it answered.
5. Complete the pack: accurate score; retrying completion is safe. Begin again:
   a new session. A second account cannot read or mutate the first account's data.
6. With no compatible worker, creation returns 503 with retry timing and no quota
   charge. No legacy worker may process the new request as whole-course scope.

No production migration, deployment, fresh model generation or authenticated
browser validation is implied by local automated test results.
