import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from collect_metrics import export, row, seconds


class MetricsTests(unittest.TestCase):
    def test_missing_and_invalid_intervals(self):
        self.assertIsNone(seconds(None, None))
        self.assertIsNone(seconds("0001-01-01T00:00:00Z", "2026-11-27T00:00:00Z"))
        self.assertIsNone(seconds("2026-11-27T00:00:02Z", "2026-11-27T00:00:01Z"))
        self.assertEqual(seconds("2026-11-27T00:00:00Z", "2026-11-27T00:00:02Z"), 2)

    def test_parallel_jobs_not_mistaken_for_wall_clock(self):
        run = dict(databaseId=1, attempt=1, workflowName="CI", event="push",
                   headSha="abc", conclusion="success", url="https://example.test",
                   createdAt="2026-11-27T00:00:00Z", jobs=[
                       dict(status="completed", startedAt="2026-11-27T00:00:02Z",
                            completedAt="2026-11-27T00:00:12Z"),
                       dict(status="completed", startedAt="2026-11-27T00:00:03Z",
                            completedAt="2026-11-27T00:00:08Z"),
                       dict(status="completed", startedAt=None, completedAt=None),
                   ])
        result = row(run)
        self.assertEqual(result["initial_queue_seconds"], 2)
        self.assertEqual(result["execution_span_seconds"], 10)
        self.assertEqual(result["total_job_seconds"], 15)
        self.assertEqual(result["job_count"], 2)

    def test_no_jobs_does_not_claim_measured_duration(self):
        result = row(dict(databaseId=1, attempt=1, workflowName="CI", event="push",
                          headSha="abc", conclusion="cancelled", url="",
                          createdAt="2026-11-27T00:00:00Z", jobs=[]))
        self.assertIsNone(result["execution_span_seconds"])
        self.assertIsNone(result["initial_queue_seconds"])

    def test_export_keeps_failures_filters_running_and_pins_attempt(self):
        completed = dict(databaseId=7, attempt=2, workflowName="CI", event="push",
                         headSha="abc", conclusion="failure", status="completed",
                         url="https://example.test/7", createdAt="2026-11-27T00:00:00Z")
        with tempfile.TemporaryDirectory() as temporary:
            with patch("collect_metrics.gh", side_effect=[
                [completed, {**completed, "databaseId": 8, "status": "in_progress"}],
                {"jobs": []},
            ]) as mocked:
                export("owner/repo", 40, Path(temporary))
            self.assertIn("--attempt", mocked.call_args_list[1].args)
            self.assertIn("2", mocked.call_args_list[1].args)
            raw = json.loads((Path(temporary) / "github-runs.json").read_text())
            rows = list(csv.DictReader((Path(temporary) / "PIPELINE_METRICS.csv").read_text().splitlines()))
            self.assertEqual(len(raw["runs"]), 1)
            self.assertEqual(rows[0]["conclusion"], "failure")
            self.assertEqual(rows[0]["execution_span_seconds"], "")

    def test_empty_selection_refuses_to_generate_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "output"
            with patch("collect_metrics.gh", return_value=[]):
                with self.assertRaisesRegex(RuntimeError, "No completed CI runs"):
                    export("owner/repo", 40, destination)
            self.assertFalse(destination.exists())

    def test_failed_fetch_does_not_write_partial_evidence(self):
        run = dict(databaseId=7, attempt=1, status="completed")
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "output"
            with patch("collect_metrics.gh", side_effect=[[run], RuntimeError("fetch failed")]):
                with self.assertRaisesRegex(RuntimeError, "fetch failed"):
                    export("owner/repo", 40, destination)
            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
