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

"""Campaign lifecycle and multi-agent DAG orchestration routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.orchestrator.agent_runner import (
    agent_approve_stage,
    agent_create_campaign,
    agent_parse_prompt,
    agent_rollback_stage,
)
from app.orchestrator.engine import (
    CampaignOrchestrationEngine,
    get_orchestration_engine,
)
from app.orchestrator.security import (
    SecurityManager,
    get_current_user,
    get_security_manager,
)
from app.orchestrator.session_repo import (
    SessionRepository,
    UserModel,
    get_session_repo,
)
from app.schemas.campaign import (
    CampaignSessionResponse,
    CampaignSummaryResponse,
    CreateCampaignRequest,
    ParsePromptRequest,
    ParsePromptResponse,
    StageApprovalRequest,
)
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns"])


@router.post(
    "/parse-prompt",
    response_model=ParsePromptResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def parse_campaign_prompt(
    payload: ParsePromptRequest,
    request: Request,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
) -> ParsePromptResponse:
    """Parse natural language prompt into structured parameters via ADK root_agent."""
    await security.inspect_prompt_safety(payload.prompt)
    runner = getattr(request.app.state, "runner", None)
    return await agent_parse_prompt(
        runner=runner,
        user=user,
        payload=payload,
        engine=engine,
    )


@router.get(
    "",
    response_model=list[CampaignSummaryResponse],
    responses={401: {"model": ErrorResponse}},
)
async def list_campaigns(
    limit: int = 50,
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
) -> list[CampaignSummaryResponse]:
    """List recent campaigns belonging to authenticated user (lightweight summary)."""
    return await repo.list_user_campaigns(user.user_id, limit=limit)


@router.post(
    "",
    response_model=CampaignSessionResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def create_campaign(
    payload: CreateCampaignRequest,
    request: Request,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
) -> CampaignSessionResponse:
    """Start a new multi-agent campaign planning DAG via ADK root_agent."""
    await security.inspect_prompt_safety(payload.campaignObjective)
    runner = getattr(request.app.state, "runner", None)
    return await agent_create_campaign(
        runner=runner,
        user=user,
        payload=payload,
        engine=engine,
        repo=repo,
    )


@router.get(
    "/{sessionId}",
    response_model=CampaignSessionResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_campaign_session(
    sessionId: str,
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
) -> CampaignSessionResponse:
    """Retrieve full campaign session state and deliverables scoped by user."""
    session = await repo.get_session(sessionId, user_id=user.user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return session


@router.post(
    "/{sessionId}/approve",
    response_model=CampaignSessionResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def approve_stage(
    sessionId: str,
    payload: StageApprovalRequest,
    request: Request,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
) -> CampaignSessionResponse:
    """Submit human review approval or revision feedback via ADK root_agent."""
    if payload.feedback:
        await security.inspect_prompt_safety(payload.feedback)

    runner = getattr(request.app.state, "runner", None)
    updated = await agent_approve_stage(
        runner=runner,
        user=user,
        session_id=sessionId,
        payload=payload,
        engine=engine,
        repo=repo,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return updated


@router.post(
    "/{sessionId}/rollback",
    response_model=CampaignSessionResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def rollback_stage(
    sessionId: str,
    request: Request,
    user: UserModel = Depends(get_current_user),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
) -> CampaignSessionResponse:
    """Rollback session strictly to the immediately preceding stage via ADK root_agent."""
    runner = getattr(request.app.state, "runner", None)
    return await agent_rollback_stage(
        runner=runner,
        user=user,
        session_id=sessionId,
        engine=engine,
        repo=repo,
    )


@router.patch(
    "/{sessionId}",
    response_model=CampaignSessionResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def update_campaign_session(
    sessionId: str,
    payload: dict[str, Any],
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
) -> CampaignSessionResponse:
    """Update campaign session deliverables or fields directly."""
    session = await repo.get_session(sessionId, user_id=user.user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )

    updated = await repo.update_session(
        sessionId,
        deliverables=payload.get("deliverables"),
        user_id=user.user_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update campaign session.",
        )
    return updated
