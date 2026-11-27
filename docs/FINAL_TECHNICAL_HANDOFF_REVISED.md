# Final Technical Documentation

**Project / section:** CoursePilot | CSP221A — BSCS 4C  
**Members / roles:** Lui Franz Lomugdang — **Solo Full-stack Developer and DevOps Engineer**  
**Evidence:** [Web repo](https://github.com/w1iii/CoursePilot) · [RAG repo—private](https://github.com/w1iii/CoursePilot-RAG) · [Production](https://course-pilot-pi.vercel.app) · final tag **Missing** · audited [web SHA](https://github.com/w1iii/CoursePilot/commit/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0) / [RAG SHA](https://github.com/w1iii/CoursePilot-RAG/commit/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). **Evidence date:** 27 November 2026.

## 1 Product status & architecture

**Users/problem:** Canvas students need consolidated coursework, deadlines, course-grounded answers and study practice. **Working/test-backed:** authentication, Canvas synchronization, manual task CRUD, chat history, RAG answers, study packs/practice and durable notifications. **Live authenticated acceptance: Not Verified.** Current Gemini/Groq integration replaces proposed OpenAI/GPT-5; priority scoring is deterministic.

**Runtime:** browser → Clerk/Next.js API → Supabase; scoped request → FastAPI → pgvector/AI providers → validation → UI. Separate workers process persisted jobs. [Architecture](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#4-architecture-and-trust-boundaries).

## 2 Technology & dependency disclosure

| Layer | Technology, purpose and evidence |
|---|---|
| Frontend / UX | Next.js 15.5.29, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, Anime.js 4.5.0; Vercel UI |
| Backend / API | Node CI 22/26; Python CI/image 3.12; FastAPI 0.162.0, SQLAlchemy 2.1.6, psycopg 3.3.6; Railway evidence |
| Database / auth | Supabase PostgreSQL; separate logical RAG pgvector store; Clerk SDK 7.9.18 |
| AI / data tools | Gemini embeddings/generation, Groq fallback, optional Gemini search; Canvas retrieval data, no training |
| DevOps / quality | GitHub Actions, Vitest, pytest, lint, audits, Gitleaks, Trivy, CodeQL; health/request-ID telemetry |
| External / costs | Canvas/API services, packages/assets, instructor template. Tiers, costs, quotas, licensing/permissions: **Requires Manual Confirmation** |

Lock-resolved versions: [web manifest/lock](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0) / [backend manifest/lock](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). Example models: `gemini-3.6-flash`, `gemini-embedding-001` (1,536 dimensions); production model/settings **Not Verified**.

## 3 Data model, API & user workflow

**Data:** users → courses → tasks/announcements; threads → messages; study packs → items/sessions → attempts; documents → chunks. [ERD and owner-supplied schema context](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SCHEMA_CONTEXT.md). Context export is **not executable SQL or verified production metadata**; use [migrations](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/supabase) for implementation evidence.

**Routes/workflow:** authenticated `GET/POST /api/tasks`, owner-checked `PATCH/DELETE /api/tasks/[id]` (manual-only deletion); `POST /api/ask`; validated `POST /api/study-packs` → **202** → job polling → saved pack/practice. [API reference](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#6-api-contracts-and-authorization). **Deployed CRUD proof: Missing**; source/tests are not a production recording.

<div class="page-break"></div>

# Implementation & Verification

## 4 AI feature: design, output processing & evidence

**Actual task/pipeline:** authorized Canvas content → parse/clean/chunk → embeddings → scoped retrieval → bounded Gemini/Groq prompt → citation/JSON checks → answer or saved study pack → UI. [Implementation](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app). Generative explanation/question creation exceeds rules-only scoring; no fine-tuning occurred.

Study UI accepts **1–2 modules, 1–15 items**. Validate count/types/options/citation IDs; focused requests additionally validate supporting quotes. MCQ correctness is server-derived; other practice is self-assessed. Topic-free selection uses deterministic sampling, not semantic similarity.

**Evaluation:** offline transport fixture, **20 buffered + 20 streaming**, 100% protocol success; median first-text **165.225 → 21.575 ms (86.94% lower)**; completion **165.225 → 169.246 ms (2.43% slower)**. [Report and raw observations](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.md). **Not live model speed/accuracy.** Representative AI quality/citation/cost evaluation: **Missing**.

**Risk handling:** invalid-output rejection, scoped retrieval, bounded context/time/output, provider fallback/retries and safe errors. [Prompt-injection and hallucination controls, implementation/tests](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/AI_SECURITY_IMPLEMENTATION.md). Controls mitigate—not eliminate—risk; `grounded` means chunks retrieved, not factual correctness.

## 5 Security, data protection & reliability

**Secrets/access:** server environment keys, Clerk identity, explicit owner checks, expiring user/course/action HMAC tokens; Canvas AES-256-GCM and queued-payload Fernet encryption. [Environment template](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.env.example). Production injection/policies unverified; service-role bypasses RLS.

**Failures/data:** validation, SSRF-aware Canvas networking, rate limits/503 fail-closed, job leases/retries, request IDs/user-safe errors. App deletion then Clerk deletion is non-atomic and **omits RAG cleanup/cancellation**. Complete erasure/retention compliance not established. Global CSP is report-only.

## 6 Testing: report actual counts and results

| Evidence class | Actual result / limit |
|---|---|
| Automated checks | Local **370 Vitest + 3 smoke-unit passed**; lint/typecheck/build passed; library-only line coverage **63.27%**. Local RAG **386 passed, 9 skipped**, **84.35%**. |
| CI | [Web](https://github.com/w1iii/CoursePilot/actions/runs/45988132144): Node 22/26 plus DB contracts passed. [RAG](https://github.com/w1iii/CoursePilot-RAG/actions/runs/45988114364): **395 passed, 85.18%**. Repeated runs not additive. |
| AI evaluation | Synthetic transport only; labeled factuality/learning-benefit evaluation **Missing**. |
| Production checks | Frontend READY metadata; RAG success metadata. Live CRUD/AI/current workers **Not Verified**. |
| Known defects | RAG deletion gap, buffered web-source loss, non-atomic deadline events, unbounded archive listing. [Findings](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#16-prioritized-findings-and-recommended-fixes). |

Local npm audit zero advisories; CI Python/source-secret/image policy checks passed. Local Docker unavailable; remote CI supplies separate DB evidence. [Logs/counts](https://github.com/w1iii/CoursePilot/tree/main/docs/audit-evidence). No production writes or paid inference performed.

## 7 Engineering process & CI/CD

**Rules/flow:** PR/checks → merge → platform build/deploy → smoke verification; **main unprotected, inspected review lists empty**; enforced approval/CI deployment gating unproven. [Web PR #13](https://github.com/w1iii/CoursePilot/pull/13) / [RAG PR #7](https://github.com/w1iii/CoursePilot-RAG/pull/7). [CI configuration](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.github/workflows/ci.yml).

**Measured impact:** web CI **43/45 (95.56%)**, RAG **18/25 (72%)** successful. First/latest elapsed web **72/71 s**, RAG **89/88 s** (first failed). Changed scope prevents controlled speedup claim. [Metrics](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/metrics-and-history.json).

**Release/recovery:** web main `e3516894`, RAG main `142bcb1d`; source trees match audited commits. Final tag **Missing**; current RAG/worker attribution unverified. Restore compatible known-good deployments; data recovery separate. Historical staging restore does not establish current production recovery. [Deployment/recovery evidence](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#14-cicd-deployments-releases-and-recovery). **Unedited challenge recording: Missing.**

<div class="page-break"></div>

# Ownership, Limitations & Evidence

## 8 Contribution and external-work disclosure

**Engineering ownership:** Lui Franz Lomugdang confirms solo UI/API, Canvas, database, RAG orchestration, tests and DevOps responsibility. [Retrospective sprint board](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#15-ownership-engineering-process-and-retrospective-sprint-board) reconstructed from commits/PRs, **not original sprint-planning proof**.

**AI assistance:** audit/documentation used OpenCode with source/test verification; current revision uses GPT-6.1 Sol. Earlier handoff recorded GPT-6 Astra for its audit stage. Historical implementation-assistant tools/tasks **Require Manual Confirmation**; runtime Gemini/Groq is separate disclosure.

**Third-party content:** declared packages/APIs, institutional Canvas content, instructor template; asset/font/icon/screenshot licensing, institutional permission and costs require owner confirmation.

## 9 Current limitations and final status

**Implemented:** authenticated dashboard, owner-scoped task CRUD, retrieval/generation, study practice, queues and test-backed failure handling. **Partial/missing:** coordinated deletion, citation parity, current worker/schema/recovery verification, independent PR review, representative AI evaluation, accessible Google Doc, release tag and required recording.

**Next steps:** coordinated deletion and restore/deployment acceptance; representative AI quality/cost evaluation. Academic submission remains owner action, not completed by file generation.

**Publication notice:** all new GitHub documentation URLs below target `main` and become available **only after approved commit/merge/push**. Private RAG evidence requires panel access. Supporting data and sprint links now use repository paths, not invalid standalone hostnames.

## 10 Reviewer evidence index

| Category | Evidence |
|---|---|
| Product & source | [Production](https://course-pilot-pi.vercel.app) · [Web](https://github.com/w1iii/CoursePilot) · [RAG—private](https://github.com/w1iii/CoursePilot-RAG) · audited SHAs above; tag missing |
| Technical specs | [README](https://github.com/w1iii/CoursePilot/blob/main/README.md) · [Architecture/ERD/API/review](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md) · [Owner-supplied ERD context](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SCHEMA_CONTEXT.md) |
| AI & testing | [Evaluation report](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.md) · [Raw data](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.log) · [Security implementation/tests](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/AI_SECURITY_IMPLEMENTATION.md) · [CI summaries](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/ci-test-summaries.json) |
| DevOps & process | [Pipeline/recovery](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#14-cicd-deployments-releases-and-recovery) · [Metrics](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/metrics-and-history.json) · [Sprint reconstruction](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#15-ownership-engineering-process-and-retrospective-sprint-board) |
| Deployment video | **Missing** — no invented recording URL |

**Template:** supplied `CSP221A_Final_Technical_Documentation_Template.docx`; all ten numbered headings/categories retained. Facts condensed from original handoff; unavailable evidence remains explicitly marked.
