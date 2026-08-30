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

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

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
    CreateCampaignRequest,
    StageApprovalRequest,
)
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns"])


@router.get(
    "",
    response_model=list[CampaignSessionResponse],
    responses={401: {"model": ErrorResponse}},
)
async def list_campaigns(
    limit: int = 50,
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
) -> list[CampaignSessionResponse]:
    """List recent campaigns belonging to authenticated user."""
    return await repo.list_user_campaigns(user.user_id, limit=limit)


@router.post(
    "",
    response_model=CampaignSessionResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def create_campaign(
    payload: CreateCampaignRequest,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
) -> StreamingResponse | CampaignSessionResponse:
    """Start a new multi-agent campaign planning DAG."""
    security.inspect_prompt_safety(payload.campaignObjective)

    if payload.stream:
        return StreamingResponse(
            engine.stream_create_campaign(
                payload, principal=user.email, user_id=user.user_id
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return await engine.create_campaign(
        payload, principal=user.email, user_id=user.user_id
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
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
) -> StreamingResponse | CampaignSessionResponse:
    """Submit human review approval or revision feedback."""
    if payload.feedback:
        security.inspect_prompt_safety(payload.feedback)

    session = await repo.get_session(sessionId, user_id=user.user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )

    if payload.stream:
        return StreamingResponse(
            engine.stream_stage_approval(
                sessionId, payload, principal=user.email, user_id=user.user_id
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    updated = await engine.approve_stage(
        sessionId, payload, principal=user.email, user_id=user.user_id
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return updated
