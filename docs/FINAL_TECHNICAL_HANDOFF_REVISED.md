# Final Technical Documentation

**Project / section:** CoursePilot | CSP221A — BSCS 4C  
**Members / roles:** Lui Franz Lomugdang — **Solo Full-stack Developer and DevOps Engineer**  
**Evidence:** [Web repo](https://github.com/w1iii/CoursePilot) · [RAG repo—private](https://github.com/w1iii/CoursePilot-RAG) · [Production](https://course-pilot-pi.vercel.app) · audited [web SHA](https://github.com/w1iii/CoursePilot/commit/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0) / [RAG SHA](https://github.com/w1iii/CoursePilot-RAG/commit/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). **Release identified by commit SHA; no tag created. Evidence date:** 27 November 2026.

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
| External / costs | Owner-reported free tiers: Vercel, Railway, Supabase, Clerk, Groq, R2. Gemini: student Google AI Pro subscription. API billing/quotas and actual invoices **Not Verified**. |

Lock-resolved versions: [web manifest/lock](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0) / [backend manifest/lock](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494). Examples: `gemini-3.6-flash`, `gemini-embedding-001` (1,536 dimensions); production models unverified. Student subscription does not establish [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing).

## 3 Data model, API & user workflow

**Data:** users → courses → tasks/announcements; threads → messages; study packs → items/sessions → attempts; documents → chunks. [ERD and owner-supplied schema context](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SCHEMA_CONTEXT.md). Context export is **not executable SQL or verified production metadata**; use [migrations](https://github.com/w1iii/CoursePilot/tree/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/supabase) for implementation evidence.

**Routes/workflow:** authenticated `GET/POST /api/tasks`, owner-checked `PATCH/DELETE /api/tasks/[id]` (manual-only deletion); `POST /api/ask`; validated `POST /api/study-packs` → **202** → job polling → saved pack/practice. [API reference](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#6-api-contracts-and-authorization).

<div class="page-break"></div>

# Implementation & Verification

## 4 AI feature: design, output processing & evidence

**Task/pipeline:** course explanations/study questions: authorized Canvas content → parse/chunk/embed → scoped retrieval → bounded Gemini/Groq prompt → citation/JSON checks → answer/saved pack → UI. [Implementation](https://github.com/w1iii/CoursePilot-RAG/tree/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app). Generative tasks exceed rules-only scoring; no fine-tuning.

Study: **1–2 modules, 1–15 items**; count/type/options/citation checks, plus quotes for focused requests. MCQ correctness is server-derived; other practice self-assessed. Topic-free selection is deterministic sampling, not semantic retrieval.

**Evaluation:** offline fixture, **20 buffered + 20 streaming**, 100% protocol success; median first-text **165.225 → 21.575 ms (86.94% lower)**; completion **165.225 → 169.246 ms (2.43% slower)**. [Report/raw observations](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.md). **Not live model speed/accuracy.** [Quality/security evaluation plan](https://github.com/w1iii/CoursePilot/blob/main/docs/ai-evaluation/PLAN.md): 40 chat cases + 12 study requests; **not executed**.

**Risks:** reject invalid output; scope retrieval; bound context/time/output; provider fallback/retries and safe errors. [Injection/hallucination controls and tests](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/AI_SECURITY_IMPLEMENTATION.md). Risk remains; `grounded` means retrieved chunks, not factual correctness.

## 5 Security, data protection & reliability

**Secrets/access:** server keys, Clerk identity, owner checks, expiring user/course/action HMAC tokens; Canvas AES-256-GCM, queue Fernet encryption. [Environment template](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.env.example). Production injection/policies unverified; service-role bypasses RLS.

**Failures/data:** validation, SSRF-aware Canvas networking, rate limits/503 fail-closed, job leases/retries, request IDs/user-safe errors. App deletion then Clerk deletion is non-atomic and **omits RAG cleanup/cancellation**. Complete erasure/retention compliance not established. Global CSP is report-only.

## 6 Testing: report actual counts and results

| Evidence class | Actual result / limit |
|---|---|
| Automated checks | Local **370 Vitest + 3 smoke-unit passed**; lint/typecheck/build passed; library-only line coverage **63.27%**. Local RAG **386 passed, 9 skipped**, **84.35%**. |
| CI | [Web](https://github.com/w1iii/CoursePilot/actions/runs/45988132144): Node 22/26 plus DB contracts passed. [RAG](https://github.com/w1iii/CoursePilot-RAG/actions/runs/45988114364): **395 passed, 85.18%**. Repeated runs not additive. |
| AI evaluation | Synthetic transport measured; factuality/citation/security evaluation planned, **not executed**. |
| Production checks | Frontend READY metadata; RAG success metadata. Current API/worker attribution **Not Verified**. |
| Known defects | RAG deletion gap, buffered web-source loss, non-atomic deadline events, unbounded archive listing. [Findings](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#16-prioritized-findings-and-recommended-fixes). |

Local npm audit zero advisories; CI Python/source-secret/image policy checks passed. Local Docker unavailable; CI supplies separate DB evidence. [Sanitized counts/method](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SANITIZED_EVIDENCE_SUMMARY.md). No production writes or paid inference performed.

## 7 Engineering process & CI/CD

**Rules/flow:** PR/checks → merge → build/deploy → smoke; **main unprotected, inspected review lists empty**. Enforced approval/CI gating unproven. [Web PR #13](https://github.com/w1iii/CoursePilot/pull/13) / [RAG PR #7](https://github.com/w1iii/CoursePilot-RAG/pull/7) · [CI](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/.github/workflows/ci.yml).

**Measured impact:** web CI **43/45 (95.56%)**, RAG **18/25 (72%)** successful. First/latest elapsed web **72/71 s**, RAG **89/88 s** (first failed). Changed scope prevents controlled speedup claim. [Metrics](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/metrics-and-history.json).

**Release/recovery:** audited main web `e3516894`, RAG `142bcb1d`; source trees match audited commits. Current workers unverified. Restore compatible deployments; data recovery separate; historical staging restore is not current production recovery. [Recovery evidence](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#14-cicd-deployments-releases-and-recovery). [Owner-supplied demo folder](https://drive.google.com/drive/folders/1VEZ6SPDRTdkM5OcgxcBJ1wLIfodFx_0t?usp=sharing): access, content and unedited continuity **Not Verified**.

<div class="page-break"></div>

# Ownership, Limitations & Evidence

## 8 Contribution and external-work disclosure

**Engineering ownership:** Lui Franz Lomugdang confirms solo UI/API, Canvas, database, RAG orchestration, tests and DevOps responsibility. [Retrospective sprint board](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#15-ownership-engineering-process-and-retrospective-sprint-board) reconstructed from commits/PRs, **not original sprint-planning proof**.

**AI assistance:** owner reports OpenAI **Sol, Terra and Astra** for planning/development assistance. AI proposals supported implementation/debugging, test work and documentation; plans/changes were checked against requirements, source and diffs. Recorded verification includes lint, typecheck, automated tests, build and CI; passing checks do not independently validate every AI suggestion. Individual model-to-task history is not independently verified. Runtime Gemini/Groq is separate.

**Third-party content:** [Asset sources/licenses](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/ASSET_SOURCES.md): Google Material Symbols (Apache 2.0), DM Sans/DM Mono/Fraunces (SIL OFL 1.1), declared dependencies and instructor template. Audio is procedurally synthesized. Screenshot authorship/permissions, Canvas content rights and some graphic origins remain unverified.

**Private backend:** restricted distribution controls access to backend implementation/operational details. Owner will invite panel reviewers; invitations/acceptance are not yet verified. Privacy is not a substitute for authentication or secret management; credentials belong outside source control.

## 9 Current limitations and final status

**Implemented:** authenticated dashboard, owner-scoped task CRUD, retrieval/generation, study practice, queues and test-backed failures. **Partial/missing:** coordinated deletion, citation parity, worker/schema/recovery verification, independent PR review, executed AI-quality evaluation and accessible Google Doc. Demo link supplied; recording requirement compliance unverified.

**Next steps:** coordinated deletion and restore/deployment acceptance; representative AI quality/cost evaluation. Academic submission remains owner action, not completed by file generation.

**Link status:** documentation URLs target `main`; latest read-only check did not find revised handoff there. New/updated documents require publication/merge; private backend needs panel access. Folder/video access must be tested with reviewer permissions.

## 10 Reviewer evidence index

| Category | Evidence |
|---|---|
| Product & source | [Production](https://course-pilot-pi.vercel.app) · [Web](https://github.com/w1iii/CoursePilot) · [RAG—private](https://github.com/w1iii/CoursePilot-RAG) · release identified by audited SHAs |
| Technical specs | [README](https://github.com/w1iii/CoursePilot/blob/main/README.md) · [Architecture/ERD/API/review](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md) · [Owner-supplied ERD context](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SCHEMA_CONTEXT.md) |
| AI & testing | [Measured transport](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.md) · [Raw data](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/offline-stream-benchmark.log) · [Evaluation plan](https://github.com/w1iii/CoursePilot/blob/main/docs/ai-evaluation/PLAN.md) · [Security/tests](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/AI_SECURITY_IMPLEMENTATION.md) · [Sanitized evidence](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/SANITIZED_EVIDENCE_SUMMARY.md) |
| DevOps & process | [Pipeline/recovery](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#14-cicd-deployments-releases-and-recovery) · [Metrics](https://github.com/w1iii/CoursePilot/blob/main/docs/audit-evidence/metrics-and-history.json) · [Sprint reconstruction](https://github.com/w1iii/CoursePilot/blob/main/docs/SYSTEM_REVIEW.md#15-ownership-engineering-process-and-retrospective-sprint-board) |
| Demo / recording | [Owner-supplied Google Drive folder](https://drive.google.com/drive/folders/1VEZ6SPDRTdkM5OcgxcBJ1wLIfodFx_0t?usp=sharing); accessibility/content/continuous-unedited compliance **Not Verified** |

**Template:** supplied `CSP221A_Final_Technical_Documentation_Template.docx`; all ten numbered headings/categories retained. Facts condensed from original handoff; unavailable evidence remains explicitly marked.
