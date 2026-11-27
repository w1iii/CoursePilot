# Release identification and sign-off

Owner: `w1iii`. The owner selected `v1.0.0` for the paired source/documentation release on 27 November 2026. This identifier does not establish a new deployment or academic submission.

## Release identity

| Component | Source baseline inspected before documentation completion | Final source reference |
|---|---|---|
| Web / application worker | `e20603876b781f76ba6b068d66af2ec7d2471bdf` plus reviewed documentation/workflow changes | [Web v1.0.0](https://github.com/w1iii/CoursePilot/tree/v1.0.0) |
| RAG API / ingestion worker | `e07920eb547a99d8ed3702b4302e163f325cec53` plus documentation changes | [RAG v1.0.0](https://github.com/w1iii/CoursePilot-RAG/tree/v1.0.0) |
| Version/date | Paired source/documentation release | `v1.0.0` / 2026-11-27 |

Pre-publication tag checks returned empty local and remote lists. Annotated `v1.0.0` tags identify the reviewed release commits; annotations record both repositories' full SHAs. The release operator confirms remote main/tag refs after push.

## Release record fields

Complete the following in a dated release record after selection:

| Field | Value to record |
|---|---|
| Release version and UTC date | Approved version/date |
| Web and RAG full commits | Exact reviewed SHAs |
| GitHub tag/release URLs | Published URLs for each repository |
| Web deployment | Project, environment, deployment ID, alias, SHA |
| RAG API and both workers | Service/environment, deployment/image IDs, SHA |
| Database contracts | Application and RAG migration versions and reviewed changes |
| Test/security evidence | Exact CI attempts, conclusions, scopes and sanitized artifacts |
| Acceptance and recovery | Synthetic journey/isolation, backup/restore references, compatible rollback targets |
| Decisions | Approver, exceptions, residual limitations and responder |

## Approval sequence

1. Inspect local changes and preserve unrelated work; select reviewed commits in both repositories.
2. Run intended CI/security checks on the exact revisions. Confirm platform promotion cannot bypass the intended approval path.
3. Complete applicable [verification checks](VERIFICATION_REGISTER.md) and [runbook gates](devops/DEPLOYMENT_ROLLBACK.md).
4. Set each changelog heading to the approved version/date without claiming changes outside that release.
5. With owner authorization, publish annotated tags/releases in both repositories. Record which paired version each component expects.
6. Deploy through approved platform controls, then record actual component identities and acceptance results.
7. Test README/handoff links and private-backend permissions as a reviewer. Confirm shared Google Doc and recording access.
8. Owner submits approved artifacts and retains the submission receipt.

Tags and application deployments do not apply SQL migrations automatically, certify model quality, establish reviewer access or prove submission.
