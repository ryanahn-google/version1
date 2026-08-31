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

"""Visual marketing asset retrieval and Cloud Storage serving routes."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from google.cloud import storage

from app import storage_service
from app.orchestrator.draft_store import (
    DraftImageStore,
    get_draft_image_store,
)
from app.orchestrator.session_repo import (
    SessionRepository,
    get_session_repo,
)
from app.schemas.campaign import CampaignSessionResponse
from app.settings import get_settings

logger = logging.getLogger(__name__)

CampaignSession = CampaignSessionResponse

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns"])


@router.get(
    "/{sessionId}/draft-image",
    summary="Fetch in-memory draft marketing visual before approval",
)
async def get_draft_image(
    sessionId: str,
    draft_store: DraftImageStore = Depends(get_draft_image_store),
) -> Response:
    """Serve in-memory draft marketing visual before Cloud Storage commitment."""
    draft = draft_store.get_draft(sessionId)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No in-memory draft image found for campaign session '{sessionId}'."
            ),
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


def _resolve_visual_blob_path(
    session: CampaignSession,
    session_id: str,
    bucket_name: str,
    project_id: str,
) -> tuple[str, str]:
    """Resolve target bucket and GCS blob path for a campaign session.

    Args:
        session: Campaign session containing deliverable details.
        session_id: Campaign session identifier.
        bucket_name: Default fallback Cloud Storage bucket name.
        project_id: Google Cloud project ID for storage client initialization.

    Returns:
        A tuple of (target_bucket, blob_path).

    Raises:
        HTTPException: If user ID is missing when scanning user directory.
    """
    creative = session.deliverables.creativeContent
    if not creative:
        return bucket_name, ""

    target_uri = creative.storageUri or creative.assetUrl
    if target_uri and target_uri.startswith("/api/v1/"):
        target_uri = creative.storageUri or None

    target_bucket = bucket_name
    blob_path = ""
    if target_uri:
        target_bucket, blob_path = storage_service.extract_bucket_and_blob_path(
            target_uri, default_bucket=bucket_name
        )

    if not blob_path and target_bucket:
        if not session.userId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot access visual asset: Session has no associated user_id.",
            )
        blob_prefix = f"users/{session.userId}/campaigns/{session_id}/"
        try:
            client = storage.Client(project=project_id)
            bucket = client.bucket(target_bucket)
            blobs = list(bucket.list_blobs(prefix=blob_prefix, max_results=1))
            if blobs:
                blob_path = blobs[0].name
        except Exception as scan_exc:
            logger.debug(
                "Failed scanning bucket for blob prefix %s: %s",
                blob_prefix,
                scan_exc,
            )

    return target_bucket, blob_path


@router.get(
    "/{sessionId}/visual",
    summary="Access campaign visual via 307 redirect to V4 Signed URL or in-memory draft",
)
async def get_campaign_visual(
    sessionId: str,
    draft_store: DraftImageStore = Depends(get_draft_image_store),
    repo: SessionRepository = Depends(get_session_repo),
) -> Response:
    """Serve campaign visual: in-memory draft or 307 redirect to GCS V4 Signed URL."""
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

    settings = get_settings()
    default_bucket = settings.artifacts_bucket_name or settings.resolved_bucket

    target_bucket, blob_path = _resolve_visual_blob_path(
        session=session,
        session_id=sessionId,
        bucket_name=default_bucket,
        project_id=settings.google_cloud_project,
    )

    if not blob_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visual asset file not found in storage for session '{sessionId}'.",
        )

    # Method 1: Generate V4 Signed URL and return 307 Temporary Redirect
    signed_url = storage_service.generate_v4_signed_url(
        blob_path=blob_path,
        bucket_name=target_bucket,
        expiration_minutes=60,
    )
    if signed_url:
        return RedirectResponse(
            url=signed_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Cache-Control": "public, max-age=3600"},
        )

    # Method 2 (Fallback / Offline Dev): Direct byte read from GCS or safe fallback redirect
    image_bytes = storage_service.get_blob_bytes(
        blob_path=blob_path, bucket_name=target_bucket
    )
    if image_bytes:
        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )

    # Object not found or unavailable in GCS: cleanly redirect to sample fallback visual
    logger.info(
        "Visual blob '%s' not present in GCS. Redirecting to fallback asset.",
        blob_path,
    )
    return RedirectResponse(
        url=storage_service.FALLBACK_ASSET_URL,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get(
    "/{sessionId}/visual-token",
    summary="Get ephemeral V4 Signed URL token for campaign visual",
)
async def get_campaign_visual_token(
    sessionId: str,
    repo: SessionRepository = Depends(get_session_repo),
) -> dict[str, Any]:
    """Return JSON payload with direct V4 Signed URL and expiration."""
    session = await repo.get_session(sessionId)
    if not session or not session.deliverables.creativeContent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No visual deliverable found for campaign session '{sessionId}'.",
        )

    settings = get_settings()
    default_bucket = settings.artifacts_bucket_name or settings.resolved_bucket

    target_bucket, blob_path = _resolve_visual_blob_path(
        session=session,
        session_id=sessionId,
        bucket_name=default_bucket,
        project_id=settings.google_cloud_project,
    )

    if not blob_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Visual asset blob not found in Cloud Storage for campaign "
                f"'{sessionId}'."
            ),
        )

    signed_url = storage_service.generate_v4_signed_url(
        blob_path=blob_path,
        bucket_name=target_bucket,
        expiration_minutes=60,
    )
    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed generating Cloud Storage signed URL.",
        )
    return {"signedUrl": signed_url, "expiresIn": 3600}
