"""Read-only GitHub Actions metadata export. Requires authenticated gh; no logs/secrets."""
import argparse
import csv
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path


def seconds(start, end):
    if not start or not end or start.startswith("0001") or end.startswith("0001"):
        return None
    value = (datetime.fromisoformat(end.replace("Z", "+00:00"))
             - datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds()
    return value if value >= 0 else None


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args], text=True, timeout=90))


def row(run):
    jobs = [j for j in run["jobs"] if j["status"] == "completed"
            and seconds(j.get("startedAt"), j.get("completedAt")) is not None]
    starts = [j["startedAt"] for j in jobs]
    ends = [j["completedAt"] for j in jobs]
    return {
        "run_id": run["databaseId"], "attempt": run["attempt"],
        "workflow": run["workflowName"], "event": run["event"],
        "commit": run["headSha"], "conclusion": run["conclusion"],
        "created_at": run["createdAt"],
        "first_job_started_at": min(starts) if starts else "",
        "last_job_completed_at": max(ends) if ends else "",
        "initial_queue_seconds": seconds(run["createdAt"], min(starts)) if starts else None,
        "execution_span_seconds": seconds(min(starts), max(ends)) if starts else None,
        "total_job_seconds": sum(seconds(j["startedAt"], j["completedAt"]) for j in jobs),
        "job_count": len(jobs), "url": run["url"],
    }


def export(repo, limit, output):
    runs = gh("run", "list", "--repo", repo, "--workflow", "ci.yml",
              "--limit", str(limit), "--json",
              "databaseId,attempt,workflowName,event,headSha,status,conclusion,createdAt,url")
    runs = [run for run in runs if run["status"] == "completed"]

    def enrich(run):
        # Pin attempt: reruns must not silently mix timestamps from different attempts.
        details = gh("run", "view", str(run["databaseId"]), "--repo", repo,
                     "--attempt", str(run["attempt"]), "--json", "jobs")
        return {**run, "jobs": details["jobs"]}

    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(enrich, runs))
    if not records:
        raise RuntimeError("No completed CI runs found; refusing to write empty evidence.")
    output.mkdir(parents=True, exist_ok=True)
    raw = {"collected_at": datetime.now(timezone.utc).isoformat(), "repo": repo,
           "selection": f"Latest {limit} CI runs; completed only; latest attempts",
           "runs": records}
    (output / "github-runs.json").write_text(json.dumps(raw, indent=2) + "\n")
    rows = [row(run) for run in records]
    with (output / "PIPELINE_METRICS.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Exported {len(records)} completed runs to {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="w1iii/CoursePilot")
    parser.add_argument("--limit", type=int, choices=range(1, 101), default=40)
    parser.add_argument("--output", type=Path, default=Path("docs/devops/evidence"))
    args = parser.parse_args()
    export(args.repo, args.limit, args.output)
