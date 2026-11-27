# Measured evaluation: offline streaming transport

**Date:** 27 November 2026. **Classification:** synthetic transport fixture, not production/model latency, answer accuracy, hallucination rate, or learning benefit.

## Method

20 buffered requests versus 20 streaming requests. Fixture emits eight parts with 20 ms delay per part. First-answer and completion timings were recorded per request. Existing benchmark script used: [source at audited revision](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/scripts/benchmark_chat_stream.py).

| Metric | Buffered (n=20) | Streaming (n=20) |
|---|---:|---:|
| Protocol success | 100% | 100% |
| First-answer p50 | 165.225 ms | 21.575 ms |
| First-answer p95 | 165.923 ms | 21.854 ms |
| Completion p50 | 165.225 ms | 169.246 ms |
| Completion p95 | 165.923 ms | 170.799 ms |

Median first-answer reduction: **86.94%**. Median completion increase: **2.43%**. Streaming exposed text earlier but did not improve fixture completion time.

## Supporting data

- [All raw observations and computed summary](offline-stream-benchmark.log) — JSON content with `.log` extension
- [Executed command, isolated environment, time and exit status](offline-stream-benchmark.json)
- [Software test summaries](ci-test-summaries.json)

No real provider calls, paid inference, or production mutations were performed. Software-test counts are not counts of evaluated AI answers. Representative factuality/citation/cost evaluation remains **Missing**.

## Reproduction

Use the exact command recorded in the metadata with the audited script and existing dependencies in an isolated synthetic environment. Results vary by machine/scheduling. Compare the same fixture and sample sizes; do not extrapolate its percentage to production model throughput.
