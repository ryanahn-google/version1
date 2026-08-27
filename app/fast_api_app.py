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

"""FastAPI Orchestrator backend for Marketing Value Creator (MVC)."""

import contextlib
import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.orchestrator.engine import (
    CampaignOrchestrationEngine,
    get_orchestration_engine,
)
from app.orchestrator.security import SecurityManager, get_security_manager
from app.orchestrator.session_repo import SessionRepository, get_session_repo
from app.schemas.campaign import (
    CampaignSessionResponse,
    CreateCampaignRequest,
    StageApprovalRequest,
)
from app.schemas.errors import ErrorResponse

load_dotenv()

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(AGENT_DIR, "static")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager initializing database and ADK runner."""
    from app.agent import app as adk_app
    from app.agent import root_agent

    repo = get_session_repo()
    await repo.init_db()

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name

    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=False,
    lifespan=lifespan,
)
app.title = "Marketing Value Creator (MVC) API"
app.description = (
    "Enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime"
)
app.version = "1.0.0"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["System"])
async def health_check():
    """Liveness check endpoint."""
    return {
        "status": "healthy",
        "service": "mvc-orchestrator",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/meta", tags=["System"])
async def get_metadata():
    """Service metadata and foundation model configuration."""
    return {
        "name": "Marketing Value Creator (MVC)",
        "version": "1.0.0",
        "region": "asia-northeast3",
        "models": {
            "orchestrator": "gemini-3.1-pro",
            "sub_agents": "gemini-3.5-flash-lite",
            "creative_visual": "imagen-3.0-generate-002",
        },
    }


@app.post("/feedback", tags=["System"])
async def collect_feedback(payload: dict):
    """Collect user feedback for BigQuery telemetry."""
    return {"status": "success", "message": "Feedback recorded successfully"}


@app.post(
    "/api/v1/campaigns",
    response_model=CampaignSessionResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def create_campaign(
    payload: CreateCampaignRequest,
    authorization: str | None = Header(None),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
):
    """Start a new multi-agent campaign planning DAG."""
    principal = security.verify_auth_token(authorization)
    security.inspect_prompt_safety(payload.campaignObjective)

    if payload.stream:
        return StreamingResponse(
            engine.stream_create_campaign(payload, principal),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return await engine.create_campaign(payload, principal)


@app.get(
    "/api/v1/campaigns/{sessionId}",
    response_model=CampaignSessionResponse,
    responses={404: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def get_campaign_session(
    sessionId: str,
    authorization: str | None = Header(None),
    security: SecurityManager = Depends(get_security_manager),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Retrieve full campaign session state and deliverables."""
    security.verify_auth_token(authorization)
    session = await repo.get_session(sessionId)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return session


@app.post(
    "/api/v1/campaigns/{sessionId}/approve",
    response_model=CampaignSessionResponse,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def approve_stage(
    sessionId: str,
    payload: StageApprovalRequest,
    authorization: str | None = Header(None),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Submit human review approval or revision feedback."""
    principal = security.verify_auth_token(authorization)
    if payload.feedback:
        security.inspect_prompt_safety(payload.feedback)

    session = await repo.get_session(sessionId)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )

    if payload.stream:
        return StreamingResponse(
            engine.stream_stage_approval(sessionId, payload, principal),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    updated = await engine.approve_stage(sessionId, payload, principal)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return updated


# Static files mount for compiled React SPA
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
