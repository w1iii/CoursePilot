# Background jobs

Onboarding, manual/scheduled sync, per-course resync, adding a course, and study
generation publish durable Postgres jobs. Requests return `202` and `jobId`;
closing a tab does not cancel work. Dashboard notifications persist until
explicit dismissal, including failures and partial failures.

## Deployment order

1. Apply `supabase/migrations/202611270001_background_jobs.sql` to the app
   database, after existing schema and study-prep migrations.
2. Apply RAG `migrations/0005_ingestion_jobs.sql` to the RAG database.
3. Generate a Fernet key:
   `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
   Set `RAG_JOB_ENCRYPTION_KEY` on both the RAG API and RAG worker. Keep it out of
   browser/public environment variables. RAG stores queued credentials encrypted
   and clears them on terminal completion; database backups retain encrypted
   historical values according to backup retention.
4. Deploy the RAG API and a separate, always-on Railway worker using the same
   code/environment. Container start command: `/app/.venv/bin/python -m app.ingestion.worker`.
   No HTTP health check on this worker. Enable automatic process restart.
5. Deploy a separate, always-on app worker from `coursepilot/`:
   build with `Dockerfile.worker` (or `npm ci` then `npm run worker`). Supply `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, `RAG_API_URL`,
   `RAG_SIGNING_SECRET`, and matching indexing/Canvas/AI configuration.
   Workers need no Clerk browser session. Enable automatic process restart.
6. Deploy the Next.js application. Do not enable new app code before migrations
   and workers are ready. Validate in staging before production.

Production environments supply variables directly. Local app worker:
`node --env-file=.env.local --import tsx scripts/job-worker.ts`.
Local RAG worker:
`uv run --env-file .env python -m app.ingestion.worker`.

## Queue behavior

- App workers claim with `FOR UPDATE SKIP LOCKED`, per-user serialization,
  deduplication, and lease tokens. Heartbeat: 20 seconds; lease: 90 seconds.
- Temporary thrown failures retry up to three attempts, 30 seconds apart.
  Interrupted final attempts become failed notifications during the next claim.
  Partial sync results become explicit partial-failure notices.
- App worker hard deadline: two hours per attempt. Restart supervisor recovers
  abandoned leases. Existing sync locks are renewed during long indexing.
- Worker RAG calls submit a deterministic per-app-job/course key, then use
  short status requests. Each poll has a fresh scoped token; status requests
  contain no Canvas credentials. An HTTP disconnect never starts a duplicate
  crawl. Polling budget: 100 minutes per course.
- RAG workers serialize each course using a dedicated PostgreSQL advisory-lock
  connection, with a lease and heartbeat. Do not use transaction-pooling database
  URLs for advisory locks: set `DIRECT_DATABASE_URL` to a direct/session-pooled
  connection. The worker uses it for locks, falling back to `DATABASE_URL`.
- RAG attempts have a 30-minute watchdog and at most three attempts. Successful
  **modules** are checkpointed. An interrupted module reruns; completed modules
  do not. Document writes retain their existing transactional behavior.
- Generated study packs and items commit atomically and are unique per job.
  If a worker dies after saving a pack, recovery reuses that pack.
- Job polling is authenticated and owner-scoped. Internal Canvas/provider errors
  are not returned as sync failure details. Service-role queue functions are
  unavailable to anonymous/authenticated database roles.
- Cache revalidation runs in Next.js when the dashboard observes completed work,
  not in standalone worker processes.
- Sync notification links open Settings for review/resync; failed study-prep
  notifications link back to the builder. No automatic navigation or blocking
  modal. Dismissals propagate across tabs/devices.

## Operations

Monitor queued age, running lease expiry, attempts, failure counts, and worker
restarts in `background_jobs` and `ingestion_jobs`. Alert if queued work grows
while no worker is active. A stopped worker leaves work queued, not silently
successful. Do not rotate the encryption key while encrypted jobs remain active.
Retain result/checkpoint rows while recovery is possible; terminal history can
be archived under an explicit retention policy.

Roll back application/worker versions together if needed; retain additive
database tables and migrations. Never drop queued work as a rollback shortcut.

## Validation

- `npm run typecheck`, `npm run lint`, `npm test`
- RAG: `uv run --locked pytest -q`
- SQL: run `supabase/tests/background_jobs.sql` against a disposable database
  after schema and migrations. It rolls back synthetic data.
- Staging: index a course taking longer than five minutes; navigate, refresh,
  and reopen the app; stop/restart both workers; verify resume, one final pack,
  partial/failure notifications, owner isolation, and dismissals across tabs.

Notifications are in-app. Browsing another website or closing CoursePilot
does not stop jobs, but no browser-push/email notification is sent. Results
appear when CoursePilot is visible again.
