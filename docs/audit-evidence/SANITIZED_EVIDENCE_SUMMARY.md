# Public-safe verification summary

**Purpose:** alternate allowlisted view of existing audit evidence. It avoids local usernames/absolute paths, platform/service IDs, personal records, prompts, credentials and raw platform exports. This is not new testing or new deployment verification.

## Audit results

| Check | Result at 27 November 2026 audit |
|---|---|
| Web unit/component suite | 370 passed in 65 files |
| Smoke-script unit tests | 3 passed |
| Web lint/typecheck/build | Passed |
| Default web line coverage | 63.27%, library-only scope |
| Local backend suite | 386 passed, 9 database tests skipped; 84.35% coverage |
| Remote backend CI | 395 passed; 85.18% coverage |
| Remote web CI | Node 22/26 plus disposable study database contract job passed |
| Local npm audit | Zero reported advisories at capture |
| Offline transport fixture | 20 buffered + 20 streaming; 100% protocol success each |
| Model-quality evaluation | Not executed; [evaluation plan](../ai-evaluation/PLAN.md) |

Source references: [CI extracted summaries](ci-test-summaries.json), [web CI run](https://github.com/w1iii/CoursePilot/actions/runs/45988132144), [private backend CI run](https://github.com/w1iii/CoursePilot-RAG/actions/runs/45988114364), [readable transport benchmark](offline-stream-benchmark.md). Repeated checks are not additive; software tests are not evaluated model answers.

Frontend READY metadata and backend deployment-success metadata were observed in the original audit. Those observations do not verify current worker identity, live acceptance or current database grants. Historical encrypted staging restore evidence does not establish complete current production recovery.

## Sanitization method for further evidence

1. Keep original logs/screenshots/backups in owner-controlled restricted storage.
2. Export only approved fields: evidence ID, date, check name, result, counts, relevant code revision and limitations.
3. Remove keys/tokens/cookies, connection strings, signed download URLs, student names/emails/content, account IDs, local paths and unnecessary infrastructure identifiers. Do not hash low-entropy personal data and call it anonymous.
4. Replace identities consistently with synthetic labels; use genuine synthetic datasets where possible.
5. For screenshots/PDFs, apply irreversible redaction, remove sensitive metadata/hidden text, render/extract and inspect again. Covering text with a visible shape is insufficient.
6. Run available credential-pattern checks plus manual review of text/images and document properties. Automated checks are not exhaustive.
7. Record transformations, evidence date/scope and reviewer; retain a hash of the sanitized file. Original-to-sanitized mapping stays private.
8. Publish only approved summaries and consented examples. Never reinterpret a sanitized summary as proof of checks not performed.

Previously packaged raw audit records are historical files and are **not removed or rewritten** by this summary. This document does not retroactively sanitize external recordings or change already published copies.

## Owner-supplied demo

[Demo/recording folder](https://drive.google.com/drive/folders/1VEZ6SPDRTdkM5OcgxcBJ1wLIfodFx_0t?usp=sharing).

Link supplied by owner. Automated fetch did not expose usable recording contents, so public/panel access, recording contents, continuity and absence of edits remain **Not Verified**. Folder link is not proof that a direct playable video or deployment challenge exists. Owner must verify permissions and select the intended video before submission.
