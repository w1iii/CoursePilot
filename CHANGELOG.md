# Changelog

Changes are grouped by capability rather than treated as separate deployed releases. Version 1.0.0 is the owner-approved source/documentation release; production acceptance is tracked separately.

## 1.0.0 — 2026-11-27

### Added

- Clerk sign-in, Canvas connection and enrollment-based course selection.
- Canvas assignment/announcement synchronization, manual task CRUD, deadline-change tracking, and deterministic priority scoring.
- Course-scoped assistant, cited answers, saved conversations, and navigation-safe chat state.
- Study packs scoped to one or two modules, practice sessions, server-scored MCQ attempts, and self-assessment for other modes.
- Durable onboarding, synchronization and study jobs, worker leases/readiness, and persistent in-app notifications.
- Bounded streaming chat with JSON fallback.
- Technical handoff, architecture/ERD/API review, setup and release guides, deliverables checklist, and evidence-based verification register.
- DevOps documentation, completed CI metrics, local optimization comparison, rollback procedure and retrospective incident records.

### Changed

- Study generation uses asynchronous `202` acceptance and persisted job polling.
- Study creation validates module selection, item count, optional focus, source evidence and answers before persistence.
- Study persistence is transactional and lease-fenced; concurrent requests use single-active-work guards.
- Current AI integration uses Gemini and optional Groq. Task priority remains rule-based, not model inference.

### Security and reliability

- Canvas tokens use AES-256-GCM; inter-service requests use short-lived user/course/action-scoped HMAC tokens.
- Canvas network validation, shared database rate limits, bounded provider calls, and safe user-facing errors protect request boundaries.
- Account-data deletion and Clerk deletion exist; coordinated RAG cleanup/cancellation requires a separate application change.

### Upgrade notes

- Apply the reviewed application schema/RPC sequence before compatible worker and web revisions; see [setup](docs/SETUP.md).
- RAG has its own database, migrations, API and ingestion worker. The historical vector migration in this repository is not the default RAG bootstrap.
- `RAG_SIGNING_SECRET` must agree across web, application worker and RAG within one environment.
- Deploy RAG API/ingestion worker, application worker and web as a compatible set. Preserve queue encryption keys while jobs require them.

### Current operating boundaries

- Buffered chat adaptation drops web-source metadata that streaming preserves.
- Deadline events and task updates are separate writes; null/date transition handling requires review.
- Study archive responses accumulate history; response-level cursor pagination is a follow-up.
- Global CSP is report-only; legacy enforced coverage is narrower.
- Current production acceptance, complete recovery rehearsal and representative AI-quality scoring await owner-controlled checks.

### Source references

| Capability | Source history |
|---|---|
| Durable jobs | `b769612` |
| Streaming | `befbca3` |
| Study reliability/single-flight | `c9ed867` |
| Study input validation | `12a2855` |
| Technical handoff/evidence | `e206038` |

These identifiers describe source history, not a new deployment. The final source snapshot is identified by tag `v1.0.0` in both repositories. See [release procedure](docs/RELEASE.md).
