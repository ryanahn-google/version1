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
import logging
import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import (
    FileResponse,
    RedirectResponse,
    Response,
    StreamingResponse,
)
from fastapi.staticfiles import StaticFiles
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.orchestrator.draft_store import (
    DraftImageStore,
    get_draft_image_store,
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
from app.schemas.auth import (
    DevLoginRequest,
    GoogleAuthRequest,
    LogoutResponse,
    UserProfileResponse,
)
from app.schemas.campaign import (
    CampaignSessionResponse,
    CreateCampaignRequest,
    StageApprovalRequest,
)
from app.schemas.errors import ErrorResponse
from app.settings import get_settings

logger = logging.getLogger(__name__)

load_dotenv()

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(AGENT_DIR, "frontend", "dist")


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
    allow_origins=["*"],
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=get_settings().otel_to_cloud,
    lifespan=lifespan,
)
app.title = "Marketing Value Creator (MVC) API"
app.description = (
    "Enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime"
)
app.version = "1.0.0"


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
    settings = get_settings()
    return {
        "name": "Marketing Value Creator (MVC)",
        "version": "1.0.0",
        "region": "asia-northeast3",
        "models": {
            "orchestrator": "gemini-3.1-pro",
            "sub_agents": "gemini-3.5-flash-lite",
            "creative_image": "gemini-3.1-flash-lite-image",
        },
        "auth": {
            "googleClientId": settings.google_oauth_client_id,
        },
    }


# ==========================================
# Authentication & User Management Endpoints
# ==========================================


@app.post(
    "/api/v1/auth/google",
    response_model=UserProfileResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Authentication"],
)
async def login_with_google(
    payload: GoogleAuthRequest,
    response: Response,
    request: Request,
    security: SecurityManager = Depends(get_security_manager),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Verify Google OIDC ID token, auto-register/login user, and issue session cookie."""
    settings = get_settings()
    profile = security.verify_google_credential(payload.credential)
    user = await repo.create_or_update_google_user(
        google_sub=profile["sub"],
        email=profile["email"],
        name=profile["name"],
        picture=profile.get("picture"),
    )
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    token = await repo.create_auth_session(
        user_id=user.user_id,
        expires_days=settings.session_expire_days,
        ip_address=ip,
        user_agent=ua,
    )

    is_secure = settings.env == "production"
    response.set_cookie(
        key=security.session_cookie_name,
        value=token,
        max_age=settings.session_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@app.post(
    "/api/v1/auth/dev-login",
    response_model=UserProfileResponse,
    tags=["Authentication"],
)
async def dev_login(
    response: Response,
    request: Request,
    payload: DevLoginRequest | None = None,
    security: SecurityManager = Depends(get_security_manager),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Local development mock login establishing valid session cookie."""
    settings = get_settings()
    email = (payload and payload.email) or "dev-marketer@gmail.com"
    name = (payload and payload.name) or "Dev Marketer"
    user = await repo.create_or_update_google_user(
        google_sub=f"mock-sub-{email}",
        email=email,
        name=name,
        picture="https://lh3.googleusercontent.com/a/default-user",
    )
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    token = await repo.create_auth_session(
        user_id=user.user_id,
        expires_days=settings.session_expire_days,
        ip_address=ip,
        user_agent=ua,
    )

    is_secure = settings.env == "production"
    response.set_cookie(
        key=security.session_cookie_name,
        value=token,
        max_age=settings.session_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@app.get(
    "/api/v1/auth/me",
    response_model=UserProfileResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Authentication"],
)
async def get_current_user_profile(
    user: UserModel = Depends(get_current_user),
):
    """Return currently authenticated user profile."""
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@app.post(
    "/api/v1/auth/logout",
    response_model=LogoutResponse,
    tags=["Authentication"],
)
async def logout(
    request: Request,
    response: Response,
    repo: SessionRepository = Depends(get_session_repo),
    security: SecurityManager = Depends(get_security_manager),
):
    """Invalidate current session token in Cloud SQL and clear browser cookie."""
    token = request.cookies.get(security.session_cookie_name)
    if token:
        await repo.delete_auth_session(token)
    response.delete_cookie(key=security.session_cookie_name, path="/")
    return LogoutResponse(status="logged_out")


# ==========================================
# Campaign Planning & Lifecycle Endpoints
# ==========================================


@app.get(
    "/api/v1/campaigns",
    response_model=list[CampaignSessionResponse],
    responses={401: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def list_campaigns(
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
):
    """List recent campaigns belonging to authenticated user."""
    return await repo.list_user_campaigns(user.user_id)


@app.post(
    "/api/v1/campaigns",
    response_model=CampaignSessionResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def create_campaign(
    payload: CreateCampaignRequest,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
):
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


@app.get(
    "/api/v1/campaigns/{sessionId}",
    response_model=CampaignSessionResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Campaigns"],
)
async def get_campaign_session(
    sessionId: str,
    user: UserModel = Depends(get_current_user),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Retrieve full campaign session state and deliverables scoped by user."""
    session = await repo.get_session(sessionId, user_id=user.user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign session '{sessionId}' not found.",
        )
    return session


@app.get(
    "/api/v1/campaigns/{sessionId}/draft-image",
    tags=["Campaigns"],
    summary="Fetch in-memory draft marketing visual before approval",
)
async def get_draft_image(
    sessionId: str,
    draft_store: DraftImageStore = Depends(get_draft_image_store),
):
    """Serve in-memory draft marketing visual before Cloud Storage commitment."""
    draft = draft_store.get_draft(sessionId)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No in-memory draft image found for campaign session '{sessionId}'.",
        )
    image_bytes, mime_type = draft
    return Response(
        content=image_bytes,
        media_type=mime_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Disposition": f'inline; filename="draft_{sessionId}.png"',
        },
    )


@app.get(
    "/api/v1/campaigns/{sessionId}/visual",
    tags=["Campaigns"],
    summary="Access campaign visual via 307 redirect to V4 Signed URL or in-memory draft",
)
async def get_campaign_visual(
    sessionId: str,
    draft_store: DraftImageStore = Depends(get_draft_image_store),
    repo: SessionRepository = Depends(get_session_repo),
):
    """Serve campaign visual: in-memory draft if pending, or 307 redirect to GCS V4 Signed URL."""
    # 1. Check in-memory draft
    draft = draft_store.get_draft(sessionId)
    if draft:
        image_bytes, mime_type = draft
        return Response(
            content=image_bytes,
            media_type=mime_type,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Content-Disposition": f'inline; filename="draft_{sessionId}.png"',
            },
        )

    # 2. Check session in repository
    session = await repo.get_session(sessionId)
    if not session or not session.deliverables.creativeContent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No visual deliverable found for campaign session '{sessionId}'.",
        )

    creative = session.deliverables.creativeContent
    target_uri = creative.storageUri or creative.assetUrl
    if target_uri and target_uri.startswith("/api/v1/"):
        target_uri = creative.storageUri or None

    settings = get_settings()
    bucket_name = settings.artifacts_bucket_name or settings.resolved_bucket

    from app.storage_service import (
        extract_blob_path_from_gcs_url,
        generate_v4_signed_url,
        stream_gcs_blob,
    )

    blob_path = ""
    if target_uri:
        blob_path = extract_blob_path_from_gcs_url(target_uri, bucket_name)

    if not blob_path and bucket_name:
        if not session.userId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot access visual asset: Session has no associated user_id.",
            )
        blob_prefix = f"users/{session.userId}/campaigns/{sessionId}/"
        try:
            from google.cloud import storage

            client = storage.Client(project=settings.google_cloud_project)
            bucket = client.bucket(bucket_name)
            blobs = list(bucket.list_blobs(prefix=blob_prefix, max_results=1))
            if blobs:
                blob_path = blobs[0].name
        except Exception as scan_exc:
            logger.debug(
                "Failed scanning bucket for blob prefix %s: %s", blob_prefix, scan_exc
            )

    if not blob_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visual asset file not found in storage for session '{sessionId}'.",
        )

    # Method 1: Generate V4 Signed URL and return 307 Temporary Redirect
    signed_url = generate_v4_signed_url(
        blob_path=blob_path,
        bucket_name=bucket_name,
        expiration_minutes=60,
    )
    if signed_url:
        return RedirectResponse(
            url=signed_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Cache-Control": "public, max-age=3600"},
        )

    # Method 2 (Fallback / Offline Dev): Zero-memory socket chunked stream directly from GCS
    try:
        return StreamingResponse(
            stream_gcs_blob(blob_path=blob_path, bucket_name=bucket_name),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as stream_exc:
        logger.error("Failed streaming blob %s from GCS: %s", blob_path, stream_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed loading visual asset from Cloud Storage: {stream_exc}",
        ) from stream_exc


@app.get(
    "/api/v1/campaigns/{sessionId}/visual-token",
    tags=["Campaigns"],
    summary="Get ephemeral V4 Signed URL token for campaign visual",
)
async def get_campaign_visual_token(
    sessionId: str,
    repo: SessionRepository = Depends(get_session_repo),
):
    """Return JSON payload with direct V4 Signed URL and expiration."""
    session = await repo.get_session(sessionId)
    if not session or not session.deliverables.creativeContent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No visual deliverable found for campaign session '{sessionId}'.",
        )

    creative = session.deliverables.creativeContent
    target_uri = creative.storageUri or creative.assetUrl
    settings = get_settings()
    bucket_name = settings.artifacts_bucket_name or settings.resolved_bucket

    from app.storage_service import (
        extract_blob_path_from_gcs_url,
        generate_v4_signed_url,
    )

    blob_path = extract_blob_path_from_gcs_url(target_uri or "", bucket_name)
    if not blob_path and bucket_name:
        if not session.userId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate visual token: Session has no associated user_id.",
            )
        blob_prefix = f"users/{session.userId}/campaigns/{sessionId}/"
        try:
            from google.cloud import storage

            client = storage.Client(project=settings.google_cloud_project)
            bucket = client.bucket(bucket_name)
            blobs = list(bucket.list_blobs(prefix=blob_prefix, max_results=1))
            if blobs:
                blob_path = blobs[0].name
        except Exception as scan_exc:
            logger.debug(
                "Failed scanning bucket for blob prefix %s: %s", blob_prefix, scan_exc
            )

    if not blob_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visual asset blob not found in Cloud Storage for campaign '{sessionId}'.",
        )

    signed_url = generate_v4_signed_url(
        blob_path=blob_path,
        bucket_name=bucket_name,
        expiration_minutes=60,
    )
    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed generating Cloud Storage signed URL.",
        )
    return {"signedUrl": signed_url, "expiresIn": 3600}


@app.post(
    "/api/v1/campaigns/{sessionId}/approve",
    response_model=CampaignSessionResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    tags=["Campaigns"],
)
async def approve_stage(
    sessionId: str,
    payload: StageApprovalRequest,
    user: UserModel = Depends(get_current_user),
    security: SecurityManager = Depends(get_security_manager),
    engine: CampaignOrchestrationEngine = Depends(get_orchestration_engine),
    repo: SessionRepository = Depends(get_session_repo),
):
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


# Static files mount for compiled React SPA
_INDEX_HTML = os.path.join(STATIC_DIR, "index.html")


if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")


@app.get("/mvc", include_in_schema=False)
async def serve_mvc():
    """Serve compiled React SPA at /mvc entrypoint."""
    if os.path.isfile(_INDEX_HTML):
        return FileResponse(_INDEX_HTML)
    return {
        "status": "healthy",
        "service": "mvc-orchestrator",
        "detail": "Frontend bundle not compiled.",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
