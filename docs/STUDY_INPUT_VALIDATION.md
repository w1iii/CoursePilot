# Study input validation

## Optional focus

- Browser, web API, worker and RAG validate text type, 300 UTF-16 units, NFC
  normalization, unsafe controls, and obvious role/override instructions.
  Blank/whitespace is still optional. Formulas, single-letter topics and
  multilingual text remain allowed; scientific superscripts are not flattened.
- Random-looking keyboard/repeated text receives an advisory, not a universal
  hard rejection. Those strings can be valid course content (keyboard layouts,
  biological sequences). Arbitrary gibberish cannot be reliably classified by
  character statistics or a blacklist.
- RAG checks relevance **inside the existing generation call**; no extra model
  call is added. A focused response requires `focus_supported=true` and actual
  quoted evidence from the exact source snippets supplied to the model.
  Unsupported topics return controlled 422 `study_focus_unsupported`, without
  retrying every fallback model. Malformed/missing evidence fails validation and
  can use the existing bounded fallback chain. Blank-focus packs need no new
  output fields.
- Relevance is model-assisted, not mathematical proof of semantic support.
  Quote checks prove the cited text exists, not that every interpretation is
  correct. Prompt-injection detection is defense in depth, never authorization.
- Focus and source text are JSON-encoded as untrusted data. System instructions
  forbid role changes, schema/count/mode overrides, external facts and prompt/
  secret disclosure. Existing owner checks and citation validation remain.

Fast invalid inputs fail before enqueue/quota. Semantic checks run in the
background and therefore consume an accepted generation attempt; users receive
an actionable job error and can edit/clear focus. No silent whole-course fallback.

## Other fields and answers

- Existing course ownership/index checks, one/two distinct safe-integer modules,
  1–15 integer item count, mode/difficulty allowlists, bounded JSON bodies and
  unknown-field rejection remain enforced.
- RAG no longer coerces strings, booleans or floats to count/module IDs; IDs are
  bounded to JavaScript-safe integers. Course keys reject invalid characters.
- Multiple-choice output options must be distinct (case remains significant).
- Migration `202611270004_study_answer_validation.sql` validates membership of
  submitted quiz choices and nonblank written answers inside the existing
  owner-fenced, atomic answer/score transaction. Unsafe controls are rejected.
  Flashcard self-grading with an empty written answer remains valid.
- Browser errors preserve inputs. Invalid answers reopen editing rather than
  offering an endless retry of the same invalid payload.

## Validation / release

Run web tests, typecheck/lint/build, `npm run test:study-db`, and RAG tests/CI.
The database script includes synthetic rollback tests for migration 004.

Release in order: reviewed RAG API → app migration 004 → matching web/app worker.
No model choices, fallback order, existing progress, or production data should be
changed as part of this validation feature. Authenticate after rollout and test
valid/blank focus, unrelated focus, unsupported text, meaningful short/formula/
multilingual focus, invalid quiz options and whitespace-only written answers.
