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

"""Unit tests for ADK Root Agent Runner and FastAPI campaign delegation."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from google.genai import types

from app.models import UserModel
from app.orchestrator.agent_runner import (
    agent_approve_stage,
    agent_create_campaign,
    agent_parse_prompt,
    agent_rollback_stage,
    run_orchestrator_agent,
)
from app.schemas.campaign import (
    ApprovalAction,
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
    CreateCampaignRequest,
    ParsePromptRequest,
    ParsePromptResponse,
    StageApprovalRequest,
)


def _dummy_user() -> UserModel:
    """Create mock UserModel."""
    user = UserModel(
        email="marketer@nova.com",
        name="Nova Marketer",
    )
    user.user_id = "usr-12345"
    return user


def _dummy_session(session_id: str = "camp-12345678") -> CampaignSessionResponse:
    """Create mock CampaignSessionResponse."""
    return CampaignSessionResponse(
        sessionId=session_id,
        brandName="Nova",
        productName="Galaxy S27",
        campaignObjective="Global launch",
        targetAudience="General",
        budgetAmount=100000.0,
        currency="USD",
        channels=["Digital Video"],
        currentStage=CampaignStage.MARKET_SENSING,
        status=CampaignStatus.PAUSED_FOR_REVIEW,
        deliverables=CampaignDeliverables(),
        createdAt=datetime.now(UTC),
        updatedAt=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_run_orchestrator_agent_no_runner() -> None:
    """Verify returns None when runner is None."""
    result = await run_orchestrator_agent(
        runner=None,
        user_id="u1",
        prompt="hello",
        target_tool_name="test_tool",
    )
    assert result is None


@pytest.mark.asyncio
async def test_run_orchestrator_agent_success() -> None:
    """Verify captures tool execution output from ADK runner events."""
    mock_runner = MagicMock()
    mock_runner.agent.name = "mvc_orchestrator"
    mock_session_service = MagicMock()
    mock_session_service.create_session = AsyncMock()
    mock_runner.session_service = mock_session_service

    class DummyEvent:
        def __init__(self, fn_name: str, resp: dict[str, object]):
            fn_resp = types.FunctionResponse(
                name=fn_name,
                response=resp,
            )
            self.content = types.Content(
                role="user",
                parts=[types.Part(function_response=fn_resp)],
            )

    async def mock_run_async(*args, **kwargs):
        yield DummyEvent(
            fn_name="create_campaign_session",
            resp={"success": True, "sessionId": "camp-test1234"},
        )

    mock_runner.run_async = mock_run_async

    result = await run_orchestrator_agent(
        runner=mock_runner,
        user_id="u1",
        prompt="Create campaign",
        target_tool_name="create_campaign_session",
    )

    assert result is not None
    assert result["success"] is True
    assert result["sessionId"] == "camp-test1234"


@pytest.mark.asyncio
async def test_run_orchestrator_agent_no_tool_call() -> None:
    """Verify returns None when event stream does not contain target tool."""
    mock_runner = MagicMock()
    mock_runner.agent.name = "mvc_orchestrator"
    mock_runner.session_service.create_session = AsyncMock()

    class DummyTextEvent:
        def __init__(self):
            self.content = types.Content(
                role="model",
                parts=[types.Part.from_text(text="I am ready.")],
            )

    async def mock_run_async(*args, **kwargs):
        yield DummyTextEvent()

    mock_runner.run_async = mock_run_async

    result = await run_orchestrator_agent(
        runner=mock_runner,
        user_id="u1",
        prompt="Create campaign",
        target_tool_name="create_campaign_session",
    )

    assert result is None


@pytest.mark.asyncio
async def test_agent_create_campaign_agent_success() -> None:
    """Verify agent_create_campaign retrieves session if tool succeeds."""
    mock_runner = MagicMock()
    mock_runner.agent.name = "mvc_orchestrator"
    mock_runner.session_service.create_session = AsyncMock()

    class DummyToolEvent:
        def __init__(self):
            self.content = types.Content(
                role="user",
                parts=[
                    types.Part(
                        function_response=types.FunctionResponse(
                            name="create_campaign_session",
                            response={"success": True, "sessionId": "camp-agent1"},
                        )
                    )
                ],
            )

    async def mock_run_async(*args, **kwargs):
        yield DummyToolEvent()

    mock_runner.run_async = mock_run_async

    mock_repo = MagicMock()
    mock_session_obj = _dummy_session(session_id="camp-agent1")
    mock_repo.get_session = AsyncMock(return_value=mock_session_obj)

    mock_engine = MagicMock()

    req = CreateCampaignRequest(
        brandName="Nova",
        productName="Galaxy",
        campaignObjective="Launch",
        targetAudience="General",
        budgetAmount=1000.0,
    )

    res = await agent_create_campaign(
        runner=mock_runner,
        user=_dummy_user(),
        payload=req,
        engine=mock_engine,
        repo=mock_repo,
    )

    assert res.sessionId == "camp-agent1"
    mock_engine.create_campaign.assert_not_called()


@pytest.mark.asyncio
async def test_agent_create_campaign_fallback_when_no_runner() -> None:
    """Verify fallback to direct engine when runner is None."""
    mock_repo = MagicMock()
    mock_engine = MagicMock()
    fallback_session = _dummy_session(session_id="camp-fallback1")
    mock_engine.create_campaign = AsyncMock(return_value=fallback_session)

    req = CreateCampaignRequest(
        brandName="Nova",
        productName="Galaxy",
        campaignObjective="Launch",
        targetAudience="General",
        budgetAmount=1000.0,
    )

    res = await agent_create_campaign(
        runner=None,
        user=_dummy_user(),
        payload=req,
        engine=mock_engine,
        repo=mock_repo,
    )

    assert res.sessionId == "camp-fallback1"
    mock_engine.create_campaign.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_approve_stage_fallback() -> None:
    """Verify fallback for approve_stage when runner is None."""
    mock_repo = MagicMock()
    mock_engine = MagicMock()
    updated_session = _dummy_session(session_id="camp-appr")
    mock_engine.approve_stage = AsyncMock(return_value=updated_session)

    req = StageApprovalRequest(action=ApprovalAction.APPROVE)
    res = await agent_approve_stage(
        runner=None,
        user=_dummy_user(),
        session_id="camp-appr",
        payload=req,
        engine=mock_engine,
        repo=mock_repo,
    )

    assert res is not None
    assert res.sessionId == "camp-appr"
    mock_engine.approve_stage.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_rollback_stage_fallback() -> None:
    """Verify fallback for rollback_stage when runner is None."""
    mock_repo = MagicMock()
    mock_engine = MagicMock()
    rolled_session = _dummy_session(session_id="camp-roll")
    mock_engine.rollback_stage = AsyncMock(return_value=rolled_session)

    res = await agent_rollback_stage(
        runner=None,
        user=_dummy_user(),
        session_id="camp-roll",
        engine=mock_engine,
        repo=mock_repo,
    )

    assert res.sessionId == "camp-roll"
    mock_engine.rollback_stage.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_parse_prompt_fallback() -> None:
    """Verify fallback for parse_prompt when runner is None."""
    mock_engine = MagicMock()
    parsed_resp = ParsePromptResponse(
        brandName="Nova",
        productName="Galaxy",
        campaignObjective="Goal",
    )
    mock_engine.parse_prompt = AsyncMock(return_value=parsed_resp)

    req = ParsePromptRequest(prompt="Nova Galaxy Goal")
    res = await agent_parse_prompt(
        runner=None,
        user=_dummy_user(),
        payload=req,
        engine=mock_engine,
    )

    assert res.brandName == "Nova"
    mock_engine.parse_prompt.assert_awaited_once()
