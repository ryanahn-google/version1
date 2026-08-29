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

import logging
import os
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

FALLBACK_ASSET_URL = "https://storage.googleapis.com/mvc-artifacts-public/campaigns/galaxy_s27_visual.jpg"


def _resolve_project_and_bucket() -> tuple[str, str, bool]:
    """Resolve effective (project_id, bucket_name, is_cloud_env)."""
    env = os.environ.get("ENV", "").lower()
    app_url = os.environ.get("APP_URL", "")

    # Detect if running in GCP cloud environment (Agent Runtime or Cloud Run)
    is_agent_runtime = (
        "aiplatform.googleapis.com" in app_url or "reasoningEngines" in app_url
    )
    is_cloud_run = bool(os.environ.get("K_SERVICE"))
    is_cloud_env = (
        is_agent_runtime or is_cloud_run or env in ("prod", "production", "staging")
    )

    # Determine whether target is prod or staging
    is_prod = env in ("prod", "production") or "4915168819879608320" in app_url
    target_project = "capstone-prod-506811" if is_prod else "capstone-staging-506811"

    # Read explicit env vars if present
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("PROJECT_ID")
    if not project or project in ("sample-505914", "test-project") or project.isdigit():
        project = target_project

    bucket_name = os.environ.get("ARTIFACTS_BUCKET_NAME")
    if not bucket_name:
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
) -> str:
    """Save marketing visual bytes to GCS in cloud environments or local directory in dev.

    Returns the accessible public HTTPS GCS URL (or local serving URL in dev).
    """
    if not filename:
        clean_id = (session_id or "default").replace(":", "_").replace("/", "_")
        filename = f"creative_{clean_id}_{uuid.uuid4().hex[:6]}.png"

    project, bucket_name, is_cloud_env = _resolve_project_and_bucket()
    blob_path = f"campaigns/{session_id or 'default'}/{filename}"
    gcs_url = f"https://storage.googleapis.com/{bucket_name}/{blob_path}"

    # 1. In Cloud Environment (Agent Runtime or Cloud Run) or if bucket is configured:
    if is_cloud_env or bucket_name:
        # Method A: Google Cloud Storage SDK
        try:
            from google.cloud import storage

            storage_client = storage.Client(project=project)
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.upload_from_string(image_bytes, content_type="image/png")
            logger.info(
                "Subagent successfully uploaded visual to GCS (SDK): %s", gcs_url
            )
            return gcs_url
        except Exception as sdk_exc:
            logger.warning(
                "GCS SDK upload to %s failed (%s). Attempting direct GCS HTTP REST API...",
                bucket_name,
                sdk_exc,
            )

        # Method B: Direct GCS HTTP REST API (ADC Token)
        if _upload_via_direct_http(bucket_name, blob_path, image_bytes):
            logger.info(
                "Subagent successfully uploaded visual to GCS (REST): %s", gcs_url
            )
            return gcs_url

        # If in Agent Runtime or Cloud Run, do NOT fall back to container local disk!
        if is_cloud_env:
            logger.error(
                "All GCS upload methods failed in cloud environment. Returning fallback URL."
            )
            return FALLBACK_ASSET_URL

    # 2. Local development fallback (strictly local workstation dev)
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    local_dir = project_root / "static" / "generated"
    try:
        local_dir.mkdir(parents=True, exist_ok=True)
        local_path = local_dir / filename
        local_path.write_bytes(image_bytes)
        app_url = os.environ.get("APP_URL", "http://127.0.0.1:8000").rstrip("/")
        if "0.0.0.0" in app_url:
            app_url = app_url.replace("0.0.0.0", "127.0.0.1")
        return f"{app_url}/generated/{filename}"
    except Exception as exc:
        logger.error("Local asset persistence failed: %s", exc)
        return FALLBACK_ASSET_URL
