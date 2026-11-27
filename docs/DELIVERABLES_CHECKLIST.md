# Product and documentation deliverables

Review date: 27 November 2026. Owner: Lui Franz Lomugdang (`w1iii`), solo full-stack developer and DevOps engineer.

“Available” describes a local artifact. “Recorded” refers to dated evidence. “Pending confirmation” identifies a specific acceptance action; it is not a positive test result. Publication and reviewer access are checked separately.

## Product

| Deliverable | Canonical location | Current position | Acceptance action |
|---|---|---|---|
| Frontend and backend source | [`src/`](../src/) and [RAG repository](https://github.com/w1iii/CoursePilot-RAG) | Source, workers, tests and lockfiles available | Confirm private-source access and paired release revisions |
| Production URL | [Hosted web](https://course-pilot-pi.vercel.app) | READY metadata recorded in dated audit | Confirm current API/workers and authorized user journey |
| Tagged final release | [Release procedure](RELEASE.md) | Owner selected paired `v1.0.0` source/documentation release | Confirm remote tag refs resolve to the approved release commits |
| Schema and migrations | [`supabase/`](../supabase/) and RAG schema/migrations | Available; stores have separate initialization paths | Rehearse full installation and compare applied ledgers |
| Environment examples | [Web example](../.env.example) and RAG example | Required application settings represented; secret fields blank | Confirm deployed presence/policy without exporting values |
| Seed data or setup script | [Setup tools and procedure](SETUP.md#database-setup-and-validation-tools) | Disposable SQL validator and RAG initialization tools available | Validate full bootstrap; test fixtures are not a reusable product seed |

## Technical documentation

| Deliverable | Canonical location | Current position | Acceptance action |
|---|---|---|---|
| README and setup | [README](../README.md), [Setup](SETUP.md) | Available | Follow steps on isolated databases |
| Architecture diagram | [System review §4](SYSTEM_REVIEW.md#4-architecture-and-trust-boundaries) | Mermaid diagram and trust-boundary explanation available | Review against release components |
| Database diagram / ERD | [System review §7](SYSTEM_REVIEW.md#7-database-model-migrations-and-integrity) | Selected logical ERD available | Use executable SQL/ORM for physical details |
| API documentation | [System review §6](SYSTEM_REVIEW.md#6-api-contracts-and-authorization) | Routes, authentication and async contracts available | Reconcile with release route inventory |
| AI implementation | [System review §9](SYSTEM_REVIEW.md#9-ai-ingestion-retrieval-prompting-and-output-processing) and [§10](SYSTEM_REVIEW.md#10-study-generation-scoring-and-ai-evaluation) | Approach, prompt behavior, validation and limitations documented | Record actual provider/model settings for evaluation |
| AI testing and evaluation | [Evaluation report](ai-evaluation/REPORT.md) | Software tests and synthetic transport results recorded | Run approved human-scored model evaluation |
| Release changelog | [Changelog](../CHANGELOG.md) | Version 1.0.0 dated 27 November 2026 | Confirm contents match paired release source |
| Roles and responsibilities | [Handoff §8](FINAL_TECHNICAL_HANDOFF_REVISED.md#8-contribution-and-external-work-disclosure) | Solo ownership and assistance disclosure documented | Owner signs final contribution/access statement |

The ten-section template-based handoff is available in Markdown/Word/PDF. Reviewer sharing and final submission are owner-controlled acceptance steps.

## DevOps

| Deliverable | Canonical location | Current position | Acceptance action |
|---|---|---|---|
| CI/CD configurations | [Workflows](../.github/workflows/) and [RAG workflows](https://github.com/w1iii/CoursePilot-RAG/tree/main/.github/workflows) | Repository configurations available | Run changed workflows on approved revision; confirm promotion controls |
| Pipeline documentation and diagram | [Pipeline](devops/PIPELINE.md), [Mermaid](devops/PIPELINE.mmd) | Automation/manual boundaries documented | Render and check current workflow correspondence |
| Completed metrics log | [Metrics](devops/METRICS.md), [40-row CSV](devops/evidence/PIPELINE_METRICS.csv) | Completed hosted web CI sample recorded | Preserve snapshot; collect new dated runs after changes |
| Optimization before/after | [Optimization report](devops/PIPELINE_OPTIMIZATION.md) | Six local samples; 10.52% median test-step reduction | Measure comparable hosted runs before claiming pipeline improvement |
| Deployment/rollback runbook | [Runbook](devops/DEPLOYMENT_ROLLBACK.md) | Procedure available | Rehearse compatible rollback and isolated restoration |
| Incident logs/postmortems | [Incident log](devops/INCIDENT_LOG.md), [postmortems](devops/incidents/) | CI failure, drill and release-validation records available | Accept action owners and capture closure evidence |

## Completion ownership

The owner maintains this checklist and [verification register](VERIFICATION_REGISTER.md). The current DevOps metrics pack measures web CI; backend pipeline behavior is documented in the RAG repository. All new/changed local files require approved commit/publication before their online URLs are relied upon.
