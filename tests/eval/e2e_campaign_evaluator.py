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

"""End-to-End Campaign Evaluator with Synthetic Marketer simulation.

Executes multi-agent DAG workflows across 10 golden scenarios with automated
human-in-the-loop (HITL) review gates and LLM-as-a-judge scoring.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field

from app.fast_api_app import app
from app.schemas.campaign import CampaignStage, CampaignStatus
from app.schemas.deliverables import (
    CampaignBriefDeliverable,
    CreativeContentDeliverable,
    MarketSensingDeliverable,
    PerformanceInsightsDeliverable,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

JUDGE_MODEL = "gemini-3.1-pro-preview"

_cached_judge_client: genai.Client | None = None


def _get_judge_client() -> genai.Client | None:
    """Initializes and caches a GenAI Client for Agent Platform or API key.

    Returns:
        Configured genai.Client or None if authentication is not configured.
    """
    global _cached_judge_client
    if _cached_judge_client is not None:
        return _cached_judge_client

    project = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("PROJECT_ID")
        or os.getenv("GCP_PROJECT")
    )
    location = os.getenv("GOOGLE_CLOUD_LOCATION") or "global"
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "true").lower() == "true"

    if use_vertex and project:
        try:
            _cached_judge_client = genai.Client(
                vertexai=True, project=project, location=location
            )
            return _cached_judge_client
        except Exception as err:
            logger.warning("Agent Platform GenAI Client initialization failed: %s", err)

    try:
        _cached_judge_client = genai.Client()
        return _cached_judge_client
    except Exception as err:
        logger.warning("Default GenAI Client initialization failed: %s", err)
        return None


class JudgeVerdict(BaseModel):
    """Structured verdict produced by LLM judge."""

    score: int = Field(..., ge=1, le=5, description="Quality score from 1 to 5")
    explanation: str = Field(..., description="Justification for given score")


class ScenarioEvalResult(BaseModel):
    """Evaluation result for an individual campaign scenario."""

    scenario_id: str
    category: str
    status: str  # PASS | FAIL
    schema_valid: bool
    budget_conserved: bool
    llm_judge_score: int | None = None
    llm_judge_rationale: str | None = None
    error_message: str | None = None
    duration_seconds: float = 0.0


class OverallEvalReport(BaseModel):
    """Aggregated evaluation report across all evaluated scenarios."""

    timestamp: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    schema_conformance_rate: float
    budget_conservation_rate: float
    average_llm_score: float
    gate_passed: bool
    results: list[ScenarioEvalResult]


async def evaluate_campaign_with_llm_judge(
    scenario: dict[str, Any],
    deliverables: dict[str, Any],
) -> tuple[int, str]:
    """Grades campaign deliverables using Gemini 3.1 Pro on a 1-5 rubric.

    Args:
        scenario: Scenario specification dictionary.
        deliverables: Final deliverable payload dictionary from Orchestrator.

    Returns:
        Tuple of (integer score 1-5, explanation string).
    """
    p1 = deliverables.get("marketSensing") or {}
    p2 = deliverables.get("campaignBrief") or {}
    p3 = deliverables.get("creativeContent") or {}
    p4 = deliverables.get("performanceInsights") or {}

    rubric = """
Grade the multi-agent marketing campaign on a 1.0 to 5.0 scale:
5.0 - Superior: Executive-ready strategic brief, defensible ROAS projections, photorealistic prompt synthesis, perfect brand voice.
4.0 - Good: Actionable insights, highly distinct persona messaging, creative copy matches consumer trends, logical channel allocation.
3.0 - Acceptable: Meets basic brief criteria, sound budget breakdown, minor creative repetition.
2.0 - Poor: Fails brand tone, vague target persona, generic recommendations, unsupported claims.
1.0 - Unacceptable: Hallucinated competitor specs, budget math failure, or toxic/unsafe content.
"""

    prompt = f"""You are an executive QA evaluator for enterprise marketing AI systems.
{rubric}

Campaign Brief Input:
- Brand: {scenario.get("brand_name")}
- Product: {scenario.get("product_name")}
- Objective: {scenario.get("campaign_objective")}
- Audience: {scenario.get("target_audience")}
- Budget: ${scenario.get("budget_amount")} {scenario.get("currency")}

Generated Deliverables:
[Stage 1 Market Sensing]:
{json.dumps(p1, indent=2, ensure_ascii=False)}

[Stage 2 Strategy Brief]:
{json.dumps(p2, indent=2, ensure_ascii=False)}

[Stage 3 Creative Content]:
{json.dumps(p3, indent=2, ensure_ascii=False)}

[Stage 4 Performance Insights]:
{json.dumps(p4, indent=2, ensure_ascii=False)}

Assess strategic alignment, creative quality, persona relevance, and coherence across all 4 stages.
"""

    try:
        client = _get_judge_client()
        if client is None:
            return (
                3,
                "LLM Judge client could not be initialized "
                "(no Agent Platform or API key).",
            )
        response = None
        for candidate_model in [JUDGE_MODEL, "gemini-2.5-pro", "gemini-2.5-flash"]:
            try:
                response = client.models.generate_content(
                    model=candidate_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        response_mime_type="application/json",
                        response_schema=JudgeVerdict,
                    ),
                )
                break
            except Exception:
                continue

        if response is None:
            return 3, "All judge model candidates failed to generate content."

        verdict: JudgeVerdict | None = response.parsed
        if verdict:
            return verdict.score, verdict.explanation
        return 3, "Failed to parse structured judge verdict; defaulted to 3."
    except Exception as err:
        logger.warning("LLM Judge evaluation encountered error: %s", err)
        return 3, f"LLM Judge call error: {err}"


async def run_single_scenario(
    client: AsyncClient,
    scenario: dict[str, Any],
    auth_header: dict[str, str],
) -> ScenarioEvalResult:
    """Executes a single campaign scenario through the multi-agent DAG.

    Args:
        client: AsyncClient instance (ASGI or HTTP).
        scenario: Scenario definition dictionary.
        auth_header: HTTP Authorization headers.

    Returns:
        ScenarioEvalResult with detailed metrics.
    """
    start_time = asyncio.get_event_loop().time()
    scenario_id = scenario["scenario_id"]
    category = scenario.get("category", "flagship")
    expected_status = scenario.get("expected_status", 200)

    logger.info("Executing Scenario: %s (%s)", scenario_id, category)

    payload = {
        "brandName": scenario["brand_name"],
        "productName": scenario["product_name"],
        "campaignObjective": scenario["campaign_objective"],
        "targetAudience": scenario["target_audience"],
        "budgetAmount": scenario["budget_amount"],
        "currency": scenario.get("currency", "USD"),
        "channels": scenario.get("channels", ["Digital Video", "Social Media"]),
        "stream": False,
    }

    try:
        # Step 1: Start Campaign
        create_resp = await client.post(
            "/api/v1/campaigns",
            json=payload,
            headers=auth_header,
        )

        if expected_status == 400:
            if create_resp.status_code == 400:
                duration = asyncio.get_event_loop().time() - start_time
                return ScenarioEvalResult(
                    scenario_id=scenario_id,
                    category=category,
                    status="PASS",
                    schema_valid=True,
                    budget_conserved=True,
                    llm_judge_score=5,
                    llm_judge_rationale=(
                        "Correctly intercepted and blocked by guardrails."
                    ),
                    duration_seconds=round(duration, 2),
                )
            duration = asyncio.get_event_loop().time() - start_time
            return ScenarioEvalResult(
                scenario_id=scenario_id,
                category=category,
                status="FAIL",
                schema_valid=False,
                budget_conserved=True,
                error_message=(
                    f"Expected 400 rejection but got {create_resp.status_code}"
                ),
                duration_seconds=round(duration, 2),
            )

        if create_resp.status_code != 200:
            duration = asyncio.get_event_loop().time() - start_time
            return ScenarioEvalResult(
                scenario_id=scenario_id,
                category=category,
                status="FAIL",
                schema_valid=False,
                budget_conserved=False,
                error_message=(
                    f"Campaign start failed with status {create_resp.status_code}:"
                    f" {create_resp.text}"
                ),
                duration_seconds=round(duration, 2),
            )

        session_data = create_resp.json()
        session_id = session_data["sessionId"]

        # Validate Stage 1 (Market Sensing) schema
        p1_data = session_data.get("deliverables", {}).get("marketSensing")
        MarketSensingDeliverable.model_validate(p1_data)

        # Step 2: Approve Stage 1 -> Triggers Stage 2 (Strategy Brief)
        p1_appr = await client.post(
            f"/api/v1/campaigns/{session_id}/approve",
            json={"action": "approve", "stream": False},
            headers=auth_header,
        )
        if p1_appr.status_code != 200:
            raise RuntimeError(f"Stage 1 approve failed: {p1_appr.text}")
        session_data = p1_appr.json()
        p2_data = session_data.get("deliverables", {}).get("campaignBrief")
        CampaignBriefDeliverable.model_validate(p2_data)

        # Step 3: Approve Stage 2 -> Triggers Stage 3 (Creative Content)
        p2_appr = await client.post(
            f"/api/v1/campaigns/{session_id}/approve",
            json={"action": "approve", "stream": False},
            headers=auth_header,
        )
        if p2_appr.status_code != 200:
            raise RuntimeError(f"Stage 2 approve failed: {p2_appr.text}")
        session_data = p2_appr.json()
        p3_data = session_data.get("deliverables", {}).get("creativeContent")
        CreativeContentDeliverable.model_validate(p3_data)

        # Step 4: Approve Stage 3 -> Triggers Stage 4 (Performance Insights)
        p3_approve_payload: dict[str, Any] = {"action": "approve", "stream": False}
        if scenario.get("hitl_action") == "edit_deliverable":
            edit_info = scenario.get("marketer_edit", {})
            if "deliverable_updates" in edit_info:
                p3_approve_payload["deliverableUpdates"] = edit_info[
                    "deliverable_updates"
                ]

        p3_appr = await client.post(
            f"/api/v1/campaigns/{session_id}/approve",
            json=p3_approve_payload,
            headers=auth_header,
        )
        if p3_appr.status_code != 200:
            raise RuntimeError(f"Stage 3 approve failed: {p3_appr.text}")
        session_data = p3_appr.json()
        p4_data = session_data.get("deliverables", {}).get("performanceInsights")
        PerformanceInsightsDeliverable.model_validate(p4_data)

        # Validate 100.0% Budget Conservation
        total_pct = sum(
            float(alloc["percentage"])
            for alloc in p4_data.get("channelAllocations", [])
        )
        budget_conserved = round(total_pct, 1) == 100.0
        if not budget_conserved:
            logger.error(
                "Budget conservation failed for %s: sum is %f%%", scenario_id, total_pct
            )

        # Step 5: Approve Stage 4 -> Advances to MEDIA_EXECUTION
        p4_appr = await client.post(
            f"/api/v1/campaigns/{session_id}/approve",
            json={"action": "approve", "stream": False},
            headers=auth_header,
        )
        if p4_appr.status_code != 200:
            raise RuntimeError(f"Stage 4 approve failed: {p4_appr.text}")
        final_session = p4_appr.json()
        if (
            final_session.get("status") != CampaignStatus.COMPLETED.value
            or final_session.get("currentStage") != CampaignStage.MEDIA_EXECUTION.value
        ):
            raise RuntimeError(
                f"Expected COMPLETED status and MEDIA_EXECUTION stage but got"
                f" status={final_session.get('status')}, stage={final_session.get('currentStage')}"
            )

        # Step 6: Grade with LLM-as-a-Judge
        llm_score, llm_rationale = await evaluate_campaign_with_llm_judge(
            scenario, final_session.get("deliverables", {})
        )

        duration = asyncio.get_event_loop().time() - start_time
        is_pass = budget_conserved and (llm_score >= 3)
        return ScenarioEvalResult(
            scenario_id=scenario_id,
            category=category,
            status="PASS" if is_pass else "FAIL",
            schema_valid=True,
            budget_conserved=budget_conserved,
            llm_judge_score=llm_score,
            llm_judge_rationale=llm_rationale,
            duration_seconds=round(duration, 2),
        )

    except Exception as err:
        duration = asyncio.get_event_loop().time() - start_time
        logger.exception("Scenario %s raised unexpected error: %s", scenario_id, err)
        return ScenarioEvalResult(
            scenario_id=scenario_id,
            category=category,
            status="FAIL",
            schema_valid=False,
            budget_conserved=False,
            error_message=str(err),
            duration_seconds=round(duration, 2),
        )


async def run_evaluation_suite(
    base_url: str | None = None,
    dataset_path: str | None = None,
    auth_token: str = "eval-marketer-token",
) -> OverallEvalReport:
    """Runs the complete 10-scenario golden evaluation suite.

    Args:
        base_url: Base HTTP URL for remote service or None for in-process ASGI.
        dataset_path: Path to golden_campaigns.json or None for default.
        auth_token: Bearer auth token for requests.

    Returns:
        OverallEvalReport containing aggregated stats and per-case results.
    """
    if dataset_path is None:
        dataset_path = str(Path(__file__).parent / "datasets" / "golden_campaigns.json")

    with open(dataset_path, encoding="utf-8") as f:
        dataset_data = json.load(f)

    scenarios = dataset_data.get("scenarios", [])
    auth_header = {"Authorization": f"Bearer {auth_token}"}
    results: list[ScenarioEvalResult] = []

    if base_url:
        logger.info("Executing evaluation against remote endpoint: %s", base_url)
        async with AsyncClient(base_url=base_url, timeout=120.0) as client:
            for sc in scenarios:
                res = await run_single_scenario(client, sc, auth_header)
                results.append(res)
    else:
        logger.info("Executing evaluation against in-process ASGI application")
        from app.orchestrator.security import get_security_manager

        sec = get_security_manager()
        if not sec.model_armor_template:
            sec.model_armor_template = "projects/capstone-staging-506811/locations/us/templates/version1-guardrails"

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test", timeout=120.0
        ) as client:
            for sc in scenarios:
                res = await run_single_scenario(client, sc, auth_header)
                results.append(res)

    total = len(results)
    passed = sum(1 for r in results if r.status == "PASS")
    failed = total - passed
    schema_valid_count = sum(1 for r in results if r.schema_valid)
    budget_valid_count = sum(1 for r in results if r.budget_conserved)

    schema_rate = (schema_valid_count / total * 100.0) if total > 0 else 0.0
    budget_rate = (budget_valid_count / total * 100.0) if total > 0 else 0.0

    llm_scores = [r.llm_judge_score for r in results if r.llm_judge_score]
    avg_llm = sum(llm_scores) / len(llm_scores) if llm_scores else 0.0

    # Quality Gate Decision:
    # Schema 100%, Budget 100%, Avg LLM Score >= 4.0, 0 unhandled failures
    gate_passed = (
        (schema_rate == 100.0)
        and (budget_rate == 100.0)
        and (avg_llm >= 4.0)
        and (failed == 0)
    )

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    report = OverallEvalReport(
        timestamp=timestamp,
        total_scenarios=total,
        passed_scenarios=passed,
        failed_scenarios=failed,
        schema_conformance_rate=round(schema_rate, 2),
        budget_conservation_rate=round(budget_rate, 2),
        average_llm_score=round(avg_llm, 2),
        gate_passed=gate_passed,
        results=results,
    )

    return report


def write_reports(report: OverallEvalReport, output_dir: Path) -> tuple[Path, Path]:
    """Exports structured JSON and human-readable HTML evaluation reports.

    Args:
        report: Overall evaluation report data model.
        output_dir: Destination directory.

    Returns:
        Tuple of (json_path, html_path).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"results_{report.timestamp}.json"
    html_path = output_dir / f"results_{report.timestamp}.html"

    with open(json_path, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    html_rows = ""
    for r in report.results:
        badge_color = "#28a745" if r.status == "PASS" else "#dc3545"
        score_display = f"{r.llm_judge_score}/5" if r.llm_judge_score else "N/A"
        rationale = r.llm_judge_rationale or r.error_message or ""
        html_rows += f"""
    <tr>
      <td><code>{r.scenario_id}</code></td>
      <td>{r.category}</td>
      <td><span style="color:white;background-color:{badge_color};padding:2px 8px;border-radius:4px;">{r.status}</span></td>
      <td>{"✅" if r.schema_valid else "❌"}</td>
      <td>{"✅" if r.budget_conserved else "❌"}</td>
      <td><strong>{score_display}</strong></td>
      <td><small>{rationale}</small></td>
      <td>{r.duration_seconds}s</td>
    </tr>
    """

    status_banner_color = "#28a745" if report.gate_passed else "#dc3545"
    status_banner_text = "PASSED" if report.gate_passed else "FAILED"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MVC Evaluation Report - {report.timestamp}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; background: #f8f9fa; }}
    .card {{ background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; }}
    .banner {{ background: {status_banner_color}; color: white; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 18px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }}
    th, td {{ border: 1px solid #dee2e6; padding: 10px; text-align: left; }}
    th {{ background: #e9ecef; }}
    .metric-box {{ display: inline-block; min-width: 150px; margin-right: 20px; margin-top: 10px; }}
    .metric-val {{ font-size: 24px; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="banner">Quality Gate: {status_banner_text}</div>
    <h2>Marketing Value Creator (MVC) - E2E Golden Evaluation Report</h2>
    <p>Run Timestamp: <code>{report.timestamp}</code></p>
    <div style="margin-top: 16px;">
      <div class="metric-box"><div>Total Scenarios</div><div class="metric-val">{report.total_scenarios}</div></div>
      <div class="metric-box"><div>Passed</div><div class="metric-val" style="color:#28a745;">{report.passed_scenarios}</div></div>
      <div class="metric-box"><div>Failed</div><div class="metric-val" style="color:#dc3545;">{report.failed_scenarios}</div></div>
      <div class="metric-box"><div>Schema Conformance</div><div class="metric-val">{report.schema_conformance_rate}%</div></div>
      <div class="metric-box"><div>Budget Conservation</div><div class="metric-val">{report.budget_conservation_rate}%</div></div>
      <div class="metric-box"><div>Avg LLM Judge Score</div><div class="metric-val">{report.average_llm_score} / 5.0</div></div>
    </div>
  </div>

  <div class="card">
    <h3>Scenario Breakdown</h3>
    <table>
      <thead>
        <tr>
          <th>Scenario ID</th>
          <th>Category</th>
          <th>Status</th>
          <th>Schema Valid</th>
          <th>Budget Conserved</th>
          <th>LLM Score</th>
          <th>Judge Rationale / Error</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {html_rows}
      </tbody>
    </table>
  </div>
</body>
</html>
"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return json_path, html_path


def main():
    """CLI entrypoint for standalone execution."""
    parser = argparse.ArgumentParser(
        description="Run E2E evaluation suite with Synthetic Marketer."
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default=None,
        help="Remote Cloud Run base URL (if omitted, runs against in-process ASGI).",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path to golden campaigns JSON dataset.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="artifacts/eval_results",
        help="Directory to save evaluation reports.",
    )
    parser.add_argument(
        "--auth-token",
        type=str,
        default="eval-marketer-token",
        help="Bearer authentication token.",
    )
    args = parser.parse_args()

    report = asyncio.run(
        run_evaluation_suite(
            base_url=args.base_url,
            dataset_path=args.dataset,
            auth_token=args.auth_token,
        )
    )

    out_dir = Path(args.output_dir)
    json_p, html_p = write_reports(report, out_dir)
    logger.info("Saved JSON report to: %s", json_p)
    logger.info("Saved HTML report to: %s", html_p)

    print("\n" + "=" * 60)
    print(
        f"E2E EVALUATION SUMMARY: Gate {'PASSED' if report.gate_passed else 'FAILED'}"
    )
    print(f"Total Scenarios:         {report.total_scenarios}")
    print(f"Passed:                  {report.passed_scenarios}")
    print(f"Failed:                  {report.failed_scenarios}")
    print(f"Schema Conformance:      {report.schema_conformance_rate}%")
    print(f"Budget Conservation:     {report.budget_conservation_rate}%")
    print(f"Average LLM Judge Score: {report.average_llm_score} / 5.0")
    print("=" * 60 + "\n")

    if not report.gate_passed:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
