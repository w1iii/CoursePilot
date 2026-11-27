# Release verification register

Prepared 27 November 2026. Coordinator: `w1iii`.

Baseline inspected: web `e20603876b781f76ba6b068d66af2ec7d2471bdf`; RAG `e07920eb547a99d8ed3702b4302e163f325cec53`. Documentation and existing workflow work in the local web tree extend that baseline. Earlier audit executions used the revisions recorded in their evidence, not automatically these HEADs.

## Acceptance work

| ID | Environment / claim | Recorded position | Method and expected outcome | Owner / prerequisite |
|---|---|---|---|---|
| V01 | Production component identity | Dated frontend READY and RAG deployment-success records available | Record platform/environment, SHA/image, deployment ID and routing for web, RAG API and both workers; all must match compatible approved revisions | Platform owner; authorized dashboard/CLI access |
| V02 | Secret/configuration policy | Examples and required-variable contracts inspected | Attest required key presence, HTTPS routing, matching per-environment signing/queue keys and distinct environment secrets; print no values | Platform owner; secret-manager access |
| V03 | Fresh application/RAG setup | [Setup](SETUP.md) maps initialization and migration destinations | Apply reviewed sequence to disposable stores; record tables, indexes, RPC signatures, RLS/grants and test results | Database owner; isolated stores |
| V04 | Applied production schema | Source migrations and dated SQL-contract CI available | Compare approved migration effects and ledger in each store; document drift and resolution without blind replay | Database owner; read-only metadata access |
| V05 | Authenticated acceptance | Source/tests cover CRUD, chat, study and durable jobs | Authorized synthetic sign-in/onboarding, manual task CRUD, Canvas sync, cited answer, study pack/session/attempt, job notification; retain redacted evidence | Release owner; dedicated identities and Canvas test tenant |
| V06 | Two-user isolation / revocation | Owner/scope checks covered by automated tests | User A cannot read or mutate B's tasks, threads, packs, modules or RAG content; document queued-work revocation behavior separately | Application owner; isolated identities/content |
| V07 | Recovery coverage | Historical encrypted RAG staging restore documented | Restore current approved backups of both stores in isolation, validate counts/contracts, measure recovery interval and approved recovery point | Database owner; approved encrypted retention/key access |
| V08 | Compatible rollback | [Runbook](devops/DEPLOYMENT_ROLLBACK.md) available | Rehearse known-good web/API/workers against compatible schema/queues; record IDs, health, acceptance and actual timing | Release owner; preview environment |
| V09 | AI quality/cost | [Report](ai-evaluation/REPORT.md) contains software/fixture results | Execute frozen approved cases, retain failures and usage, obtain human scores and publish denominators/limits | Owner and human evaluator; provider-budget approval |
| V10 | Hosted workflow optimization | [Local comparison](devops/PIPELINE_OPTIMIZATION.md) recorded | Compare matched hosted revisions; report queue, execution span and summed job time separately, including added tooling job | DevOps owner; approved workflow publication |
| V11 | Release/publication/access | Changelogs and handoff files available locally; no tags returned in review | Approve paired commits/tags; check README/document links, private-backend access, Google sharing, recording and submission receipt | Release/submission owner |
| V12 | Production promotion controls | Historical audit recorded unprotected branches and empty review lists | Inspect current required checks, rulesets and platform promotion controls; prove failing checks block intended release path | Repository/platform owner; settings approval |

These checks await owner-controlled execution or confirmation. They are not included in the completed software-test totals.

## Evidence recording

For each execution retain:

- Claim ID, UTC start/end time, actor and approver.
- Environment and exact non-secret target; component revision/image/deployment IDs.
- Command or UI procedure, expected outcome, actual outcome and exit/status.
- Sanitized evidence path, data boundaries, cleanup and follow-up decision.

Mark a check **Confirmed** only for the observed scope. Use **Recorded** for historical evidence, **Pending confirmation** for work awaiting access/execution, and **Failed check** for an actual failed observation. A failed check remains visible until a new dated result establishes recovery.

Do not attach credentials, full session cookies, student course content or database archives to public documentation.

## Source-confirmed operating boundaries

Documentation changes do not alter these application behaviors:

- Account deletion does not coordinate RAG cleanup/cancellation and Clerk/app outcomes atomically.
- Buffered JSON chat drops web-source metadata preserved by streaming.
- Deadline-event insertion and task update are separate writes.
- Global CSP is report-only, study history can grow without response-level pagination, and deployed OCR depends on the Tesseract executable.

Track code remediation separately from evidence collection. Do not treat softer wording as a fix.
