# Beta operations and rollback

## Ownership and notification

- Release owner and initial support contact: GitHub account `w1iii`. Confirm a separate user-facing support contact before invitations.
- Monitoring: GitHub Actions **Beta availability** checks the public production frontend and the Railway staging RAG health endpoint every 15 minutes. RAG health includes its database connection. An existing RAG repository workflow also checks staging health.
- GitHub Actions failure notifications and email depend on the owner's GitHub watch and notification preferences. Confirm both channels receive an actual failure; a successful workflow run does not establish delivery.
- This workflow does **not** check Supabase health, authenticate a user, verify data isolation, or prove end-to-end function. Configure separate Supabase monitoring and synthetic-user tests before beta.

### Test notifications safely

After this workflow is merged to the default branch, use GitHub Actions > Beta availability > Run workflow and select `simulate_failure`. This intentionally fails the job without contacting or changing live services. Confirm GitHub and email delivery to `w1iii`, capture the run URL and delivery times in the release record, and clear the test incident. If email does not arrive, review GitHub notification settings and email verification. Do not mark alert delivery verified until observed.

## Recorded state — 2026-11-19

This is an inventory, not proof of rollback readiness or end-to-end correctness. Reconfirm current IDs and environments before every release.

| Resource | Deployment | Observed state |
| --- | --- | --- |
| Vercel `course-pilot` production | `dpl_GgGWpJRnwjQDbyKwCppcxPQTkCTi` (`29cd2f8`) | Ready; public root HTTP 200 |
| Railway staging `coursepilot-rag` | `02d1af79-a326-4ae5-b925-f5df5727140b` | Success; health database connected |
| Railway staging `coursepilot-rag-db` | `dbe447f9-f75f-4a03-a6c8-d8a598792f26` | Success |
| Railway production `CoursePilot-RAG` | `e2db1c43-0657-42d3-9ccd-8632f0c9be60` | Failed; do not use as rollback target |

The deployed frontend was previously configured to use staging RAG temporarily; Vercel hides current values. Treat the staging RAG database as production data. Do not reset or restore it over live data.

## Pre-release gates

- Verified, restorable backups for Supabase and Railway RAG; current backup status is unverified.
- Local/test environments cannot write to production.
- Exact release commit passes CI, audits, database integration and security checks.
- Beta URL, dedicated Clerk instance, invitation policy and target databases verified.
- Two synthetic users pass isolation tests; authorized Canvas sync, RAG retrieval and study prep succeed.
- Alert delivery and a safe rollback rehearsal have been documented. No beta invitations until all gates pass.

## First 15 minutes after release

1. Confirm deployment IDs, release commit and health; check GitHub Actions and Vercel/Railway logs for errors without recording secrets.
2. Sign in with an authorized synthetic account; verify uninvited access is denied.
3. Check course and module listing, run an authorized Canvas sync, ask a RAG question and generate a study pack.
4. Use a second synthetic account to verify cross-user data remains inaccessible.
5. Record results, latency, errors and ownership; halt rollout if a critical check fails.

## Rollback — rehearsal required

1. Stop rollout; record time, issue, current and last verified-good deployment IDs, and any schema or environment changes.
2. Confirm the target belongs to the correct project/environment and is compatible with the current schema and environment. On Vercel, promote the recorded verified-good deployment using `vercel promote <deployment-id>`; verify aliases and health afterward.
3. For Railway, use the dashboard's deployment rollback/redeploy operation for the **specific** verified-good service and deployment after checking its image and environment. `railway redeploy` without a deployment ID redeploys the latest deployment, not necessarily the desired earlier one. Do not modify the database service or volume.
4. Verify health, sign-in and a read-only retrieval smoke test; notify the release owner and users.
5. Never restore a database over live data as an automatic rollback. If corruption is suspected, stop writes and use a separately approved, tested recovery procedure.

Rehearse against an isolated preview/service first. Current deployment IDs above are not evidence that a rollback rehearsal succeeded.
