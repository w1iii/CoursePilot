# Final Technical Documentation — CoursePilot

> **Repository evidence copy:** original audit records describe the pre-documentation source snapshot. README/docs additions are authorized later changes, not a claim of currently clean Git status. New `main/docs` links require publication; private RAG links require access.

**Project / section:** CoursePilot | CSP221A — BSCS 4C  
**Member / role:** Lui Franz Lomugdang — **Solo Full-stack Developer and DevOps Engineer**  
**Evidence cutoff:** 27 November 2026 · **Submission deadline:** 27 November 2026, 23:59 Philippine time  
**Product:** [Production frontend](https://course-pilot-pi.vercel.app) · **Source:** [Web](https://github.com/w1iii/CoursePilot) / [RAG—private](https://github.com/w1iii/CoursePilot-RAG)  
**Audited commits:** [web `12a2855d`](https://github.com/w1iii/CoursePilot/commit/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0), [RAG `c5077012`](https://github.com/w1iii/CoursePilot-RAG/commit/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). Trees match observed merged `main`. **Final tag: Missing.**

## 1. Product status and architecture

**Users/problem:** Canvas-using students need consolidated coursework, deadlines, course-grounded answers and study practice.

**Implemented and test-backed:** Clerk sign-in; Canvas connection/course selection; synchronization; manual task CRUD; saved chat; course retrieval/generation; study packs, sessions and attempts; durable job notifications. **Live authenticated CRUD/AI acceptance: Not Verified in this audit.** Provider integration is real; audit inference used fixtures.

**Runtime:** Browser → Clerk/Next.js UI and API → Supabase application PostgreSQL; Next.js → scoped signed request → FastAPI → PostgreSQL/pgvector and Gemini/Groq → validated response → UI. Application and ingestion workers execute persisted jobs. [Architecture and six diagrams](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#4-architecture-and-trust-boundaries).

**Pitch changes:** Current providers are Gemini/Groq, rather than original OpenAI/GPT-5 proposal. Task priority is deterministic, not AI scoring. Queued study generation and streaming extend original scope.

## 2. Technology, dependencies, data and API

| Layer | Actual implementation |
|---|---|
| Frontend / UX | TypeScript 5.9.3, Next.js 15.5.29, React 19.3.0, Tailwind 4.3.3, Anime.js 4.5.0; Vercel |
| Backend / runtime | Next.js handlers; Node CI 22/26. FastAPI 0.162.0, SQLAlchemy 2.1.6, psycopg 3.3.6; Python CI/image 3.12, local verification 3.13.16; Railway deployment evidence |
| Data / auth | Supabase PostgreSQL, separate RAG PostgreSQL/pgvector; Clerk SDK 7.9.18; SQL migrations and scoped server queries |
| AI / data tools | Gemini embeddings/generation; Groq generation fallback; optional Gemini search. Canvas source material; no model training |
| Quality / operations | GitHub Actions, Vitest, pytest, ESLint, Ruff, npm/pip audits, Gitleaks, Trivy, CodeQL; health checks and request IDs |

Versions are lock-resolved, not inferred from package ranges. Complete dependencies: [web manifest/lock](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0), [RAG manifest/lock](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). **Current service tiers, prices, quotas, production engine/model settings: Requires Manual Confirmation.**

**Data:** users → courses → tasks/announcements; users → chat threads → messages; study packs → items/sessions → attempts. RAG documents → vector chunks; jobs persist independently. [Schema/migrations](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/supabase). Baseline SQL alone is not a complete fresh-install procedure.

**Key APIs:** authenticated `GET/POST /api/tasks`, owner-checked `PATCH/DELETE /api/tasks/[id]` (manual-only delete); validated `POST /api/ask`; `POST /api/study-packs` returns **202**, followed by job polling and transactional persistence. Course/module/count checks precede generation. [Full API reference](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#6-api-contracts-and-authorization). Deployed CRUD recording **Missing**.

<div class="page-break"></div>

## 3. AI design, processing and measured evidence

**Task:** explain/summarize course content and generate cited study exercises. Generative language handling exceeds deterministic priority rules; it can still produce incorrect output.

**Pipeline:** authorized Canvas content → parse/clean/chunk → Gemini embeddings → scoped vector retrieval → bounded prompt → Gemini/Groq → citation/structure checks → response or saved study pack → UI. Topic-free study requests use diverse deterministic sampling; topic-focused requests use semantic retrieval. [RAG implementation](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/rag).

Web study requests select **1–2 modules, 1–15 items**. Validation checks count, item types, options and citation IDs; focused requests also check supporting quotes. MCQ correctness is computed server-side; short answers/flashcards are self-assessed. No training/fine-tuning occurred.

**Model disclosure:** checked-in examples name `gemini-3.6-flash`, Gemini fallbacks and `gemini-embedding-001` (1,536 dimensions); production selection **Not Verified**. Course material is retrieval data, not a labeled evaluation dataset.

**Measured evaluation:** 20 buffered + 20 streaming **offline fixture** requests, 27 November: 100% protocol success; median first-text **165.225 → 21.575 ms (86.94% reduction)**; median completion **165.225 → 169.246 ms (2.43% slower)**. [Raw results](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.log). This is transport evidence, **not live model speed or accuracy**. Representative answer quality, citation faithfulness, learning benefit and cost evaluation are **Missing**.

**Risk handling:** bounded context/output/time budgets, scoped retrieval, provider fallback, malformed-output rejection, durable retries and user-visible errors. Chat may use labeled course-topic general knowledge/search when material is insufficient. `grounded` indicates retrieved chunks, not verified truth. Prompt injection and hallucination are not proven eliminated.

## 4. Security, reliability and actual test results

**Access/data:** Clerk authentication; explicit ownership checks; RAG HMAC tokens bound to user/course/action and expiry; RLS/grants in SQL. Server service-role access bypasses RLS, making backend checks essential. Canvas PATs use AES-256-GCM; queued RAG payloads use Fernet. Secrets belong in server platform/environment stores; current platform injection was not fully inspected. [Web environment template](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.env.example).

**Failure controls:** request validation, database-backed limits, 503 on limiter failure, SSRF-aware Canvas networking, lease heartbeats/retries, safe errors and request IDs. Account deletion removes application data then Clerk identity; **RAG cleanup/cancellation is absent**, so complete erasure is not claimed.

| Verification | Actual result |
|---|---|
| Local web | **370 Vitest tests passed**, 65 files; **3 smoke-unit tests passed**; lint/typecheck/build passed |
| Web coverage | **63.27% lines**, limited to `src/lib`; not whole-UI coverage |
| Local RAG | **386 passed, 9 DB tests skipped**, **84.35% coverage**; selected Ruff rules passed |
| Latest remote CI | Web 370 tests per Node version and DB-contract job passed; RAG **395 passed, 85.18% coverage** |
| Security checks | Local npm audit: zero advisories; latest CI Python audit/source-secret/image policy checks passed |
| Production acceptance | Frontend READY metadata verified; authenticated CRUD/AI smoke and current workers **Not Verified** |

[Web CI](https://github.com/w1iii/CoursePilot/actions/runs/45988132144) · [RAG CI](https://github.com/w1iii/CoursePilot-RAG/actions/runs/45988114364). Counts across repeated runs are not additive. Local Docker unavailable; CI provides separate database-test evidence. No production writes or paid inference performed.

<div class="page-break"></div>

## 5. Engineering process, CI/CD, release and recovery

**Flow:** feature branch/PR → repository checks → merge → platform build/deployment → health/smoke verification. Web CI tests Node 22/26; RAG CI uses Python 3.12 and pgvector. **Both main branches are unprotected; inspected PR review lists are empty.** Mandatory independent approval/CI-before-production gating is not established. [Web PR #13](https://github.com/w1iii/CoursePilot/pull/13) · [RAG PR #7](https://github.com/w1iii/CoursePilot-RAG/pull/7).

**Measured history:** web CI **43/45 successful (95.56%)**; RAG **18/25 (72.00%)**, returned runs through capture. First/latest observed elapsed times: web **72/71 s**; RAG **89/88 s**, with first RAG run failed. Changed workflow scope prevents a controlled speedup claim. These are CI outcomes, not uptime.

**Release:** Vercel READY deployment `dpl_5N4UySrv85mp3nYKEQm35CeKHyiW` associated with web main [`e3516894`](https://github.com/w1iii/CoursePilot/commit/e351689499fd063d22b0128047e7d5c8e3f7a130). GitHub RAG deployment reports production success for [`142bcb1d`](https://github.com/w1iii/CoursePilot-RAG/commit/142bcb1d65153dcb73ec174670ae443d0c3eb916); current API/worker attribution remains unverified. Failed availability check targets **staging** RAG, not proof of production outage.

**Recovery:** restore known-good compatible application deployments; handle data restoration separately. Historical encrypted RAG staging backup/isolated restore is documented, but automated backups/current Supabase recovery and full production rollback drill are **Missing/Not Verified**. [Backup coverage](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/docs/AUTOMATED_BACKUP_COVERAGE.md).

## 6. Contribution and external-work disclosure

**Ownership:** Lui Franz Lomugdang confirms solo full-stack and DevOps responsibility: UI/API, Canvas integration, database contracts, RAG orchestration, tests and deployment operations. [Retrospective milestone board](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#15-ownership-engineering-process-and-retrospective-sprint-board) is reconstructed from commits/PRs, **not original sprint-planning proof**.

**AI assistance:** this audit/documentation used OpenCode/GPT-6 Astra with source/test/evidence verification. Historical coding-assistant tools, tasks and extent **Require Manual Confirmation** before owner sign-off. Runtime Gemini/Groq use is separately disclosed above.

**Third-party work:** declared packages/APIs; institutional Canvas material; instructor template. Asset/font/icon/screenshot provenance, applicable licenses, institutional permission and service costs require owner confirmation.

## 7. Limitations, final status and reviewer evidence

**Known gaps:** account deletion omits RAG cleanup; JSON chat drops web-source metadata preserved by streaming; deadline-change logging is not atomic with task updates; global CSP is report-only; study archive responses grow without a response-level page limit. Current production workers, schema/grants, backups, two-user live isolation and model quality remain unverified.

**Next priorities:** coordinated deletion/recovery verification; deployment acceptance and representative AI evaluation. [Prioritized findings](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#16-prioritized-findings-and-recommended-fixes).

**Evidence index:** [Architecture/ERD/API/tests/defense reference](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md) · [source/platform/test evidence](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence) · [web CI configuration](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.github/workflows/ci.yml) · [RAG CI configuration](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/.github/workflows/ci.yml).

**Submission status:** local Markdown/PDF prepared. Accessible Google Doc, prominent README link, final tag, continuous unedited deployment-challenge recording and final submission receipt are **Missing**. Private RAG evidence needs panel access. Local relative evidence links require accompanying files or publication.

**Template note:** [instructor template](https://docs.google.com/document/d/1nstfqO42Pj1OpvX7_z6y1KifGaqb7rjJ/edit) text contains ten topics; this requested seven-section brief groups all ten (mapping in review §17). Exact template copy/layout compliance **Requires Manual Confirmation**. Original template was not modified.
