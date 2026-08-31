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

"""Pytest suite for Golden Campaign Dataset and E2E evaluation."""

import json
from pathlib import Path

import pytest

from tests.eval.e2e_campaign_evaluator import run_evaluation_suite


def test_golden_dataset_syntax():
    """Verifies the golden campaigns dataset exists and has valid structure."""
    dataset_path = Path(__file__).parent / "datasets" / "golden_campaigns.json"
    assert dataset_path.exists(), "golden_campaigns.json does not exist"

    with open(dataset_path, encoding="utf-8") as f:
        data = json.load(f)

    scenarios = data.get("scenarios", [])
    assert len(scenarios) == 9, f"Expected 9 scenarios, found {len(scenarios)}"

    categories = [s["category"] for s in scenarios]
    assert categories.count("flagship") == 4
    assert categories.count("edge_case") == 3
    assert categories.count("guardrail_probe") == 2


@pytest.mark.eval
@pytest.mark.asyncio
async def test_e2e_golden_evaluation_gate():
    """Runs the full in-process E2E evaluation suite and asserts gate pass."""
    report = await run_evaluation_suite()

    assert report.total_scenarios == 9
    assert report.schema_conformance_rate == 100.0, (
        f"Schema conformance failed: {report.schema_conformance_rate}%"
    )
    assert report.budget_conservation_rate == 100.0, (
        f"Budget conservation failed: {report.budget_conservation_rate}%"
    )
    assert report.failed_scenarios == 0, f"{report.failed_scenarios} scenarios failed"
    assert report.average_llm_score >= 4.0, (
        f"Average LLM score below 4.0: {report.average_llm_score}"
    )
    assert report.gate_passed is True
