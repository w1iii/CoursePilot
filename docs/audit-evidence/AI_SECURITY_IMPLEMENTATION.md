# Prompt-injection and hallucination risk controls

**Scope:** inspected implementation and synthetic tests at audited revisions. Controls **mitigate risk; they do not eliminate prompt injection or hallucination**. No live red-team success rate or factual-accuracy benchmark was measured.

## Prompt-injection controls

| Implementation | Evidence |
|---|---|
| Treat focus/source text as untrusted JSON; reject embedded role changes; instruct model not to reveal prompts/credentials | [Study prompt construction and provider call, lines 276–349](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/api/study_prep.py#L276-L349) |
| Validate topic length/control characters before dispatch and again in worker | [Web focus validator](../../src/lib/study-focus.ts) · [Worker](../../src/lib/job-worker.ts) |
| Require validated output independent of natural-language instructions | [Study output validation](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/api/study_prep.py#L134-L202) |
| Validate supporting focus quotes against selected source snippets | [Focus validator](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/security/study_focus.py) |
| Constrain data access before model execution with user/course/action claims | [Token verification](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/security/tokens.py) |

Input character/length restrictions are not semantic injection detection. HMAC authorization protects scope, not truthfulness. Prompt instructions alone are not a security boundary.

## Hallucination / provenance controls

- [Chat prompt](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/rag/prompts.py): course-subject boundary, course-source citations, explicit general-knowledge/search fallback labeling.
- [Scoped retrieval](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/vectorstore/retriever.py): selected course/owner/module constraints.
- [Study API](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/api/study_prep.py): item count/type/options/citation-ID validation; focused requests require source quote evidence; unsupported focus yields 422.
- [Web worker](../../src/lib/job-worker.ts): rechecks grounding/count/citation presence before transactional persistence.
- [Streaming budget](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/app/rag/chat_stream.py): bounds resource use and answer length, not factual accuracy.

`grounded=bool(chunks)` indicates retrieved evidence availability, not measured faithfulness. A known citation ID or verbatim quote does not prove every generated claim follows from it. Chat can answer using labeled fallback when indexed evidence is absent. Buffered frontend currently drops `web_sources` while streaming preserves them; see [adapter](../../src/lib/ai/rag.ts).

## Synthetic test evidence

- [Study input/focus tests](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/tests/test_study_input_validation.py)
- [Study output tests](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/tests/test_study_prep.py)
- [Generation deadline tests](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/tests/test_study_generation_deadlines.py)
- [Actual CI counts](ci-test-summaries.json) · [Local pytest log](rag-pytest.log)

Private backend links require panel repository permission. No secret values or student data are included. Next step: representative adversarial/factuality evaluation with consented synthetic/held-out inputs and explicit denominators.
