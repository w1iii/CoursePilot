# CoursePilot documentation

Updated 27 November 2026. This repository owns web/API behavior, application data and the application worker. RAG maintains its service documentation in [CoursePilot-RAG](https://github.com/w1iii/CoursePilot-RAG).

## Start here

| Purpose | Document |
|---|---|
| Required deliverables and acceptance work | [Deliverables checklist](DELIVERABLES_CHECKLIST.md) |
| Evidence, owners and confirmation steps | [Verification register](VERIFICATION_REGISTER.md) |
| Development installation and migration destinations | [Setup](SETUP.md) |
| Version pairing and final release procedure | [Release](RELEASE.md) · [Changelog](../CHANGELOG.md) |
| Architecture and trust boundaries | [System review §4](SYSTEM_REVIEW.md#4-architecture-and-trust-boundaries) |
| Logical ERD and data contracts | [System review §7](SYSTEM_REVIEW.md#7-database-model-migrations-and-integrity) |
| Web and RAG API inventory | [System review §6](SYSTEM_REVIEW.md#6-api-contracts-and-authorization) |
| AI approach, prompts and output validation | [System review §§9–10](SYSTEM_REVIEW.md#9-ai-ingestion-retrieval-prompting-and-output-processing) |
| Measured AI-related results and evaluation scope | [Evaluation report](ai-evaluation/REPORT.md) · [Evaluation protocol](ai-evaluation/PLAN.md) |
| CI/CD, metrics, optimization, incidents and rollback | [DevOps pack](devops/README.md) |
| Worker operation and study contracts | [Background jobs](BACKGROUND_JOBS.md) · [Study reliability](STUDY_PREP_RELIABILITY.md) |
| Owner roles and external-work disclosure | [Revised handoff §8](FINAL_TECHNICAL_HANDOFF_REVISED.md#8-contribution-and-external-work-disclosure) |

## Handoff and evidence

The template-based [Markdown](FINAL_TECHNICAL_HANDOFF_REVISED.md), [Word](FINAL_TECHNICAL_HANDOFF_REVISED.docx) and [PDF](FINAL_TECHNICAL_HANDOFF_REVISED.pdf) are dated handoff snapshots. Their exports and recorded results are retained together. Current completion work is tracked in the checklist and register rather than silently altering the historical snapshots.

[Audit evidence](audit-evidence/README.md) contains source inventories, command logs, platform snapshots and document-validation records. Their dates and revisions define their scope. A source test, a deployment-status record and an authenticated user journey are different forms of evidence.

The [documentation validation record](documentation-validation.json) covers this
completion pass, including links, configuration fields and evidence-tooling checks.

## Publication

Files can be reviewed locally now. New or changed GitHub links become usable after approved publication. The release owner checks private-backend permissions, document sharing and recording access using reviewer credentials. Publication and academic submission are separate owner actions.
