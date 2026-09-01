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

"""ADK Root Agent execution bridge for FastAPI campaign routes."""

import logging
import uuid
from typing import Any

from google.adk.runners import Runner
from google.genai import types

from app.models import UserModel
from app.orchestrator.engine import CampaignOrchestrationEngine
from app.orchestrator.session_repo import SessionRepository
from app.schemas.campaign import (
    CampaignSessionResponse,
    CreateCampaignRequest,
    ParsePromptRequest,
    ParsePromptResponse,
    StageApprovalRequest,
)

logger = logging.getLogger(__name__)


async def run_orchestrator_agent(
    runner: Runner | None,
    user_id: str,
    prompt: str,
    target_tool_name: str,
) -> dict[str, Any] | None:
    """Executes root_agent via ADK Runner and captures tool execution response.

    Args:
        runner: The ADK Runner instance from app.state.runner if available.
        user_id: The authenticated user's ID.
        prompt: Instruction directed to the root_agent.
        target_tool_name: Name of the expected tool call to capture.

    Returns:
        The tool response dictionary if successfully executed, else None.
    """
    if not runner:
        logger.debug("ADK Runner not available on app.state; skipping agent turn.")
        return None

    try:
        session_id = f"adk-session-{uuid.uuid4().hex[:8]}"
        app_name = getattr(runner.app, "name", None) or getattr(
            runner.agent, "name", "app"
        )
        await runner.session_service.create_session(
            user_id=user_id,
            session_id=session_id,
            app_name=app_name,
        )

        msg = types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )

        tool_output: dict[str, Any] | None = None
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=msg,
        ):
            if not event.content or not event.content.parts:
                continue

            for part in event.content.parts:
                fn_resp = getattr(part, "function_response", None)
                if fn_resp and getattr(fn_resp, "name", None) == target_tool_name:
                    resp_dict = getattr(fn_resp, "response", None)
                    if isinstance(resp_dict, dict) and resp_dict.get("success"):
                        tool_output = resp_dict
                        logger.info(
                            "ADK Root Agent successfully executed tool '%s'",
                            target_tool_name,
                        )

        return tool_output
    except Exception as exc:
        logger.warning(
            "ADK Root Agent execution encountered exception: %s. "
            "Falling back to direct engine execution.",
            exc,
        )
        return None


async def agent_create_campaign(
    runner: Runner | None,
    user: UserModel,
    payload: CreateCampaignRequest,
    engine: CampaignOrchestrationEngine,
    repo: SessionRepository,
) -> CampaignSessionResponse:
    """Coordinates campaign creation via ADK root_agent with engine fallback.

    Args:
        runner: ADK Runner from app.state.runner.
        user: Authenticated user model.
        payload: Campaign creation request payload.
        engine: Orchestration engine instance.
        repo: Session repository instance.

    Returns:
        CampaignSessionResponse for the created campaign.
    """
    prompt = (
        f"Create a campaign planning session for user '{user.user_id}'. "
        f"Brand: '{payload.brandName}', product: '{payload.productName}', "
        f"objective: '{payload.campaignObjective}', target audience: '{payload.targetAudience}', "
        f"budget: {payload.budgetAmount} {payload.currency}, channels: {payload.channels}, "
        f"language: '{payload.language}'. "
        f"Call the create_campaign_session tool with user_id='{user.user_id}' now."
    )

    try:
        tool_result = await run_orchestrator_agent(
            runner=runner,
            user_id=user.user_id,
            prompt=prompt,
            target_tool_name="create_campaign_session",
        )

        if tool_result:
            sid = tool_result.get("sessionId") or tool_result.get("session_id")
            if sid:
                session = await repo.get_session(
                    session_id=sid,
                    user_id=user.user_id,
                )
                if session:
                    return session
    except Exception as exc:
        logger.warning(
            "agent_create_campaign resolution failed: %s; falling back to engine.",
            exc,
        )

    # Deterministic execution fallback
    return await engine.create_campaign(
        payload,
        principal=user.email,
        user_id=user.user_id,
    )


async def agent_approve_stage(
    runner: Runner | None,
    user: UserModel,
    session_id: str,
    payload: StageApprovalRequest,
    engine: CampaignOrchestrationEngine,
    repo: SessionRepository,
) -> CampaignSessionResponse | None:
    """Coordinates stage review approval via root_agent with engine fallback.

    Args:
        runner: ADK Runner from app.state.runner.
        user: Authenticated user model.
        session_id: Campaign session ID.
        payload: Approval or revision request payload.
        engine: Orchestration engine instance.
        repo: Session repository instance.

    Returns:
        Updated CampaignSessionResponse, or None if session not found.
    """
    prompt = (
        f"Review campaign stage for session '{session_id}' and user '{user.user_id}'. "
        f"Action: '{payload.action.value}'. "
        + (f"Feedback: '{payload.feedback}'. " if payload.feedback else "")
        + f"Call the approve_campaign_stage tool with session_id='{session_id}' and user_id='{user.user_id}' now."
    )

    try:
        tool_result = await run_orchestrator_agent(
            runner=runner,
            user_id=user.user_id,
            prompt=prompt,
            target_tool_name="approve_campaign_stage",
        )

        if tool_result:
            sid = tool_result.get("sessionId") or tool_result.get("session_id")
            if sid:
                session = await repo.get_session(
                    session_id=sid,
                    user_id=user.user_id,
                )
                if session:
                    return session
    except Exception as exc:
        logger.warning(
            "agent_approve_stage resolution failed: %s; falling back to engine.",
            exc,
        )

    # Deterministic execution fallback
    return await engine.approve_stage(
        session_id,
        payload,
        principal=user.email,
        user_id=user.user_id,
    )


async def agent_rollback_stage(
    runner: Runner | None,
    user: UserModel,
    session_id: str,
    engine: CampaignOrchestrationEngine,
    repo: SessionRepository,
) -> CampaignSessionResponse:
    """Coordinates stage rollback via root_agent with engine fallback.

    Args:
        runner: ADK Runner from app.state.runner.
        user: Authenticated user model.
        session_id: Campaign session ID.
        engine: Orchestration engine instance.
        repo: Session repository instance.

    Returns:
        Updated CampaignSessionResponse at the previous stage.
    """
    prompt = (
        f"Roll back campaign session '{session_id}' to the previous stage for user '{user.user_id}'. "
        f"Call the rollback_campaign_stage tool with session_id='{session_id}' and user_id='{user.user_id}' now."
    )

    try:
        tool_result = await run_orchestrator_agent(
            runner=runner,
            user_id=user.user_id,
            prompt=prompt,
            target_tool_name="rollback_campaign_stage",
        )

        if tool_result:
            sid = tool_result.get("sessionId") or tool_result.get("session_id")
            if sid:
                session = await repo.get_session(
                    session_id=sid,
                    user_id=user.user_id,
                )
                if session:
                    return session
    except Exception as exc:
        logger.warning(
            "agent_rollback_stage resolution failed: %s; falling back to engine.",
            exc,
        )

    # Deterministic execution fallback
    return await engine.rollback_stage(session_id, user_id=user.user_id)


async def agent_parse_prompt(
    runner: Runner | None,
    user: UserModel,
    payload: ParsePromptRequest,
    engine: CampaignOrchestrationEngine,
) -> ParsePromptResponse:
    """Coordinates prompt parsing via root_agent with engine fallback.

    Args:
        runner: ADK Runner from app.state.runner.
        user: Authenticated user model.
        payload: Prompt parsing request payload.
        engine: Orchestration engine instance.

    Returns:
        Parsed campaign parameters response.
    """
    prompt = (
        f"Parse the following campaign prompt in language '{payload.language}': '{payload.prompt}'. "
        f"Call the parse_campaign_prompt tool now."
    )

    try:
        tool_result = await run_orchestrator_agent(
            runner=runner,
            user_id=user.user_id,
            prompt=prompt,
            target_tool_name="parse_campaign_prompt",
        )

        if tool_result and "parsed" in tool_result:
            return ParsePromptResponse.model_validate(tool_result["parsed"])
    except Exception as exc:
        logger.warning(
            "agent_parse_prompt resolution failed: %s; falling back to engine.",
            exc,
        )

    # Deterministic execution fallback
    return await engine.parse_prompt(payload.prompt, language=payload.language)
