# Testing Guide

<!-- markdownlint-disable MD013 -->

This guide explains what CoursePilot tests verify, how developers run them, and how results move through CI and deployment. Tests reduce regression risk; they do not prove every production behavior is correct.

## Test layers

| Layer | What it checks | Why it matters | Command / location |
| --- | --- | --- | --- |
| Unit | Small functions: validation, date logic, API helpers, RAG token handling | Finds logic defects quickly, without network or database | `npm test`; `src/lib/**/*.test.ts` |
| API route | Request validation, authentication, authorization, status codes, dependency failures, safe responses | Ensures routes fail predictably and do not leak private details | `src/app/api/**/*.test.ts` |
| UI/component | User-visible states and actions, such as task modal, Canvas connection errors, and retry | Catches regressions in user feedback and recovery | `src/**/*.test.tsx` |
| RAG backend | Parsing, ingestion, retrieval, study prep, auth tokens, and service API behavior | Protects the Python service that provides cited course answers | `uv run --locked pytest -q` in `rag/canvas-ai-assistant/` |
| Build/static checks | Types, lint, framework build, dependency audit, and secret scan | Finds defects before runtime and blocks accidental credential commits | CI workflow |
| Staging smoke | Real authenticated request against staging | Checks deployment wiring and a live authenticated read path | Manual GitHub Actions workflow; setup required |

Unit and route tests generally mock external services. A passing test therefore proves behavior under the tested conditions—not that Clerk, Supabase, Canvas, or RAG is currently reachable.

## Run locally

Web app, from `coursepilot/`:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Run API and UI coverage report:

```bash
npm run test:coverage:all
```

The report is informational and includes selected `src/lib`, API route, and dashboard files. It has no minimum threshold. Coverage shows which code ran; it does not measure assertion quality or prove edge-case correctness. The standard CI command `npm test -- --coverage` uses the Vitest default config, which currently measures libraries only.

RAG service, from `rag/canvas-ai-assistant/`:

```bash
uv sync --locked --group dev
uv run --locked pytest -q
```

Tests requiring external services or unavailable credentials may be skipped. Review skip reasons; skipped tests are not passing evidence.

## Example: API failure from code to developer

1. User submits a task update in browser.
2. Next.js route authenticates user, validates input, and calls Supabase.
3. Supabase operation fails. Route logs controlled metadata, not database message or student data:

   ```text
   server request failed {
     operation: 'tasks.update',
     requestId: 'c76b27df-2a83-48a2-a820-17cb741d45bc',
     category: 'Error'
   }
   ```

4. API returns a safe message and matching `X-Request-ID`:

   ```http
   HTTP/1.1 500 Internal Server Error
   X-Request-ID: c76b27df-2a83-48a2-a820-17cb741d45bc
   Content-Type: application/json
   ```

   ```json
   { "error": "Failed to update task" }
   ```

5. UI shows actionable error/retry state; it does not display raw database details.
6. Developer uses operation and request ID to locate server log and inspect the failing route/dependency in the relevant deployment logs.
7. Route test reproduces failure with a mocked Supabase error and verifies status, safe body, request ID, and absence of sensitive error text.

Never log cookies, authorization headers, Canvas tokens, prompts, answers, student records, or arbitrary upstream error objects. Current diagnostic category can be generic; add safe status/error codes when needed to improve diagnosis without exposing payloads.

## DevOps data flow

```text
Developer change
  → local unit/API/UI tests + lint + typecheck
  → push branch / open pull request
  → GitHub Actions CI on Node 22 and 26
       npm ci → npm audit → lint → typecheck → tests + library coverage
       → smoke-script unit tests → production build
       → separate secret scan
  → review green checks and preview deployments
  → merge to main
  → deploy through configured hosting workflow
  → observe deployment/health logs
  → optional manual authenticated staging smoke
  → release decision based on checks plus operational verification
```

CI configuration: `.github/workflows/ci.yml`. The staging workflow is `.github/workflows/staging-auth-smoke.yml`; it only performs a read-only course-list API check with an existing synthetic-user session. It does not sign in, test every route, or test Canvas/RAG end-to-end.

## Staging safety

Before running the authenticated smoke workflow:

1. Verify hard-coded staging hostname in `scripts/staging-auth-smoke.mjs`.
2. Provision a dedicated synthetic account containing no real student data.
3. Configure protected GitHub environment `synthetic-staging` and secret `SYNTHETIC_SESSION_COOKIE` directly in GitHub.
4. Run the workflow manually and inspect its result. Rotate/expire the session afterward according to policy.

Never use production credentials, disable deployment protection, or paste session cookies into logs or chat. A successful single-endpoint smoke check is not full end-to-end or tenant-isolation proof.

## Reading failures

- **Unit/API test failure:** reproduce locally; inspect assertion and mocked dependency result.
- **Lint/typecheck failure:** fix source before merge; do not suppress without an explicit reason.
- **Build failure:** check compile-time and framework integration errors.
- **Secret scan failure:** treat as credential exposure; rotate exposed credential, remove it safely, and verify history/policy.
- **Staging smoke failure:** inspect HTTP status and deployment logs using request timing; do not print cookie or response body containing user data.
- **Skipped test:** identify prerequisite and arrange a safe environment; do not count skip as pass.

## Current limitations

- Unit tests use mocks; staging/integration coverage remains necessary for real dependency wiring.
- `test:coverage:all` is informational; overall percentage can hide untested critical routes.
- Route and frontend coverage are incomplete. Add tests for each route's success, authentication, validation, ownership boundaries, and dependency failure, plus user-visible loading/error/retry behavior.
- Live staging verification requires the protected synthetic account setup above.
- RAG suite may skip tests that require unavailable infrastructure or credentials.

Before release, run all applicable checks on the exact commit being released, review skipped tests and coverage gaps, verify staging safely, and record deployment/monitoring results.
