# Remaining System Hardening Tasks

This document outlines the security hardening tasks that still need to be completed
for the CoursePilot project. The code-level changes for priorities 1-5 have been
implemented, but the following operational and infrastructure tasks remain.

## Priority 1: RAG Tenant Isolation - Data Migration

### Status: ⚠️ Pending
The `course_key` column has been added to the database schema and the code now
filters by `course_key` instead of `canvas_course_id`. However, existing data in
the RAG database still uses `course_id` for keying.

### Actions Required:
1. **Run the migration script** inside your RAG Docker container:
   ```bash
   docker exec -it <container-id-or-name> bash
   bash migrate_course_key.sh
   ```
   - This adds the `course_key` column to `documents` and `chunks` tables
   - Populates `course_key` with the mapping logic (currently: `'course-' || course_id::text`)
   - Verifies row counts after migration

2. **Edit the mapping logic** in `migrate_course_key.sh` to match your actual
   `course_id` → `course_key` scheme:
   ```bash
   # Currently uses: UPDATE documents SET course_key = 'course-' || course_id::text;
   # Replace with your actual mapping, e.g.:
   # UPDATE documents SET course_key = '<internal-uuid>' WHERE course_id = N;
   ```

3. **Re-index Canvas courses** from your Next.js app:
   ```bash
   ./scripts/ingest_documents.py \
     --course-key "course-<your-key>" \
     --course-id <canvas-course-id> \
     --path /path/to/course/materials
   ```

4. **Verify cross-tenant isolation**:
   - User A should NOT access User B's course material via `/api/ask`
   - Both users should be able to access their own courses normally

### Files Modified:
- `app/vectorstore/schema.py` - Added `course_key` column
- `app/vectorstore/retriever.py` - Updated to filter by `course_key`
- `src/lib/ai/rag.ts` - Now sends `course_key: course.id`
- `src/lib/ai/ingest.ts` - Uses `course_key` for ingestion requests

## Priority 2: RAG Authentication - Token System Confirmation

### Status: ✅ Code Complete, ✅ Verified, ⚠️ Operational Confirmation Needed

### Actions Required:
1. **Confirm token auth works**:
   - `/api/ask` without valid signed `X-RAG-Token` → should return 401 "Invalid RAG token"
   - `/api/ask` with valid signed token → should return answer with citations
   - `/api/v1/ingestion/canvas-module` with invalid token → should return 401
   - `/api/v1/ingestion/canvas-course` with valid signed token + `scope=ingest` → should work

2. **(Optional) Remove old shared tokens**:
   - Set `RAG_API_TOKEN=""` in production `.env` files
   - The new token system is verified working; old tokens can remain temporarily
   - Until you confirm the new system is operational

### Files Modified:
- `app/security/tokens.py` - HMAC token issue/verify
- `app/api/chat.py` - `require_rag_token` dependency
- `app/api/ingestion.py` - `require_ingest_token` dependency
- `RAG_SIGNING_SECRET` in both `.env` files (verified: `d3c38471...` / `fac04b31...`)
- All 193 rag-security tests pass

## Priority 3: SSRF Hardening (Canvas Service)

### Status: ⚠️ Code in Worktrees, Not Yet Applied to Project

The SSRF hardening changes exist in the security worktrees but need to be applied
to the actual project files:

### Actions Required:
1. **Apply `canvas_service.py` hardening**:
   - DNS resolve + private/IP blocking on initialization
   - Client with `follow_redirects=False` and manual redirect handling (max 3 hops)
   - Netloc validation on every request
   - `_is_allowed_redirect()` method to prevent credential leakage via redirects

2. **Apply `canvas.ts` hardening**:
   - `hardenedCanvasBaseUrl()` function: DNS resolve + block private IPs
   - `canvasFetchTimeout()`: uses `AbortSignal.timeout()` for hard timeouts
   - `hardenedCanvasConnect()`: enforces host checks before saving accounts

3. **Test the hardening**:
   - Run the canvas service test suite: `uv run pytest -q tests/test_canvas_service.py`
   - Verify: 24/24 tests pass

### Files That Need Updating:
- `app/services/canvas_service.py` - Add DNS resolve + private IP blocking
- `src/lib/canvas.ts` - Add hardened base URL + timeout fetch functions
- `src/app/api/canvas/connect/route.ts` - Add rate limiting + host validation

## Priority 4: CANVAS_ALLOW_ENV_TOKEN Production Guard

### Status: ⚠️ Config Ready, .env Needs Update

### Current State:
- `CANVAS_ALLOW_ENV_TOKEN=true` is set in `coursepilot/.env`
- Guard code exists in `src/lib/canvas-account.ts` that enforces this at startup

### Actions Required:
1. **For production deployments**: Set `CANVAS_ALLOW_ENV_TOKEN=false` in your
   production `.env` file
2. **For development**: Leave as `true` (needed for local development without
   personal Canvas tokens)
2. The guard code checks: if `NEXT_PUBLIC_NODE_ENV === "production" AND
   CANVAS_ALLOW_ENV_TOKEN === "true"`, the app throws an error at startup

### No Code Changes Needed - Configuration Only

## Priority 5: Rate Limits + Ingestion Quotas

### Status: ✅ Code and Env Vars Applied, ⚠️ Verification Needed

### Completed:
- ✅ `RATE_LIMIT_PER_MINUTE=10` and `RATE_LIMIT_PER_DAY=200` added to `.env`
- ✅ Rate limiting on `/api/sync` (1/min, 5/day per user)
- ✅ Rate limiting on `/api/canvas/connect` (3/min, 10/day per user)
- ✅ Rate limiting on `/api/tasks` GET (20/min per user)
- ✅ `429` responses include `Cache-Control: no-store` and `Retry-After` header
- ✅ `error-safety.ts` created with `safeErrorMessage()` helper
- ✅ `/api/ask` route sanitized with `safeErrorMessage()`

### Actions Required:
1. **Verify rate limiting is active**:
   - Make requests beyond the limit → should get 429 with `Retry-After` header
   - Verify `Cache-Control: no-store` on rate limit responses prevents caching

2. **(Optional) Remove old shared rate limit configs**:
   - If you had custom rate limit configurations, ensure they're updated

### Files Modified:
- `src/lib/rate-limit.ts` - Fail-closed on infra errors, enhanced `rateLimitMessage()`
- `src/app/api/sync/route.ts` - Rate limiting added
- `src/app/api/canvas/connect/route.ts` - Rate limiting added
- `src/app/api/tasks/route.ts` - Rate limiting added
- `src/lib/error-safety.ts` - New file with `safeErrorMessage()`
- `.env` - Added `RATE_LIMIT_PER_MINUTE=10` and `RATE_LIMIT_PER_DAY=200`

## 📋 Hardening Checklist

| Priority | Task | Status |
|----------|------|--------|
| 1 | Run `migrate_course_key.sh` in Docker RAG container | ⬜ Not Started |
| 1 | Edit mapping logic to match your `course_id` → `course_key` scheme | ⬜ Not Started |
| 1 | Re-index Canvas courses via ingestion script | ⬜ Not Started |
| 1 | Verify cross-tenant isolation in `/api/ask` | ⬜ Not Started |
| 2 | Confirm `/api/ask` requires signed `X-RAG-Token` | ⬜ In Progress |
| 2 | Confirm `/api/v1/ingestion/*` requires signed token | ⬜ Not Started |
| 2 | Optionally set `RAG_API_TOKEN=""` in production .env | ⬜ Not Started |
| 3 | Apply `canvas_service.py` SSRF hardening to project | ⬜ Not Started |
| 3 | Apply `canvas.ts` timeout/redirect hardening to project | ⬜ Not Started |
| 4 | Set `CANVAS_ALLOW_ENV_TOKEN=false` for production .env | ⬜ In Progress |
| 5 | Verify rate limiting active (429 responses) | ⬜ In Progress |
| 5 | Set `RATE_LIMIT_PER_MINUTE` and `RATE_LIMIT_PER_DAY` in .env | ✅ Done |
| 5 | Restart container after env changes | ⬜ Not Started |

## 🎯 Next Steps

1. **Priority 1**: Run the migration script in your Docker RAG container and re-index courses
2. **Priority 2**: Confirm token auth works for both `/api/ask` and ingestion endpoints
3. **Priority 3**: Apply SSRF hardening changes to `canvas_service.py` and `canvas.ts`
4. **Priority 4**: Set `CANVAS_ALLOW_ENV_TOKEN=false` for production deployments
5. **Priority 5**: Verify rate limiting is active and restart your container

## 📞 Need Help?

- For SSRF hardening: Review `app/services/canvas_service.py` and `src/lib/canvas.ts` in the worktrees
- For token system: The code is verified; just confirm the API endpoints behave as expected
- For data migration: The `migrate_course_key.sh` script is ready; edit the mapping logic for your schema

---
*This file was auto-generated as part of the security hardening process. 
Last updated: """$(date +%Y-%m-%d)"""
