# AI-related testing and evaluation report

Evidence date: 27 November 2026. This report summarizes recorded results; it does not claim a new provider run or production experiment.

## 1. Evaluation layers

| Layer | Evidence | Interpretation |
|---|---|---|
| Web software contracts | 370 Vitest tests and 3 smoke-script unit tests passed in dated audit | Validation, bridge and application behavior under test fixtures |
| RAG software contracts | Local 386 passed, 9 database tests skipped; CI 395 passed | Parser, authorization, retrieval scope, queue and output-processing checks with synthetic providers |
| Streaming transport | 20 buffered and 20 streaming fixture requests | First-text/completion behavior of a controlled emitter |
| Course-answer/study quality | Human-scored protocol prepared | Provider-backed execution and scores await dataset/budget approval |

Software-test counts are not evaluated-question counts. Historical checks belong to their recorded source revisions and environments.

## 2. Recorded transport experiment

Fixture: eight emitted parts, 20 ms delay per part; 20 requests per mode.

| Metric | Buffered | Streaming |
|---|---:|---:|
| Protocol success | 20/20 | 20/20 |
| First-answer median | 165.225 ms | 21.575 ms |
| First-answer p95 | 165.923 ms | 21.854 ms |
| Completion median | 165.225 ms | 169.246 ms |
| Completion p95 | 165.923 ms | 170.799 ms |

Streaming lowered median first-answer delay by **86.94%** while median completion increased **2.43%**. This measures synthetic transport, not live provider latency, answer correctness or student learning.

Evidence: [method](../audit-evidence/offline-stream-benchmark.md), [raw observations](../audit-evidence/offline-stream-benchmark.log), [command metadata](../audit-evidence/offline-stream-benchmark.json), [CI summaries](../audit-evidence/ci-test-summaries.json).

## 3. Software evidence and limits

- Web reported 63.27% line coverage for the default `src/lib` inclusion scope, not the entire UI.
- Local RAG coverage was 84.35%; cited database-enabled CI reported 85.18%.
- Providers/embeddings were synthetic in the audited test runs.
- Study schema, count, citation and focus-evidence checks reject malformed output; this does not establish every accepted item is educationally correct.
- `grounded` describes available retrieved chunks, not calibrated confidence or factuality.

## 4. Provider-backed quality evaluation

Use the existing [evaluation protocol](PLAN.md): 20 answerable questions, five unsupported, five out-of-course, ten injection attempts and twelve study requests. These are proposed cases, not completed observations.

Before execution, approve synthetic content, frozen reference source spans, human rubric, model/settings, call/token budget and isolated environment. Preserve failed/time-out cases and retries.

The completed run should supply:

- `cases.jsonl`: frozen cases and references.
- `run-manifest.json`: commits, dataset hash, actual provider/model/settings, prompt revision and UTC date.
- `results.sanitized.jsonl`: observed responses, citations, failures, latency and usage.
- `scores.csv`: human claim/item scores and adjudication.

These result files are produced from execution, not empty placeholders. Until then, representative factuality, citation faithfulness, retrieval support, safety-case performance and cost per accepted answer remain **pending measurement**. No accuracy percentage or controlled learning-benefit conclusion is assigned.

## 5. Next acceptance

The owner approves provider usage; a human evaluator scores source support and usefulness. Publish per-stratum denominators, error examples, latency/retry counts, measured or unknown costs and limitations. Retain this transport result separately from the new quality results.
