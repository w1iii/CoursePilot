"""Compare duplicate coverage vs plain compatibility tests on this local runtime."""
import json
import platform
import statistics
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    samples = []
    with tempfile.TemporaryDirectory(prefix="coursepilot-ci-benchmark-") as temporary:
        for pair in range(1, 4):
            # Alternate order to reduce warm-up/order bias. Existing npm cache stays warm.
            variants = ["coverage", "plain"] if pair % 2 else ["plain", "coverage"]
            for variant in variants:
                report = Path(temporary) / f"{pair}-{variant}.json"
                command = ["npm", "test", "--", "--reporter=json", f"--outputFile={report}"]
                if variant == "coverage":
                    command += ["--coverage", f"--coverage.reportsDirectory={temporary}/coverage"]
                started = time.perf_counter()
                result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
                elapsed = time.perf_counter() - started
                if result.returncode:
                    raise RuntimeError(f"{variant} failed; benchmark invalid:\n{result.stderr[-2000:]}")
                data = json.loads(report.read_text())
                if not data["success"] or data["numFailedTests"] or not data["numPassedTests"]:
                    raise RuntimeError("Test report did not confirm a successful non-empty suite")
                samples.append({"pair": pair, "variant": variant, "seconds": round(elapsed, 4),
                                "passed_tests": data["numPassedTests"],
                                "total_tests": data["numTotalTests"],
                                "pending_tests": data["numPendingTests"], "exit_code": result.returncode})
                print(f"{pair} {variant}: {elapsed:.3f}s; {data['numPassedTests']} tests passed", flush=True)
    counts = {(s["passed_tests"], s["total_tests"], s["pending_tests"]) for s in samples}
    if len(counts) != 1:
        raise RuntimeError("Suite counts changed between variants; comparison invalid")
    medians = {v: statistics.median(s["seconds"] for s in samples if s["variant"] == v)
               for v in ["coverage", "plain"]}
    output = {"measured_at": datetime.now(timezone.utc).isoformat(),
              "scope": "Local test-step comparison only; not hosted CI or full pipeline speedup",
              "platform": platform.platform(),
              "node": subprocess.check_output(["node", "--version"], text=True).strip(),
              "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
              "working_tree": "Includes uncommitted DevOps tooling/workflow changes",
              "commands": {"coverage": "npm test -- --coverage --reporter=json --outputFile=<temp>/report.json --coverage.reportsDirectory=<temp>/coverage",
                           "plain": "npm test -- --reporter=json --outputFile=<temp>/report.json"},
              "samples": samples, "median_seconds": medians,
              "reduction_percent": round(100 * (1 - medians["plain"] / medians["coverage"]), 2)}
    destination = ROOT / "docs/devops/evidence/test-step-benchmark.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, indent=2) + "\n")


if __name__ == "__main__":
    main()
