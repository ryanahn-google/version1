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

"""Unit tests for ADK Root Orchestrator Tools."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.agent import root_agent
from app.orchestrator.tools import (
    ORCHESTRATOR_TOOLS,
    approve_campaign_stage,
    create_campaign_session,
    get_campaign_status,
    parse_campaign_prompt,
    rollback_campaign_stage,
)
from app.schemas.campaign import (
    ApprovalAction,
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
    ParsePromptResponse,
)
from app.schemas.deliverables import (
    CompetitorAnalysis,
    MarketSensingDeliverable,
    SentimentOverview,
)


def _mock_session_response(
    session_id: str = "camp-12345678",
    stage: CampaignStage = CampaignStage.MARKET_SENSING,
    status: CampaignStatus = CampaignStatus.PAUSED_FOR_REVIEW,
) -> CampaignSessionResponse:
    """Helper to build a valid dummy CampaignSessionResponse."""
    ms = MarketSensingDeliverable(
        targetMarket="Global tech enthusiasts",
        consumerTrends=["Trend 1"],
        competitiveAnalysis=[
            CompetitorAnalysis(
                competitor="Comp A",
                strengths=["Ecosystem"],
                vulnerabilities=["Price"],
            )
        ],
        sentimentOverview=SentimentOverview(
            positiveThemes=["Camera"],
            frictionPoints=["Battery"],
            overallSentimentScore=0.8,
        ),
        strategicOpportunities=["Opportunity 1"],
    )
    return CampaignSessionResponse(
        sessionId=session_id,
        brandName="Nova Electronics",
        productName="Galaxy S27 Ultra",
        campaignObjective="Global holiday launch",
        targetAudience="Tech enthusiasts",
        budgetAmount=1000000.0,
        currency="USD",
        channels=["Digital Video", "Social Media"],
        currentStage=stage,
        status=status,
        revisionCount=0,
        deliverables=CampaignDeliverables(marketSensing=ms),
        createdAt=datetime.now(UTC),
        updatedAt=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_create_campaign_session_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify create_campaign_session tool successfully calls engine and returns dict."""
    mock_engine = MagicMock()
    mock_resp = _mock_session_response()
    mock_engine.create_campaign = AsyncMock(return_value=mock_resp)

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await create_campaign_session(
        brand_name="Nova Electronics",
        product_name="Galaxy S27 Ultra",
        campaign_objective="Global holiday launch",
        target_audience="Tech enthusiasts",
        budget_amount=500000.0,
        currency="USD",
        channels=["Digital Video"],
        language="ko",
    )

    assert result["success"] is True
    assert result["sessionId"] == "camp-12345678"
    assert result["currentStage"] == CampaignStage.MARKET_SENSING.value
    assert result["status"] == CampaignStatus.PAUSED_FOR_REVIEW.value
    assert "marketSensing" in result["deliverables"]
    mock_engine.create_campaign.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_campaign_session_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify create_campaign_session tool handles exceptions gracefully."""
    mock_engine = MagicMock()
    mock_engine.create_campaign = AsyncMock(
        side_effect=RuntimeError("Sub-agent unavailable")
    )

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await create_campaign_session(
        brand_name="Nova Electronics",
        product_name="Galaxy S27 Ultra",
        campaign_objective="Launch",
    )

    assert result["success"] is False
    assert "Sub-agent unavailable" in result["error"]


@pytest.mark.asyncio
async def test_approve_campaign_stage_approve(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify approve_campaign_stage handles approval action."""
    mock_engine = MagicMock()
    mock_resp = _mock_session_response(
        stage=CampaignStage.STRATEGY_BRIEF,
        status=CampaignStatus.PAUSED_FOR_REVIEW,
    )
    mock_engine.approve_stage = AsyncMock(return_value=mock_resp)

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await approve_campaign_stage(
        session_id="camp-12345678",
        action="approve",
    )

    assert result["success"] is True
    assert result["currentStage"] == CampaignStage.STRATEGY_BRIEF.value
    mock_engine.approve_stage.assert_awaited_once()
    call_args = mock_engine.approve_stage.await_args
    assert call_args.kwargs["request"].action == ApprovalAction.APPROVE


@pytest.mark.asyncio
async def test_approve_campaign_stage_revise(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify approve_campaign_stage handles revise action with feedback."""
    mock_engine = MagicMock()
    mock_resp = _mock_session_response()
    mock_engine.approve_stage = AsyncMock(return_value=mock_resp)

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await approve_campaign_stage(
        session_id="camp-12345678",
        action="revise",
        feedback="Target Gen Z more strongly",
    )

    assert result["success"] is True
    call_args = mock_engine.approve_stage.await_args
    assert call_args.kwargs["request"].action == ApprovalAction.REVISE
    assert call_args.kwargs["request"].feedback == "Target Gen Z more strongly"


@pytest.mark.asyncio
async def test_rollback_campaign_stage(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify rollback_campaign_stage tool calls engine rollback."""
    mock_engine = MagicMock()
    mock_resp = _mock_session_response(stage=CampaignStage.MARKET_SENSING)
    mock_engine.rollback_stage = AsyncMock(return_value=mock_resp)

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await rollback_campaign_stage(session_id="camp-12345678")

    assert result["success"] is True
    assert result["currentStage"] == CampaignStage.MARKET_SENSING.value
    mock_engine.rollback_stage.assert_awaited_once_with(
        session_id="camp-12345678", user_id=None
    )


@pytest.mark.asyncio
async def test_get_campaign_status_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify get_campaign_status tool retrieves existing session state."""
    mock_engine = MagicMock()
    mock_repo = MagicMock()
    mock_resp = _mock_session_response()
    mock_repo.get_session = AsyncMock(return_value=mock_resp)
    mock_engine.repo = mock_repo

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await get_campaign_status(session_id="camp-12345678")

    assert result["success"] is True
    assert result["sessionId"] == "camp-12345678"
    assert result["currentStage"] == CampaignStage.MARKET_SENSING.value


@pytest.mark.asyncio
async def test_get_campaign_status_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify get_campaign_status tool returns error for non-existent session."""
    mock_engine = MagicMock()
    mock_repo = MagicMock()
    mock_repo.get_session = AsyncMock(return_value=None)
    mock_engine.repo = mock_repo

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await get_campaign_status(session_id="camp-notfound")

    assert result["success"] is False
    assert "not found" in result["error"]


@pytest.mark.asyncio
async def test_parse_campaign_prompt_tool(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify parse_campaign_prompt tool delegates to engine."""
    mock_engine = MagicMock()
    parsed_resp = ParsePromptResponse(
        brandName="Nova",
        productName="Galaxy S27",
        campaignObjective="Holiday promotion",
        targetAudience="Tech fans",
        budgetAmount=100000.0,
        currency="USD",
        channels=["Digital Video"],
    )
    mock_engine.parse_prompt = AsyncMock(return_value=parsed_resp)

    monkeypatch.setattr(
        "app.orchestrator.tools.get_orchestration_engine",
        lambda: mock_engine,
    )

    result = await parse_campaign_prompt(
        prompt="Nova Galaxy S27 holiday promotion with 100k budget",
        language="en",
    )

    assert result["success"] is True
    assert result["parsed"]["brandName"] == "Nova"
    assert result["parsed"]["budgetAmount"] == 100000.0


def test_root_agent_tool_binding() -> None:
    """Verify root_agent has all 5 orchestrator tools bound."""
    assert root_agent.tools is not None
    assert len(root_agent.tools) == 5
    assert root_agent.tools == ORCHESTRATOR_TOOLS

    tool_names = {
        getattr(t, "__name__", None) or getattr(t, "name", None)
        for t in root_agent.tools
    }
    expected_names = {
        "create_campaign_session",
        "approve_campaign_stage",
        "rollback_campaign_stage",
        "get_campaign_status",
        "parse_campaign_prompt",
    }
    assert tool_names == expected_names
    assert root_agent.name == "mvc_orchestrator"
    assert "create_campaign_session" in root_agent.instruction
