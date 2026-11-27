# Chat UX: before/after evidence — 2026-11-27

## Status and scope

Implemented locally; **not deployed or enabled in production**. No model or
fallback-order changes. Production after metrics remain unavailable until a
coordinated RAG/web rollout and fresh representative requests.

Two separate cohorts below must not be compared as if they were the same test.
HTTP success percentages are not retrieval accuracy, citation quality, or recall.

## 1. Production incident baseline — captured before edits

Source: Railway `/api/v1/chat` HTTP logs, queried over the previous 24 hours
with a 1,000-record cap. Three matching records returned. Collected at
2026-11-27T01:55:50Z; records span 01:35:43–01:38:19Z.

| Metric | Before | Production after |
| --- | ---: | --- |
| Requests observed | 3 | Not measured |
| HTTP success | 0/3 (0%) | Not measured |
| Client-closed requests (499) | 3/3 (100%) | Not measured |
| Median elapsed time to disconnect | 29,979 ms | Not measured |
| p95 elapsed time to disconnect | 29,980.8 ms | Not measured |
| Mean elapsed time to disconnect | 29,978.67 ms | Not measured |
| Successful answer completion latency | Unavailable: zero successes | Not measured |
| First answer token latency | Not instrumented | Instrumented, not yet measured in production |
| Retrieval accuracy / recall | No labeled evaluation set | Not measured |

This small incident sample is not an estimate of overall service availability.
Gemini HTTP 200 responses did not establish chat success: the caller had already
closed the RAG request after approximately 30 seconds.

## 2. Paired offline protocol benchmark — after implementation

20 buffered requests and 20 streaming requests. Same synthetic answer, emitted
in eight pieces at 20 ms intervals. Fake HTTP transports; no database,
student content, live provider requests, or model-quality evaluation.

| Metric | Buffered before | Streaming after | Difference |
| --- | ---: | ---: | --- |
| Protocol success | 20/20 (100%) | 20/20 (100%) | No change |
| First answer text, median | 163.272 ms | 21.395 ms | **86.90% earlier** |
| First answer text, p95 | 165.570 ms | 21.600 ms | Earlier delivery |
| Full completion, median | 163.272 ms | 169.208 ms | **3.64% slower** |
| Full completion, p95 | 165.570 ms | 169.998 ms | Slight fixture scheduling overhead |

Interpretation: streaming removes wait-for-the-entire-answer buffering. It does
**not** demonstrate that Gemini generates faster or that real end-to-end latency
dropped by 86.90%. Complete-generation latency did not improve in this fixture.
Short fixture times are deliberately synthetic, not production targets.

Reproduce from `rag/canvas-ai-assistant`:

```sh
uv run --locked python -m scripts.benchmark_chat_stream --samples 20 --delay-ms 20
```

## 3. What changed, and what improvement is established

| Before | Implemented | Evidence / limitation |
| --- | --- | --- |
| Whole answer buffered at each hop | Gemini/Groq SSE → RAG → Next.js → ChatStore deltas | Offline benchmark plus real loopback HTTP flush test |
| Caller aborted at 30 seconds while backend continued | Stream path: RAG total ≤35 s; Next total 45 s; browser 50 s; function 60 s | Deadline/cancellation tests; production flag still off |
| No deployed overall generation budget; potentially repeated continuations | Stream generation shares a bounded budget (default 20 s); no automatic continuation; explicit Continue | Timeout, truncation and no-fallback-after-text tests |
| Chat inherited up to 8,192 output tokens | Chat-only output ceiling defaults to 2,048; study settings unchanged | 75% smaller ceiling is a configuration change, **not** a measured 75% latency improvement |
| Stop could leave synchronous generation running locally | Async HTTP/DB operations; disconnect cancels local provider socket | Real loopback disconnect test; cannot guarantee remote provider stops computing/billing |
| Partial answer discarded on error | Retained and labeled incomplete; at most one interim checkpoint plus terminal save | ChatStore tests; stored partial responses retained on reload |
| Generic error category and 502 | Allowlisted timeout/status metadata, shared request ID, typed stream error | Route/client tests; no raw provider details logged |
| No first-token metric | Backend and Next first-token, completion, outcome logs | Instrumentation added; production distributions still pending |
| Auto-scroll on every turn update | Follow output only while user remains near bottom | Requires authenticated browser/accessibility review |

User-scoped JSON cache/deduplication remains intact. Streaming initially bypasses
that cache/deduplication rather than sharing a single consumable response across
requests. Streaming cache/multicast optimization is **not implemented**.

Retrieval query, ownership filters, embedding model/vector space, top-k, and
context budget are unchanged. No index changes, model replacement, or quality
improvement are claimed. Validate answer quality/truncation before tuning tokens
or context further.

## 4. How to collect genuine production after metrics

1. Review/isolate changes from pre-existing uncommitted RAG performance and
   ingestion work. Do not deploy the entire dirty checkout blindly.
2. Deploy matching RAG streaming endpoint, async SQLAlchemy dependency/lockfile,
   and web changes. Verify function duration and proxy flushing.
3. Canary-enable server variable `RAG_CHAT_STREAM_ENABLED=true` only after the
   RAG endpoint exists. Default false retains JSON behavior for rollback.
4. Capture new RAG `chat_metrics` logs for representative synthetic/approved
   requests with the same models, course sizes, question set, concurrency,
   and separate cold/warm cohorts.
5. Report outcome percentages including `ok`, `incomplete`, `rag_timeout`,
   provider failures, and cancellations; do not count SSE HTTP 200 as success.
6. Report backend and Next first-token/completion p50/p95 separately. Successful
   request timings alone exclude failures and are not an end-to-end SLO.
7. Review correctness, citations, output length/truncation, concurrency, and
   cost. A smaller token ceiling can reduce completeness.

Commands from `rag/canvas-ai-assistant`:

```sh
uv run --locked python -m scripts.report_chat_metrics before-http.jsonl --source http
uv run --locked python -m scripts.report_chat_metrics after-rag-runtime.jsonl --source stream
```

Collector deduplicates request IDs, keeps failure outcomes distinct, and reports
unavailable metrics as null rather than zero.

## 5. Validation and remaining work

Automated coverage includes fragmented UTF-8/SSE, auth/course isolation,
deadline propagation, partial output, Stop, navigation, malformed/blocked output,
truncation, no automatic retry after text, stream flushing, provider cancellation,
and metrics classification.

Validation update: Docker 29.9.2 is running. Against a fresh, disposable
`pgvector/pgvector:pg17` container, **all 299 RAG tests passed with zero skips**,
including async query/vector mapping, private/shared owner isolation, module
filtering, and cancellation followed by connection-pool recovery. The container
was removed afterward; no production database was used.
Full RAG coverage gate passed at **83.95%** (minimum 80%).

269 frontend tests, typecheck and lint passed again; frontend build passed in the
earlier validation. RAG production Docker image build passed. Ruff passes for
changed streaming files. Existing Starlette TestClient deprecation warning
remains. Core durable queue files were compared byte-for-byte with the deployed
queue snapshot and match, avoiding an ingestion endpoint rollback on merge.

Reproduce from the RAG repository:

```sh
uv run --locked python -m scripts.validate_chat_database
```

Still pending:

- Production canary and before/after traffic comparison.
- Authenticated browser checks, including reading without forced scrolling.
- Live model latency, grounding-quality/recall, and cost benchmarks.
- First-token UX targets (p50 ≤3 s / p95 ≤8 s) are goals, not measured results.
