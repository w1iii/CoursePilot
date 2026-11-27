# Background jobs production release — 2026-11-27

Production deployment explicitly approved in session. Queue-only RAG release
built from repository HEAD plus an explicit queue-file allowlist. Pre-existing
uncommitted chat/LLM performance edits remain local and were not deployed.

## Targets and deployments

| Component | Target / deployment |
| --- | --- |
| Web | `course-pilot`, https://course-pilot-pi.vercel.app |
| Final web deployment | https://course-pilot-x9qd9vzhq-w1iiis-projects.vercel.app |
| App database | Supabase `xdemtrebbkazamnahxwu` |
| Railway project | `incredible-generosity` / `711f9bf0-9075-44d7-ae18-d12124005c8a`, production |
| RAG API | `fc466ad1-98d6-4df1-8d9d-30931051abc8` |
| App worker | `eca1ee04-fce7-444e-976b-f61e21f6b615` |
| RAG ingestion worker | `878ea2b9-9a27-4313-ad8c-e9f26c46b0b7` |

Applied app migration `202611270001_background_jobs.sql` in an explicit
transaction. Applied RAG migration `0005_ingestion_jobs.sql` transactionally.
No historical migration repair or blanket `supabase db push` was run.

Configured matching RAG queue encryption keys on API/worker, aligned production
web RAG URL/signing secret, and configured app worker with verified production
Supabase credentials and Canvas token encryption key. No secret values are
included here.

Workers run continuously, one replica each, without HTTP health checks, with
automatic failure restarts. RAG worker uses installed Python directly, avoiding
non-root `uv` cache permissions. App worker disables Next.js cache: standalone
workers cannot use the Next.js request/cache context.

## Verified

- Web: 201 tests pass; build/typecheck/lint pass.
- Isolated queue-only RAG snapshot: 271 tests pass, 4 database tests skipped.
- Disposable PostgreSQL app queue integration passed before production changes.
- Disposable PostgreSQL RAG worker execution passed before production changes.
- Production RAG health: HTTP 200, database ready.
- Production web root: HTTP 200.
- Unauthenticated web job reads and sync submission: HTTP 401.
- RAG job status: matching owner HTTP 200; different owner HTTP 404;
  missing token HTTP 401.
- Service-role queue RPC execution allowed; anon/authenticated execution denied.
- Synthetic app worker recovery: existing pack reused, exactly one saved pack,
  successful terminal job and persistent unread notification.
- Synthetic app worker permanent failure: one attempt, safe failure message,
  persistent unread notification.
- Synthetic RAG worker failure: one attempt, terminal failure, encrypted queued
  credentials cleared.
- Initial smoke test found a standalone Next.js cache error. Fixed worker
  configuration/source and reran successful recovery/failure checks.
- Synthetic app user/course/pack/jobs and RAG job were removed after validation.
- All three deployed Railway application services reported SUCCESS/RUNNING.

## Backups and rollback

Before migrations, captured private custom-format `public` schema/data archives
for both production databases. `pg_restore --list` validated both archives.
No restore was performed; this does not establish tested full recovery or
managed backup retention.

Private local release directory:
`/private/var/folders/yv/2m1nxzpj3qx2ypb651s6qwf40000gn/T/opencode/coursepilot-release-d3uz0gd8`.
Archives are `app-public-before.dump` and `rag-public-before.dump`, owner-readable
only. Temporary exported configuration files were removed after deployment.
This temporary location is not durable backup storage; move backups to approved
encrypted retention storage under normal operations policy.

Previous web deployment:
https://course-pilot-cc2fz6aeu-w1iiis-projects.vercel.app.
Previous RAG API deployment: `34597ff5-49a6-43e3-957b-c37272f990db`.
If rollback is required, coordinate web/API/worker versions. Retain additive
queue schema and queued data; do not drop tables as a rollback shortcut.

## Still requires authenticated user validation

Real Canvas indexing lasting beyond five minutes, browser navigation/refresh,
worker interruption mid-course, notification rendering/dismissal across tabs,
and fresh LLM study-pack generation were not exercised with a real account.
No students' Canvas content was ingested or LLM requests made for smoke tests.
Notifications remain in-app, not browser push/email.
