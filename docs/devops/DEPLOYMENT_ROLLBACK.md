# Deployment and rollback runbook

Release coordination: [paired release procedure](../RELEASE.md) and
[verification register](../VERIFICATION_REGISTER.md).
Use the backend's [API/ingestion-worker runbook](https://github.com/w1iii/CoursePilot-RAG/blob/main/docs/devops/DEPLOYMENT_ROLLBACK.md)
for service-specific checks; it does not replace the coordinated procedure below.

Status: documented procedure, not a completed deployment/rollback rehearsal.
Initial release/incident contact: GitHub `w1iii`; confirm availability and name
an incident commander, communications contact, and database owner before release.
If no authorized owner is reachable, stop production changes.

## 1. Establish release identity and targets

Record web, RAG API, application worker, and ingestion-worker revisions separately.
Record migration versions, platform project/environment, candidate deployment IDs,
last verified-good compatible deployment IDs, change ticket, approver, and UTC time.
Do not assume a web CI pass covers the separately versioned RAG repository.

Historical inventory: [27 November release record](../BACKGROUND_JOBS_RELEASE_20261127.md).
It records Vercel `course-pilot` and three Railway application services. Earlier
[beta inventory](../BETA_OPERATIONS.md) includes failed production deployments and
a staging RAG endpoint used by live web traffic. These are historical references,
not current rollback targets. Reconfirm routing and ownership with authorized
platform access; treat any database serving real users as production regardless
of its environment name.

From a clean release checkout, read-only identity/check commands:

```sh
git status --short
git rev-parse HEAD
gh run list --repo w1iii/CoursePilot --workflow ci.yml --commit "$RELEASE_SHA" --limit 10
gh run list --repo w1iii/CoursePilot --workflow codeql.yml --commit "$RELEASE_SHA" --limit 10
```

Set `RELEASE_SHA` to the full reviewed web commit first. Inspect each run's exact
SHA, attempt, conclusion, and all required jobs. A passing PR merge SHA is not
automatically evidence for another production SHA.

## 2. Pre-deployment gates — all required

- [ ] Approved exact revisions; clean build context; CI/CodeQL pass; separately
      verify RAG tests, security scans, and API/queue compatibility.
- [ ] Confirm Vercel/Railway auto-deploy settings do not bypass release approval.
      Branch protection and environment approval settings must be checked live.
- [ ] Separate staging credentials/databases and synthetic accounts; no student
      data or production credentials in staging.
- [ ] Validate secret presence and web/API signing alignment without exporting
      values. Queue encryption keys match API/worker. Do not rotate keys while
      encrypted jobs remain active.
- [ ] Database owner approves exact migration SQL and affected database.
      Capture encrypted durable backups with retention/access controls and a
      successful isolated restore test. `pg_restore --list` alone is insufficient.
- [ ] Known-good app artifacts remain accessible and compatible with new schema.
- [ ] Verify alert delivery, responder coverage, and authorized maintenance window.

Any unmet gate blocks promotion. This pack does not certify these gates complete.

## 3. Stage compatible components

1. Apply only reviewed, unapplied additive migrations to isolated staging, in
   documented dependency order. Use the release's exact migration list; never
   blanket-apply historical migrations or run `supabase db push` blindly.
2. Deploy compatible RAG API/ingestion worker, then application worker, then web.
   See [background-job deployment order](../BACKGROUND_JOBS.md). Confirm workers
   use the same intended code/contracts as their corresponding API/web.
3. Configure automatic worker restarts; workers have no HTTP health endpoint.
   Verify process health, heartbeat/leases, queue age, and terminal outcomes.
4. Run read-only staging smoke through the protected `synthetic-staging`
   environment after checking its fixed hostname and synthetic cookie.
5. With explicitly authorized synthetic test data, exercise sign-in, course read,
   Canvas sync, RAG retrieval, study-pack generation, job recovery, notifications,
   and two-user isolation. Test worker restart/recovery only in isolated staging.
6. Capture revision, deployment IDs, UTC times, outcomes, and sanitized evidence.

## 4. Approved production promotion

Only authorized operator performs these actions. No command below was run when
creating this pack. Set shell variables from reviewed deployment records; never
paste secrets or unverified historical IDs into commands.

1. Approver signs off staging evidence and backup/restore readiness.
2. Apply separately approved production migrations, retaining execution evidence.
3. Deploy the same reviewed artifacts/revisions through the platform's approved
   release controls, coordinating API and workers before dependent web.
4. For Vercel, after verifying project/team/environment and candidate readiness:

   ```sh
   vercel promote "$CANDIDATE_WEB_DEPLOYMENT"
   ```

5. For Railway, select the exact project/environment/service and reviewed artifact
   in the dashboard. Verify all three application services separately. Do not
   redeploy or change the database service/volume as part of an app release.
6. Record old/new deployment IDs, resolved domains, each component's SHA/image,
   migration versions, approval, and promotion time. Ensure platform rebuilds
   have not silently changed the tested artifact or configuration.

## 5. Verify first 15 minutes

Recheck public endpoints, then authenticated synthetic acceptance. Public probes
are read-only and must target operator-confirmed URLs:

```sh
curl --fail --silent --show-error --max-time 15 --output /dev/null "$WEB_URL"
curl --fail --silent --show-error --max-time 15 "$RAG_URL/health"
```

Require RAG `status=ok` and `database=true`, correct web routing, healthy workers,
queue progress, no unexpected 5xx, and successful authorized user flows.
Inspect sanitized platform logs and request IDs. Verify user isolation and
credential redaction; HTTP 200 alone is not acceptance.

Stop rollout immediately for failed health/authentication, cross-user access,
data-integrity risk, accumulating queued work without progress, or sustained
unexpected errors. Owner defines traffic-specific error/latency thresholds before
release; none are asserted as an existing SLO here.

## 6. Roll back application release

1. Declare incident; stop further promotion. Record symptoms, current IDs,
   affected users, UTC detection time, migration changes, and request IDs.
2. Verify last-good artifacts against current schema, queue payloads, environment,
   and encryption keys. If no compatible known-good target exists, halt and
   escalate for approved forward repair rather than guessing.
3. Coordinate workers/API/web as a compatible release set. Assess queued/running
   work before pausing workers using approved platform controls; preserve jobs
   and leases. Never purge or replay production jobs blindly.
4. Restore the recorded web deployment after confirming project/team:

   ```sh
   vercel promote "$LAST_GOOD_WEB_DEPLOYMENT"
   ```

5. In Railway, select each affected application service's **specific verified-good
   deployment** and use its rollback/redeploy operation. Bare `railway redeploy`
   is not a reliable rollback to an earlier version. Verify the resulting image
   and deployment ID before resuming traffic/work.
6. Retain additive schema and queued data. No automatic down migration, table
   drop, database reset, or restore over live data. Suspected corruption requires
   database-owner approval, write containment, a separate recovery plan, and
   agreed recovery-point/data-loss assessment.
7. Recheck domains, health, authentication, read-only retrieval, worker progress,
   and isolation. Only authorized synthetic writes may validate write flows.
8. Notify owner/users with impact and recovery status. Close only when acceptance
   passes; record verification time and postmortem owner.

## 7. Evidence and rehearsal

Keep release/incident ID, approver, environment, before/after component IDs,
timestamps, migration/backup references, checks/results, rollback decision, and
sanitized evidence links. Never attach credentials, Canvas content, or database
archives to public issues.

Rehearse coordinated rollback on isolated preview services before relying on this
procedure. Record measured recovery time and database restore-test results
separately. No production rollback, recovery-time objective, durable backup
retention, or restore success is established by the historical release record.
