# Completed pipeline metrics log

Scope: web repository CI only. The [backend pipeline](https://github.com/w1iii/CoursePilot-RAG/blob/main/docs/devops/PIPELINE.md)
documents separate RAG evidence; do not pool the two repositories' denominators.
Preserve this snapshot when collecting new dated evidence.

## Snapshot

Source: read-only `gh` metadata for `w1iii/CoursePilot`, collected
2026-11-27 14:50:19 UTC. Selection: latest 40 `ci.yml` runs, completed only,
latest attempt per run. No failure was removed from the sample.

- [Completed log, 40 rows](evidence/PIPELINE_METRICS.csv)
- [Raw run/job/step metadata](evidence/github-runs.json)
- [Reproducible collector](../../scripts/devops/collect_metrics.py)

| Metric | Observed value |
| --- | --- |
| Created-at window | 2026-11-15 09:19:44–2026-11-27 11:09:32 UTC |
| Completed runs | 40 |
| Success / failure | 38 / 2 |
| Sample success rate | 95.0% |
| Execution-span median | 65 seconds |
| Execution-span p95, nearest rank | 77 seconds |
| Execution-span min / max | 51 / 80 seconds |
| Median summed job time | 123.5 seconds |

All timing statistics above include successful and failed runs. Workflow
topology and application revisions changed within this window; these are
descriptive history, not a controlled optimization comparison.

## Field definitions

| CSV field | Meaning |
| --- | --- |
| `run_id`, `attempt`, `url` | Auditable run identity; attempt pinned during job fetch |
| `workflow`, `event`, `commit`, `conclusion` | GitHub workflow metadata; PR SHA may be a merge ref |
| `created_at` | Workflow creation timestamp |
| `first_job_started_at`, `last_job_completed_at` | Earliest start / latest completion among completed, timestamped jobs |
| `initial_queue_seconds` | Creation to first job start, not all downstream queue time |
| `execution_span_seconds` | First job start to last job completion; includes gaps |
| `total_job_seconds` | Sum of completed job intervals, including parallel overlap |
| `job_count` | Number of completed jobs with valid intervals |

Timestamp resolution is seconds. Missing/invalid intervals produce empty
duration cells, not invented durations. Summed job time is not workflow wall time,
billed minutes, or cost. Run `updatedAt` is not used as a completion timestamp.
The collector checks the latest N candidates; if some are incomplete, fewer than
N rows are exported. GitHub history/retention and reruns can change future exports.

## Failure evidence

Runs [44200237032](https://github.com/w1iii/CoursePilot/actions/runs/44200237032)
and [44254094935](https://github.com/w1iii/CoursePilot/actions/runs/44254094935)
failed at `npm audit --audit-level=high`. Later lint/type/test/build steps were
skipped, not passed. See [postmortem](incidents/CI-20261118.md).

## Not measurable from this log

Deployment frequency, lead time to production, change-failure rate, production
uptime, MTTR, and rollback success require deployment/incident evidence outside
these CI records. Intentional availability drill `44450542468` belongs to another
workflow and is not included in this CI success-rate calculation.
