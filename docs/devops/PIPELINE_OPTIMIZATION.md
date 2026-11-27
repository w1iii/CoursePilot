# Pipeline optimization: before and after

Acceptance tracking: [V10](../VERIFICATION_REGISTER.md). The measured local
comparison below is retained unchanged; a hosted pipeline improvement requires
separate comparable runs after approved publication.

## Change delivered

Before: both Node 22 and Node 26 instrumented the same Vitest suite with V8 coverage.
After: Node 22 retains coverage and its existing line threshold; Node 26 runs the
same suite without duplicate coverage. Both retain install, audit, lint,
typecheck, smoke unit tests, and production build. No security gate was removed.

Job timeouts were also added to bound stalled runs, plus a small independent
evidence-tooling test job. These are reliability changes, not measured speedups;
the extra tooling job consumes runner time.

## Completed local comparison

Evidence: [six raw samples](evidence/test-step-benchmark.json).
Measured 2026-11-27 on macOS arm64, Node **26.7.0**, source revision
`e20603876b781f76ba6b068d66af2ec7d2471bdf` plus local DevOps changes.
The commands differ only by coverage instrumentation/reporting; JSON reporter
and temporary report files are used for both. Three sequential paired runs,
alternating order, existing dependencies/caches retained.

| Pair | Before: coverage (seconds) | After: plain tests (seconds) | Passed tests, both |
| --- | ---: | ---: | ---: |
| 1 | 9.3763 | 6.4118 | 370 |
| 2 | 6.7881 | 6.0743 | 370 |
| 3 | 6.3172 | 5.2242 | 370 |
| **Median** | **6.7881** | **6.0743** | **370** |

Measured reduction: **0.7138 seconds / 10.52%** for the local Node 26 test step,
using `(before median − after median) / before median × 100`.
All six commands exited zero, with 370/370 passed and zero pending tests.
Coverage-enabled runs also passed the existing coverage threshold.

## Hosted baseline and interpretation

Latest captured main CI:
[45988132144](https://github.com/w1iii/CoursePilot/actions/runs/45988132144).
From stored job metadata:

| Baseline component | Duration |
| --- | ---: |
| Workflow execution span | 68 seconds |
| Node 22 full job | 68 seconds |
| Node 26 full job | 66 seconds |
| Node 22 / 26 coverage step | 8 / 8 seconds |
| Node 22 / 26 build step | 29 / 28 seconds |

This hosted run uses an earlier application revision, different OS, and different
reporter behavior than the local benchmark. **Do not compare its 8 seconds against
the local after-time as a CI improvement.** Node 22 was the critical path, so
removing duplicate work on Node 26 may reduce runner time without reducing
pipeline wall time. No hosted optimized run has been executed in this task.

## Acceptance and next measurement

- Completed: local before/after measurements; suite counts unchanged.
- Completed: collector unit tests and generated metrics history.
- Pending: pushed workflow passing on both Node versions and CodeQL.
- Pending: hosted before/after comparison; net runner-time/cost impact including
  the added tooling job; production-runtime compatibility.

After owner-approved push, export new runs into a separate dated output folder.
Compare at least 10 successful push runs per workflow revision, matched on Node
versions, runner OS, suite size, dependency lockfile, cache state, and workload.
Report queue, execution span, summed job time, and test-step medians/p95 separately.
Do not count canceled jobs as passing tests. If coverage instrumentation itself
needs Node 26 validation, restore it on that runtime; plain tests do not establish
cross-runtime coverage parity.

## Roll back optimization

Replace the two conditional Vitest steps with the original unconditional
`npm test -- --coverage`. Keep the Node matrix and security checks. Re-run both
versions before merging. Never disable audits or reduce coverage thresholds
to manufacture improved timings.
