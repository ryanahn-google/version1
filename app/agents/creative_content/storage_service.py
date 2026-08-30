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

"""Self-contained storage service for [P3] Creative Content subagent."""

from __future__ import annotations

import datetime
import logging
import uuid
from collections.abc import Iterator
from typing import Any

try:
    from app.settings import get_settings
except ImportError:
    from settings import get_settings

logger = logging.getLogger(__name__)

FALLBACK_ASSET_URL = "https://storage.googleapis.com/mvc-artifacts-public/campaigns/galaxy_s27_visual.jpg"


def _resolve_project_and_bucket() -> tuple[str, str, bool]:
    """Resolve effective (project_id, bucket_name, is_cloud_env)."""
    settings = get_settings()
    env = (settings.env or "").lower()
    app_url = settings.app_url or ""

    # Detect if running in GCP cloud environment (Agent Runtime or Cloud Run)
    is_agent_runtime = (
        "aiplatform.googleapis.com" in app_url or "reasoningEngines" in app_url
    )
    is_cloud_run = settings.is_cloud_run
    is_cloud_env = (
        is_agent_runtime or is_cloud_run or env in ("prod", "production", "staging")
    )

    # Read project directly from settings (BaseSettings from .env or OS env)
    project = settings.google_cloud_project or ""

    # Read bucket from settings, falling back to project-scoped convention if project is set
    bucket_name = settings.artifacts_bucket_name or settings.resolved_bucket or ""
    if not bucket_name and project:
        bucket_name = f"{project}-version1-artifacts"

    return project, bucket_name, is_cloud_env


def _upload_via_direct_http(
    bucket_name: str, blob_path: str, image_bytes: bytes
) -> bool:
    """Upload directly to GCS JSON REST API via google-auth token."""
    try:
        import urllib.request

        import google.auth
        from google.auth.transport.requests import Request

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/devstorage.read_write"]
        )
        credentials.refresh(Request())
        token = credentials.token
        if not token:
            return False

        upload_url = (
            f"https://storage.googleapis.com/upload/storage/v1/b/{bucket_name}/o"
            f"?uploadType=media&name={blob_path}"
        )
        req = urllib.request.Request(
            upload_url,
            data=image_bytes,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "image/png",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as exc:
        logger.warning("Direct GCS REST API upload failed: %s", exc)
        return False


def save_visual_marketing_asset(
    image_bytes: bytes,
    filename: str | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
) -> str:
    """Save marketing visual bytes exclusively to Google Cloud Storage under users/{user_id}/campaigns/{campaign_id}/.

    Returns the accessible HTTPS GCS URL or fallback URL.
    Never writes to local filesystem.
    """
    if not user_id or user_id == "default":
        raise ValueError(
            f"Invalid user_id: {user_id!r}. Visual marketing assets must be stored "
            "under a valid user ID path: users/{user_id}/campaigns/{campaign_id}/"
        )

    if not session_id or session_id == "default":
        raise ValueError(
            f"Invalid session_id: {session_id!r}. Visual marketing assets must be stored "
            "under a valid campaign ID path: users/{user_id}/campaigns/{campaign_id}/"
        )

    if not filename:
        filename = f"creative_{session_id}_{uuid.uuid4().hex[:6]}.png"

    project, bucket_name, _ = _resolve_project_and_bucket()
    blob_path = f"users/{user_id}/campaigns/{session_id}/{filename}"
    gcs_url = f"https://storage.googleapis.com/{bucket_name}/{blob_path}"

    if bucket_name:
        # Method A: Google Cloud Storage SDK
        try:
            from google.cloud import storage

            storage_client = storage.Client(project=project)
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.upload_from_string(image_bytes, content_type="image/png")
            logger.info("Uploaded visual to GCS (SDK): %s", gcs_url)
            return gcs_url
        except Exception as sdk_exc:
            logger.warning(
                "GCS SDK upload to %s failed (%s). Attempting direct GCS REST API...",
                bucket_name,
                sdk_exc,
            )

        # Method B: Direct GCS HTTP REST API (ADC Token)
        if _upload_via_direct_http(bucket_name, blob_path, image_bytes):
            logger.info("Uploaded visual to GCS (REST): %s", gcs_url)
            return gcs_url

    logger.warning("GCS upload unavailable or unconfigured. Returning fallback URL.")
    return FALLBACK_ASSET_URL


def extract_blob_path_from_gcs_url(url: str, bucket_name: str | None = None) -> str:
    """Extract object blob path from a gs:// or https://storage.googleapis.com URL."""
    if not url:
        return ""
    if url.startswith("gs://"):
        parts = url[5:].split("/", 1)
        return parts[1] if len(parts) == 2 else url

    prefix = "https://storage.googleapis.com/"
    if url.startswith(prefix):
        path_without_prefix = url[len(prefix) :]
        parts = path_without_prefix.split("/", 1)
        if len(parts) == 2:
            # If bucket_name matches first part, strip it
            if bucket_name and parts[0] == bucket_name:
                return parts[1]
            return parts[1]
    return url


def generate_v4_signed_url(
    blob_path: str,
    bucket_name: str | None = None,
    expiration_minutes: int = 60,
) -> str | None:
    """Generate ephemeral Google Cloud V4 Signed URL for direct browser download.

    Uses the service account's token creator credentials (roles/iam.serviceAccountTokenCreator)
    via IAM signBlob API without requiring a local private key file.
    """
    project, default_bucket, _ = _resolve_project_and_bucket()
    target_bucket = bucket_name or default_bucket
    if not target_bucket:
        return None

    clean_blob_path = extract_blob_path_from_gcs_url(blob_path, target_bucket)

    try:
        from google.auth.transport.requests import Request
        from google.cloud import storage

        client = storage.Client(project=project)
        bucket = client.bucket(target_bucket)
        blob = bucket.blob(clean_blob_path)

        credentials = client._credentials
        refresh_fn = getattr(credentials, "refresh", None)
        if callable(refresh_fn) and (
            not getattr(credentials, "valid", False)
            or not getattr(credentials, "token", None)
        ):
            try:
                refresh_fn(Request())
            except Exception as ref_exc:
                logger.debug("Credentials refresh skipped/failed: %s", ref_exc)

        settings = get_settings()
        sa_email = (
            getattr(credentials, "service_account_email", None)
            or settings.service_account_email
        )
        token = getattr(credentials, "token", None)

        signed_url_kwargs: dict[str, Any] = {
            "version": "v4",
            "expiration": datetime.timedelta(minutes=expiration_minutes),
            "method": "GET",
        }
        if sa_email and token:
            signed_url_kwargs["service_account_email"] = sa_email
            signed_url_kwargs["access_token"] = token

        signed_url = blob.generate_signed_url(**signed_url_kwargs)
        logger.info(
            "Generated V4 signed URL for blob '%s' in bucket '%s' (expires in %dm).",
            clean_blob_path,
            target_bucket,
            expiration_minutes,
        )
        return signed_url
    except Exception as exc:
        logger.warning(
            "GCS V4 Signed URL generation failed for '%s' (%s).", clean_blob_path, exc
        )
        return None