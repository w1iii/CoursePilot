# DevOps delivery pack

Current product coverage: [deliverables checklist](../DELIVERABLES_CHECKLIST.md),
[verification register](../VERIFICATION_REGISTER.md) and
[paired release procedure](../RELEASE.md). Backend-specific automation and
operations are documented in the [RAG pipeline](https://github.com/w1iii/CoursePilot-RAG/blob/main/docs/devops/PIPELINE.md)
and [RAG runbook](https://github.com/w1iii/CoursePilot-RAG/blob/main/docs/devops/DEPLOYMENT_ROLLBACK.md).
New document URLs require approved publication.

Prepared 27 November 2026. Scope: `w1iii/CoursePilot`, whose Git root is
`coursepilot/` in the parent workspace. No deployment, migration, workflow
dispatch, repository-settings change, or production write was performed for this pack.

| Required deliverable | Location | Evidence status |
| --- | --- | --- |
| CI/CD configuration | [CI](../../.github/workflows/ci.yml), [CodeQL](../../.github/workflows/codeql.yml), [metrics export](../../.github/workflows/pipeline-metrics.yml), [availability](../../.github/workflows/beta-availability.yml), [staging smoke](../../.github/workflows/staging-auth-smoke.yml), [Vercel](../../vercel.json) | Existing configurations plus local CI optimization/export changes; new changes not run on GitHub yet |
| Pipeline documentation and diagram | [PIPELINE.md](PIPELINE.md), [PIPELINE.mmd](PIPELINE.mmd) | Actual automation distinguished from manual release steps |
| Completed pipeline metrics log | [CSV](evidence/PIPELINE_METRICS.csv), [source metadata](evidence/github-runs.json), [analysis](METRICS.md) | 40 real completed hosted CI runs, including failures |
| Optimization report | [PIPELINE_OPTIMIZATION.md](PIPELINE_OPTIMIZATION.md), [benchmark](evidence/test-step-benchmark.json) | Completed local before/after test-step comparison; hosted after-results pending |
| Deployment and rollback runbook | [DEPLOYMENT_ROLLBACK.md](DEPLOYMENT_ROLLBACK.md) | Operator procedure; rollback rehearsal not claimed |
| Incident logs and postmortems | [INCIDENT_LOG.md](INCIDENT_LOG.md), [postmortems](incidents/) | Recorded CI failure, notification drill, and release-validation defect; no invented outage |

## Evidence boundaries

- GitHub metadata was fetched read-only with authenticated `gh`. Raw metadata
  includes job/step timing and links, not workflow logs or secret values.
- Local benchmark passed 370 tests in each of six executions on Node 26.7.0.
  This does not establish a full CI speedup or production correctness.
- Historical operational claims cite source documents; they were not freshly
  verified against Vercel, Railway, databases, or user accounts.
- No incident detection/repair timestamps, deployment frequency, change-failure
  rate, MTTR, or database restore success are inferred from CI success.
- Existing untracked AI-evaluation and audit-summary work was not changed.

## Refresh

Run from repository root:

```sh
python3 -m unittest discover -s scripts/devops -p 'test_*.py' -v
python3 scripts/devops/collect_metrics.py --output docs/devops/evidence
python3 scripts/devops/benchmark_tests.py
```

Collectors overwrite generated evidence in their selected destination. Preserve
dated copies before refreshing if retaining historical comparisons. Recalculate
the Markdown summaries after refresh; they describe this specific snapshot.
The manual **Pipeline metrics export** workflow produces a separate 30-day
artifact, without committing files or granting write access.

## Validation

[Validation record](evidence/validation.json): six evidence-tooling tests passed;
both changed workflows passed actionlint 1.7.7; relative links and duplicate
diagram sources checked; all 40 CSV rows reproduced from raw metadata.
ShellCheck integration and Mermaid rendering were not run.
