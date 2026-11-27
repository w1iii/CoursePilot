# Web and application-worker setup

Scope: development installation of this repository and its application database. Use the separate [RAG setup guide](https://github.com/w1iii/CoursePilot-RAG/blob/main/docs/SETUP.md) for the vector store, API and ingestion worker.

The sequence below is derived from source. A complete fresh-install rehearsal remains an acceptance step in [V03](VERIFICATION_REGISTER.md). Do not use it as an automatic upgrade command for an existing database.

## 1. Prerequisites

- Node.js 22 or later; CI exercises Node 22 and 26.
- Git and npm; Docker for the disposable SQL-contract test.
- Dedicated development Supabase and Clerk projects.
- Approved Canvas test account/host and personal access token for onboarding.
- Separately configured RAG API/worker using Python 3.12–3.13 and pgvector.

Clone both repositories, then run from the web repository root:

```sh
npm ci
cp .env.example .env
```

Use existing `.env` files rather than overwriting them. Keep all credentials in ignored local files or approved secret stores.

## 2. Configure processes

| Setting | Where | Purpose |
|---|---|---|
| Clerk publishable/secret keys | Web | Dedicated development identity application |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Web and app worker | Server-side application access |
| `TOKEN_ENCRYPTION_KEY` | Web and app worker | Matching AES-256-GCM key for stored Canvas credentials |
| `RAG_API_URL`, `RAG_SIGNING_SECRET` | Web and app worker; matching signing secret on RAG | Scoped inter-service requests |
| `CANVAS_ALLOW_ENV_TOKEN=false` | Web and app worker | Use per-user Canvas connection rather than shared fallback |
| `CACHE_ENABLED=false` | Standalone app worker | Avoid dependence on Next.js request/cache context |
| `CRON_SECRET` | Web when cron is enabled | Scheduler authorization |

Generate the Canvas encryption key locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store generated output privately; never paste it into documentation. Use distinct environment secrets. `RAG_JOB_ENCRYPTION_KEY` belongs on the RAG API and ingestion worker, not in browser configuration.

`COURSEPILOT_WORKER` is set by the worker entry point; `NODE_ENV` is runtime configuration. `SYNTHETIC_SESSION_COOKIE` is a protected workflow secret documented in [testing](../TESTING.md), not an application setup key.

## 3. Application database initialization

Use an empty, dedicated Supabase development database. Supabase provides `anon`, `authenticated` and `service_role`; a bare PostgreSQL server requires deliberate role/grant provisioning and is not a drop-in Supabase replacement.

Review SQL before executing it through the development project's SQL editor or a private owner connection. Use this application-store sequence:

| Order | SQL file under `supabase/` | Purpose |
|---|---|---|
| 1 | `schema.sql` | Core users, credentials, courses, tasks, chat, telemetry, limiter and sync leases |
| 2 | `migrations/202611130001_onboarding_course_selection.sql` | Idempotent columns and historical onboarding/selection backfill |
| 3 | `migrations/202611140001_study_prep.sql` | Study tables and RPCs |
| 4 | `migrations/202611140002_secure_definer_search_path.sql` | Core RPC search paths and grants |
| 5 | `migrations/202611150001_sync_locks_rls.sql` | Sync-lease RLS |
| 6 | `migrations/202611200001_usernames.sql` | Username compatibility |
| 7 | `migrations/202611200002_account_deletion.sql` | Deletion tombstone and application-data RPC |
| 8 | `migrations/202611270001_background_jobs.sql` | Durable jobs and worker RPCs |
| 9 | `migrations/202611270002_study_reliability.sql` | Transactional study writes and worker readiness |
| 10 | `migrations/202611270003_single_active_study.sql` | Single-active study enforcement |
| 11 | `migrations/202611270004_study_answer_validation.sql` | Answer-validation contracts |

`202611130002_rag_vector_tables.sql` is a historical vector-store definition. **Exclude it from this separate-store application setup.** Do not execute it against the RAG store as a substitute for that repository's current ORM/migrations. Existing installations may already contain those tables; inspect placement and consumers before proposing any cleanup. No table removal is part of this guide.

The baseline and onboarding migration include data backfills. For an existing database, compare actual schema and migration history, back up first, and apply only reviewed unapplied changes. Replaying the baseline is not an upgrade strategy.

## Database setup and validation tools

```sh
npm run test:study-db
```

The existing validator creates a uniquely named localhost-only PostgreSQL container, provisions synthetic roles/data, applies selected SQL and tests study/job/concurrency contracts. It stops its own container on completion. It does not read project database URLs, apply every historical migration, initialize a Supabase project, or create a reusable product seed.

For an application demonstration, sign in with a synthetic Clerk identity, connect an approved Canvas test account and create manual tasks through the UI. Do not copy real student records into development. A one-command full application bootstrap/seed remains a separate setup-tool acceptance task.

## 4. Run web and workers

Start the RAG database/API/ingestion worker first using its repository guide. Then use separate terminals:

```sh
# Web repository
npm run dev
```

```sh
# Web repository; .env is the private development file
CACHE_ENABLED=false node --env-file=.env --import tsx scripts/job-worker.ts
```

The standalone worker needs explicit environment injection; it does not inherit Next.js file loading. Environment variables already supplied to Node take precedence over values loaded from `--env-file`.

Open `http://localhost:3000`, sign in, connect Canvas, select one or more owned courses and observe persisted job notifications. Confirm application-worker readiness before generating study packs.

## 5. Validate and troubleshoot

```sh
npm run lint
npm run typecheck
npm test -- --coverage
node --test scripts/staging-auth-smoke.test.mjs
npm run build
```

- Queued jobs: check the standalone app worker, schema/RPC compatibility and readiness.
- Indexing jobs: check the RAG worker, queue encryption key alignment and direct/session-pooled database connection.
- Authentication failure: check development Clerk keys and the intended host/session.
- RAG scope rejection: confirm course ownership and matching signing configuration; do not weaken token checks.
- Database failures: record the exact SQL/RPC error without disclosing credentials, then compare the sequence above.

Record actual outcomes in the verification register. These commands are reproduction instructions, not a statement that they were rerun for this documentation update.

## 6. Cleanup

Stop only processes and disposable containers created for the exercise. Remove synthetic data through normal application controls or retire the dedicated development project under owner approval. Application account deletion does not yet coordinate RAG cleanup; verify both stores separately. Never reset a shared or live database to make a setup rehearsal pass.
