# Incident and drill log

Retrospective register compiled 27 November 2026. Dates/times are UTC unless only
a source date exists. Missing timestamps remain unknown. Impact classifications
below describe evidence, not a previously approved severity policy.

| ID | Kind / impact | Recorded date | State | Evidence / postmortem |
| --- | --- | --- | --- | --- |
| CI-20261118 | CI security gate blocked two runs; no production outage demonstrated | 17–18 Nov 2026 | Subsequent green CI observed; exact remediation attribution unverified | [Postmortem](incidents/CI-20261118.md); raw CI metadata |
| DRILL-20261119 | Intentional alert-delivery exercise; no service/data changes | 19 Nov 2026, 03:18:47–03:18:54 | Drill completed; owner reported GitHub/email receipt, delivery timestamps unknown | [Postmortem](incidents/DRILL-20261119.md); [run metadata](evidence/alert-drill-44450542468.json) |
| REL-20261127 | Standalone worker cache defect during release smoke validation; student impact unverified | 27 Nov 2026; exact time unknown | Source records fix and successful synthetic rechecks; not independently replayed | [Postmortem](incidents/REL-20261127.md); [release record](../BACKGROUND_JOBS_RELEASE_20261127.md) |

## New incident procedure

1. Record detection UTC, reporter, symptoms, environment, current component
   deployment IDs, sanitized request IDs, and observed/unknown user impact.
2. Assign incident commander and communications owner; contain risk through
   [runbook](DEPLOYMENT_ROLLBACK.md). Preserve evidence without secrets/user content.
3. Maintain timestamped action log, hypothesis versus confirmed cause, decisions,
   approver, and verification results. Record exact recovery time only if observed.
4. Write blameless postmortem: summary, impact, timeline, cause/contributors,
   response, lessons, and corrective actions with owner, due date, status.
5. Review actions and confirm closure evidence. Do not label drills as outages
   or derive MTTR from workflow duration.

Owners/due dates proposed in these postmortems require owner acceptance; they are
not evidence of committed assignments or completed work.
