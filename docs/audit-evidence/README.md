# CoursePilot audit evidence — 27 November 2026

## Revised handoff supporting evidence

- [Revised template-based handoff](../FINAL_TECHNICAL_HANDOFF_REVISED.md) ·
  [PDF](../FINAL_TECHNICAL_HANDOFF_REVISED.pdf) · [Word](../FINAL_TECHNICAL_HANDOFF_REVISED.docx)
- [Readable benchmark report](offline-stream-benchmark.md) ·
  [raw observations](offline-stream-benchmark.log)
- [Prompt-injection/hallucination controls and implementation/tests](AI_SECURITY_IMPLEMENTATION.md)
- [Owner-supplied schema/ERD](SCHEMA_CONTEXT.md) · [non-executable contextual SQL](USER_PROVIDED_SCHEMA_CONTEXT.sql)
- [Packaging provenance](packaging-provenance.json) · [Revised rendering record](revised-render.json)

These files are now packaged inside CoursePilot repository. New online URLs
require commit/merge/push; no publication was performed. Original audit records
below are copied unchanged from workspace `docs/audit-evidence/`.
In particular, `final-integrity.json` certifies the **earlier** application
snapshot, not clean Git status after authorized README/docs edits. Original
`document-validation.json` and `pdf-render.json` describe the original handoff,
not the revised template-based handoff. See `revised-validation.json` for revision.

Supporting material for [system review](../SYSTEM_REVIEW.md) and [handoff](../FINAL_TECHNICAL_HANDOFF.md).

| Record | Meaning |
|---|---|
| `baseline.json` | Local HEAD/tree, clean status, tracked-file SHA-256, resolved dependencies, verification tool versions |
| `source-inventory.json` | Extracted routes, history, imports, available tools and environment-file history metadata |
| `github.json` | Read-only repository/branch/PR/review/run/job/deployment snapshot |
| `platforms.json` | Sanitized Vercel production deployment/alias metadata |
| `metrics-and-history.json` | CI success denominators and source-tree comparison; empty historical `.env` blob findings |
| `remote-tags.json` | Both repository tag lists empty at final verification |
| `ci-test-summaries.json` | Selected test/audit summary text extracted from latest main CI logs |
| `web-*.json`, `rag-*.json` | Command, isolated working directory, start time, exit code and wall time |
| Corresponding `.log` files | Local command results; fixtures/synthetic configuration, not production acceptance |
| `offline-stream-benchmark.log` | 20 buffered + 20 streaming fixture observations and summary; not live provider metrics |
| `docker-local-images.*` | Unavailable local Docker daemon; local DB tests not run |
| `template-access.json` | Successful text export, failed direct binary downloads, exact-layout/copy limitations |
| `render_handoff.py`, `pdf-render.json` | Reproducible local PDF renderer and typography/page/link checks |
| `document-validation.json` | Final heading/diagram/link checks and visual-review status |
| `final-integrity.json` | Final comparison with baseline; original source freeze verification |

**Evidence limits:** private RAG links require permission. Relative links require accompanying repository files. Current platform secrets, private user records and real credential values are excluded. No live AI inference, production mutation or publication was performed. Passing fixtures, CI or deployment metadata does not establish authenticated production behavior.

Original renderer `render_handoff.py` is retained as historical tooling; do not
use it to overwrite revised output. Revised renderer:
`python3 coursepilot/docs/audit-evidence/prepare_revision.py` from the setup
root, using supplied Word template and existing libraries. `--package` is
one-time packaging and refuses existing destinations. Revised PDF uses HTTPS
GitHub links, not local-file actions. DOCX uses template geometry/styles and all
ten headings; PDF is content-equivalent, not rendered by Word/LibreOffice.
Inspect DOCX pagination in Word before submitting. Google sharing remains pending.
