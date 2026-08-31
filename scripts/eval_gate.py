#!/usr/bin/env python3
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""CI/CD Deployment Quality Gate script.

Executes multi-agent evaluations against local or deployed Staging environments,
verifies strict pass/fail criteria (Schema, Budget, LLM Judge Score),
archives reports to Google Cloud Storage, and exits with 0 on pass or 1 on fail.
"""

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

from tests.eval.e2e_campaign_evaluator import (
    OverallEvalReport,
    run_evaluation_suite,
    write_reports,
)

logger = logging.getLogger("eval_gate")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def upload_reports_to_gcs(
    json_path: Path,
    html_path: Path,
    logs_bucket: str,
    timestamp: str,
) -> bool:
    """Uploads generated JSON and HTML evaluation reports to Google Cloud Storage.

    Args:
        json_path: Path to the generated JSON results file.
        html_path: Path to the generated HTML report file.
        logs_bucket: GCS bucket name (without gs:// prefix).
        timestamp: Execution timestamp string.

    Returns:
        True if upload succeeded, False otherwise.
    """
    destination_dir = f"gs://{logs_bucket}/eval-results/results-{timestamp}"
    logger.info("Archiving evaluation reports to GCS: %s", destination_dir)

    try:
        cmd = [
            "gsutil",
            "-m",
            "cp",
            str(json_path),
            str(html_path),
            f"{destination_dir}/",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info("Upload completed successfully: %s", res.stdout.strip())
        print(
            "_________________________________________________________________________"
        )
        print(f"Evaluation reports archived to {destination_dir}")
        print(
            f"GCS Console:"
            f" https://console.cloud.google.com/storage/browser/{logs_bucket}/eval-results/results-{timestamp}"
        )
        print(
            "_________________________________________________________________________"
        )
        return True
    except Exception as err:
        logger.error("Failed to upload evaluation reports to GCS: %s", err)
        return False


def verify_quality_gate(
    report: OverallEvalReport,
    min_score: float = 4.0,
    max_regression: float = 0.2,
    baseline_path: str | None = None,
) -> tuple[bool, str]:
    """Checks if the evaluation report meets all criteria for deployment promotion.

    Args:
        report: The evaluation report to inspect.
        min_score: Minimum allowed average LLM score (default 4.0 / 5.0).
        max_regression: Maximum allowed score regression vs baseline (default 0.2).
        baseline_path: Path to baseline JSON report file, if available.

    Returns:
        Tuple of (passed: bool, message: str).
    """
    # P0 Criteria: Strict Zero-Tolerance
    if report.schema_conformance_rate < 100.0:
        return (
            False,
            f"P0 Blocker: Schema conformance is {report.schema_conformance_rate}%"
            " (100% required).",
        )

    if report.budget_conservation_rate < 100.0:
        return (
            False,
            f"P0 Blocker: Budget conservation rate is"
            f" {report.budget_conservation_rate}% (100% required).",
        )

    if report.failed_scenarios > 0:
        return (
            False,
            f"P0 Blocker: {report.failed_scenarios} scenarios failed execution.",
        )

    # P1 Criteria: LLM-as-a-Judge Threshold
    if report.average_llm_score < min_score:
        return (
            False,
            f"P1 Blocker: Average LLM Judge score is {report.average_llm_score} <"
            f" required minimum {min_score} / 5.0.",
        )

    # Regression Check
    if baseline_path and os.path.exists(baseline_path):
        try:
            with open(baseline_path, encoding="utf-8") as f:
                baseline_data = json.load(f)
            baseline_avg = float(baseline_data.get("average_llm_score", min_score))
            regression = baseline_avg - report.average_llm_score
            if regression > max_regression:
                return (
                    False,
                    f"P1 Blocker: Quality regression detected: {regression:.2f} points"
                    f" dropped from baseline {baseline_avg:.2f} (max allowed:"
                    f" {max_regression:.2f}).",
                )
            logger.info(
                "Regression check passed: Baseline=%.2f, Current=%.2f, Diff=%.2f",
                baseline_avg,
                report.average_llm_score,
                -regression,
            )
        except Exception as e:
            logger.warning("Could not parse baseline file '%s': %s", baseline_path, e)

    return (
        True,
        f"All quality criteria satisfied! Average score:"
        f" {report.average_llm_score}/5.0, 100% Schema & Budget.",
    )


def main() -> None:
    """Main entrypoint for CI/CD Quality Gate."""
    parser = argparse.ArgumentParser(
        description="Run CI/CD deployment quality gate evaluation."
    )
    parser.add_argument(
        "--staging-url",
        type=str,
        default=None,
        help="Deployed Staging Cloud Run base URL (runs in-process if omitted).",
    )
    parser.add_argument(
        "--id-token",
        type=str,
        default=None,
        help="Google Cloud ID Token for authenticating against staging.",
    )
    parser.add_argument(
        "--logs-bucket",
        type=str,
        default=None,
        help="GCS bucket name to archive evaluation results.",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path to golden campaigns JSON dataset.",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=4.0,
        help="Minimum average LLM judge score to pass gate (default: 4.0).",
    )
    parser.add_argument(
        "--max-regression",
        type=float,
        default=0.2,
        help="Maximum allowed drop from baseline (default: 0.2).",
    )
    parser.add_argument(
        "--baseline-file",
        type=str,
        default=None,
        help="Optional baseline JSON results file to check regression against.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="artifacts/eval_results",
        help="Directory to save evaluation reports.",
    )

    args = parser.parse_args()

    auth_token = args.id_token or os.getenv("ID_TOKEN", "eval-marketer-token")
    staging_url = args.staging_url or os.getenv("STAGING_URL")
    logs_bucket = args.logs_bucket or os.getenv("LOGS_BUCKET_NAME_STAGING")

    logger.info("Starting CI/CD Evaluation Quality Gate...")
    if staging_url:
        logger.info("Target Environment: Remote Staging URL (%s)", staging_url)
    else:
        logger.info("Target Environment: Local In-Process ASGI Application")

    # Step 1: Run E2E Evaluation Suite
    report = asyncio.run(
        run_evaluation_suite(
            base_url=staging_url,
            dataset_path=args.dataset,
            auth_token=auth_token,
        )
    )

    # Step 2: Write local report files
    output_dir = Path(args.output_dir)
    json_path, html_path = write_reports(report, output_dir)
    logger.info("Local reports written: JSON=%s, HTML=%s", json_path, html_path)

    # Step 3: Archive to GCS if logs_bucket configured
    if logs_bucket:
        upload_reports_to_gcs(json_path, html_path, logs_bucket, report.timestamp)

    # Step 4: Quality Gate Decision
    gate_passed, decision_message = verify_quality_gate(
        report=report,
        min_score=args.min_score,
        max_regression=args.max_regression,
        baseline_path=args.baseline_file,
    )

    print("\n" + "=" * 70)
    print(f"DEPLOYMENT QUALITY GATE: {'[PASSED]' if gate_passed else '[BLOCKED]'}")
    print(f"Verdict: {decision_message}")
    print(f"Total Scenarios:     {report.total_scenarios}")
    print(f"Passed Scenarios:    {report.passed_scenarios}")
    print(f"Failed Scenarios:    {report.failed_scenarios}")
    print(f"Schema Conformance:  {report.schema_conformance_rate}%")
    print(f"Budget Conservation: {report.budget_conservation_rate}%")
    print(f"Average LLM Score:   {report.average_llm_score} / 5.0")
    print("=" * 70 + "\n")

    if not gate_passed:
        logger.error("Quality Gate failed! Blocking production promotion.")
        sys.exit(1)

    logger.info("Quality Gate passed! Safe for production promotion.")
    sys.exit(0)


if __name__ == "__main__":
    main()
