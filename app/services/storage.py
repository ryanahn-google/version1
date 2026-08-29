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

"""Asset storage service providing dual-mode persistence for generated marketing visuals."""

from __future__ import annotations

import functools
import logging
import os
import uuid
from pathlib import Path

from app.settings import Settings, get_settings

logger = logging.getLogger(__name__)


class AssetStorageService:
    """Handles storage of generated visual marketing assets across local and cloud environments."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.project_root = Path(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        )
        self.local_dir = self.project_root / "static" / "generated"
        self.local_dir.mkdir(parents=True, exist_ok=True)

    async def save_visual_asset(
        self,
        image_bytes: bytes,
        filename: str | None = None,
        session_id: str | None = None,
    ) -> str:
        """Persist generated marketing image bytes and return an accessible HTTP or GCS URL.

        - Production (ENV in 'prod', 'production', 'staging' or ARTIFACTS_BUCKET_NAME set):
          Uploads image to Google Cloud Storage (GCS) and returns public HTTPS URL.
        - Local Development (ENV == 'development' or bucket unset):
          Saves locally to static/generated/{filename} and returns the FastAPI serving URL.
        """
        if not filename:
            filename = f"creative_{uuid.uuid4().hex[:8]}.png"

        bucket_name = (
            self.settings.artifacts_bucket_name or self.settings.resolved_bucket
        )
        if not bucket_name:
            project = self.settings.google_cloud_project
            if project and project:
                bucket_name = f"{project}-version1-artifacts"

        is_prod = (
            self.settings.env.lower() in ("prod", "production", "staging")
            or bool(self.settings.artifacts_bucket_name)
        ) and bool(bucket_name)

        if is_prod and bucket_name:
            try:
                from google.cloud import storage

                storage_client = storage.Client(
                    project=self.settings.google_cloud_project
                )
                bucket = storage_client.bucket(bucket_name)
                blob_path = f"campaigns/{session_id or 'default'}/{filename}"
                blob = bucket.blob(blob_path)
                blob.upload_from_string(image_bytes, content_type="image/png")
                gcs_url = f"https://storage.googleapis.com/{bucket_name}/{blob_path}"
                logger.info("Persisted generated asset to GCS: %s", gcs_url)
                return gcs_url
            except Exception as exc:
                logger.warning(
                    "GCS upload to %s failed (%s). Falling back to local storage.",
                    bucket_name,
                    exc,
                )

        # Local development / fallback storage
        local_file_path = self.local_dir / filename
        local_file_path.write_bytes(image_bytes)
        logger.info("Persisted generated asset locally: %s", local_file_path)

        base_url = self.settings.app_url.rstrip("/")
        if "0.0.0.0" in base_url:
            base_url = base_url.replace("0.0.0.0", "127.0.0.1")
        return f"{base_url}/generated/{filename}"


@functools.cache
def get_asset_storage_service() -> AssetStorageService:
    """Obtain cached singleton AssetStorageService instance."""
    return AssetStorageService()
