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


def save_visual_marketing_asset(
    image_bytes: bytes,
    filename: str | None = None,
    session_id: str | None = None,
) -> str:
    """Save marketing visual bytes to GCS in staging/prod or local directory in dev.

    Returns the accessible HTTPS URL (or local serving URL).
    """
    if not filename:
        clean_id = (session_id or "default").replace(":", "_").replace("/", "_")
        filename = f"creative_{clean_id}_{uuid.uuid4().hex[:6]}.png"

    # 1. Resolve Project ID
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("PROJECT_ID")
    if not project:
        try:
            import urllib.request

            req = urllib.request.Request(
                "http://metadata.google.internal/computeMetadata/v1/project/project-id",
                headers={"Metadata-Flavor": "Google"},
            )
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                project = resp.read().decode("utf-8").strip()
        except Exception:
            pass

    # 2. Resolve Bucket Name
    bucket_name = os.environ.get("ARTIFACTS_BUCKET_NAME") or os.environ.get(
        "LOGS_BUCKET_NAME"
    )
    if not bucket_name and project and project not in ("sample-505914", "test-project"):
        bucket_name = f"{project}-version1-artifacts"

    # 3. Always attempt GCS upload if a bucket is resolved
    if bucket_name:
        try:
            from google.cloud import storage

            storage_client = storage.Client(project=project)
            bucket = storage_client.bucket(bucket_name)
            blob_path = f"campaigns/{session_id or 'default'}/{filename}"
            blob = bucket.blob(blob_path)
            blob.upload_from_string(image_bytes, content_type="image/png")
            gcs_url = f"https://storage.googleapis.com/{bucket_name}/{blob_path}"
            logger.info("Subagent successfully uploaded visual to GCS: %s", gcs_url)
            return gcs_url
        except Exception as exc:
            logger.warning(
                "GCS upload to %s failed (%s). Attempting local fallback.",
                bucket_name,
                exc,
            )

    # Local development / fallback storage
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
        return "https://storage.googleapis.com/mvc-artifacts-public/campaigns/galaxy_s27_visual.jpg"
