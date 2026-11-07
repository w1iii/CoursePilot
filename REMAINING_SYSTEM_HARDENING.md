# Remaining System Hardening Tasks

This runbook tracks remaining operational work and code-level work not yet applied.
Statuses below are a starting point; verify against deployed code and configuration
before acting. Perform operational verification in staging with test accounts and
non-sensitive data before production.

## Priority 1: RAG Tenant Isolation - Data Migration

### Status: ⚠️ Pending
The `course_key` column has been added to the database schema and the code now
filters by `course_key` instead of `canvas_course_id`. However, existing data in
the RAG database still uses `course_id` for keying.

### Actions Required:
1. **Prepare and validate mapping before migration.** Obtain authoritative
   document ID → `course_key` mapping from the application/database owner. Canvas
   course IDs alone are not tenant-unique. Do not
   assume `'course-' || course_id::text` is correct. Check for missing IDs,
   duplicate mappings, and conflicting existing keys; stop if any are found.
   Legacy document IDs may have been derived from Canvas course IDs alone: two
   tenants with same Canvas ID can overwrite each other. If provenance of any
   existing row cannot be proven, do **not** assign it a tenant key; plan a
   separately approved purge of ambiguous rows and re-index from trusted source.
2. **Back up the RAG database** and confirm restore procedure before changing data.
   Run the migration first in staging, inspect its proposed updates and row counts,
   and confirm every document and chunk maps to the expected tenant. Abort on any
   mismatch; retain backup until post-migration checks pass.
3. **Run dry-run, then migrate** from environment with database access and an
   approved CSV (`document_id,course_key` header, one row per document).
   Confirm `PGHOST`, `PGUSER`, `PGDATABASE` target correct database:
    ```bash
    PGHOST=<host> PGUSER=<user> PGDATABASE=<database> \
      bash migrate_course_key.sh --dry-run mapping.csv
    # After reviewing output and confirming tested backup restore:
    PGHOST=<host> PGUSER=<user> PGDATABASE=<database> \
      bash migrate_course_key.sh --apply mapping.csv --backup-confirmed
    ```
   Supply PostgreSQL credentials via approved secret management. Script and mapping
   must exist in execution environment. Do not run against production
   until staging validation, backup, and explicit mapping approval are complete.
4. **Re-index Canvas courses** from RAG repository, after confirming script
   arguments and target course mapping:
    ```bash
    uv run python scripts/ingest_documents.py --help
    uv run python scripts/ingest_documents.py \
      --course-key '<approved-internal-course-uuid>' \
      --course-id <canvas-course-id> \
      --path /path/to/course/materials
    ```

5. **Verify migration and isolation in staging:** compare pre/post row counts;
   confirm no null/unmapped keys or unexpected duplicate assignments; verify
   documents and chunks agree on key; avoid re-indexing into old ID namespaces.
   With separate test users/courses, confirm
   each user can retrieve own material and cannot retrieve another tenant's material
   through `/api/ask`. Check logs for errors. Do not use real user data for probes.
   Do not expose RAG search or ingestion to production traffic until legacy rows
   have been migrated or removed, and this isolation check passes.

### Files Modified:
- `app/vectorstore/schema.py` - Added `course_key` column
- `app/vectorstore/retriever.py` - Updated to filter by `course_key`
- `src/lib/ai/rag.ts` - Now sends `course_key: course.id`
- `src/lib/ai/ingest.ts` - Uses `course_key` for ingestion requests

## Priority 2: RAG Authentication - Token System Confirmation

### Status: ✅ Local code/tests pass, ⚠️ Operational confirmation needed

### Actions Required:
1. **Confirm token auth works**:
   - Configure same strong `RAG_SIGNING_SECRET` in both deployed services through
     secret management; ensure staging and production use distinct secrets.
   - `/api/ask` without valid signed `X-RAG-Token` → should return 401 "Invalid RAG token"
   - `/api/ask` with valid signed token → should return answer with citations
   - `/api/v1/ingestion/canvas-module` with invalid token → should return 401
   - `/api/v1/ingestion/canvas-course` with valid signed token + `scope=ingest` → should work

2. After successful staging and production rollout, retire legacy shared tokens
   through deployment secret management. Do not put production secrets in tracked
   `.env` files. Confirm no clients depend on `RAG_API_TOKEN` before removing it.

### Files Modified:
- `app/security/tokens.py` - HMAC token issue/verify
- `app/api/chat.py` - `require_rag_token` dependency
- `app/api/ingestion.py` - `require_ingest_token` dependency
- `RAG_SIGNING_SECRET` must be supplied via deployment secret management; never
  record secret values or fragments in this runbook. Rotate any exposed values.
- Local RAG suite: 201 passed, 4 skipped (staging database/API checks still pending)

## Priority 3: SSRF Hardening (Canvas Service)

### Status: ✅ Local code/tests pass; ⚠️ staging/deployment verification pending

Current code validates public DNS answers and pins outbound socket IPs in both
services. API redirects do not carry credentials across hosts; Canvas downloads
can redirect to public hosts without sending Canvas credentials. Verify these
properties against real staging Canvas instances before deployment.

### Actions Required:
1. **Verify `canvas_service.py` hardening**:
   - Resolve and validate DNS results; block loopback, private, link-local,
     multicast, reserved, and otherwise disallowed IP ranges for IPv4 and IPv6.
     Prevent DNS rebinding by ensuring actual connections use validated addresses
     or by equivalent safe resolution enforcement; revalidate each redirect target.
   - Client with `follow_redirects=False` and manual redirect handling (max 3 hops)
   - Netloc validation on every request
   - `_is_allowed_redirect()` method to prevent credential leakage via redirects

2. **Verify `canvas.ts` / `canvas-network.ts` hardening**:
   - `hardenedCanvasBaseUrl()` resolves and blocks disallowed IPs
   - `canvasRequest()` pins validated DNS result; disables redirects and
     enforces 15-second request timeout
   - Connect endpoint validates host before saving accounts

3. **Test the hardening** in staging, including DNS rebinding, private/loopback
   targets, redirect-to-private targets, redirect credential leakage, timeout,
   and redirect-hop limits:
   - Run the canvas service test suite: `uv run pytest -q tests/test_canvas_service.py`
   - Verify local suites pass; test live Canvas tenant in staging.
   - Keep production outbound egress restricted to approved destinations; DNS and
     URL checks complement rather than replace network policy.

### Files That Need Updating:
- `app/services/canvas_service.py`, `app/services/canvas_network.py` (RAG repo)
- `src/lib/canvas.ts`, `src/lib/canvas-network.ts` (web repo)
- `src/app/api/canvas/connect/route.ts` (web repo)

## Priority 4: CANVAS_ALLOW_ENV_TOKEN Production Guard

### Status: ⚠️ Deployment configuration must be verified

### Current State:
- Local development may set `CANVAS_ALLOW_ENV_TOKEN=true`; verify actual deployment
  configuration independently.
- `src/lib/canvas-account.ts` rejects shared-token fallback on access in production

### Actions Required:
1. **For production deployments**: Set `CANVAS_ALLOW_ENV_TOKEN=false` through the
   deployment platform's secret/configuration manager (not a tracked `.env` file).
2. **For development**: Leave as `true` (needed for local development without
   personal Canvas tokens)
3. Confirm guard behavior: when `NODE_ENV === "production"` and
   `CANVAS_ALLOW_ENV_TOKEN === "true"`, shared-token fallback throws on access.

### Guard implemented locally; production configuration and staging check pending

## Priority 5: Rate Limits + Ingestion Quotas

### Status: ✅ Code and Env Vars Applied, ⚠️ Verification Needed

### Completed:
- ✅ Local `.env` has `RATE_LIMIT_PER_MINUTE=10` and `RATE_LIMIT_PER_DAY=200`;
  production deployment configuration needs separate verification.
- ✅ Shared per-user rate limit (`RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_DAY`)
  applied at `/api/sync`, `/api/canvas/connect`, and `/api/tasks` GET.
  Endpoint-specific limits are **not** implemented; do not assume old per-route figures.
- ✅ `429` responses include `Cache-Control: no-store` and `Retry-After` header
- ✅ Rate limiter infrastructure failures deny with `503` (not a misleading `429`).
- ✅ `error-safety.ts` created with `safeErrorMessage()` helper
- ✅ `/api/ask` route sanitized with `safeErrorMessage()`

### Actions Required:
1. **Verify in staging** using dedicated test accounts and controlled request
   counts; avoid load testing production. Exceed configured limits and confirm
   HTTP 429, valid `Retry-After`, and `Cache-Control: no-store`. Confirm normal
   requests recover after window expiry and limits apply per intended identity.

2. **(Optional) Remove old shared rate limit configs**:
   - If you had custom rate limit configurations, ensure they're updated

### Files Modified:
- `src/lib/rate-limit.ts` - Fail-closed on infra errors, enhanced `rateLimitMessage()`
- `src/app/api/sync/route.ts` - Rate limiting added
- `src/app/api/canvas/connect/route.ts` - Rate limiting added
- `src/app/api/tasks/route.ts` - Rate limiting added
- `src/lib/error-safety.ts` - New file with `safeErrorMessage()`
- Deployment configuration - verify `RATE_LIMIT_PER_MINUTE=10` and
  `RATE_LIMIT_PER_DAY=200` outside tracked files.

## 📋 Hardening Checklist

| Priority | Task | Status |
|----------|------|--------|
| 1 | Approve authoritative mapping; validate and back up database | ⬜ Not Started |
| 1 | Run migration in staging; verify counts, nulls, and key consistency | ⬜ Not Started (script prepared) |
| 1 | Re-index Canvas courses via ingestion script | ⬜ Not Started |
| 1 | Verify cross-tenant isolation in `/api/ask` | ⬜ Not Started |
| 2 | Confirm `/api/ask` requires signed `X-RAG-Token` | ⬜ In Progress (local tests pass) |
| 2 | Confirm `/api/v1/ingestion/*` requires signed token | ⬜ Not Started |
| 2 | Retire legacy token via deployment secret management after rollout | ⬜ Not Started |
| 3 | Validate RAG Canvas SSRF hardening in staging | ⬜ Not Started (local tests pass) |
| 3 | Validate web Canvas SSRF hardening in staging | ⬜ Not Started (local tests pass) |
| 4 | Set `CANVAS_ALLOW_ENV_TOKEN=false` in production deployment config | ⬜ In Progress |
| 5 | Verify rate limiting active (429 responses) | ⬜ In Progress |
| 5 | Verify `RATE_LIMIT_PER_MINUTE` and `RATE_LIMIT_PER_DAY` in deployment config | ⬜ Not Started |
| 5 | Restart container after env changes | ⬜ Not Started |

## 🎯 Next Steps

1. **Priority 1**: Approve mapping, back up, migrate and validate in staging, then re-index
2. **Priority 2**: Confirm token auth works for both `/api/ask` and ingestion endpoints
3. **Priority 3**: Verify SSRF hardening against real staging Canvas instances
4. **Priority 4**: Set `CANVAS_ALLOW_ENV_TOKEN=false` for production deployments
5. **Priority 5**: Verify rate limiting is active and restart your container

## 📞 Need Help?

- For SSRF hardening: Review `app/services/canvas_network.py` and `src/lib/canvas-network.ts`; verify DNS rebinding and redirect protections
- For token system: The code is verified; just confirm the API endpoints behave as expected
- For data migration: confirm authoritative mapping and script behavior before execution; back up and validate in staging first

---
*Last updated: 2026-11-07.*
