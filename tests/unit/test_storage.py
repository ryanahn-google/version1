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

"""Unit tests for AssetStorageService dual-mode storage."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.storage import AssetStorageService
from app.settings import Settings


@pytest.mark.asyncio
async def test_save_visual_asset_local_development(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    """Verify local development mode writes bytes to static/generated and returns local URL."""
    monkeypatch.setenv("ENV", "development")
    monkeypatch.delenv("ARTIFACTS_BUCKET_NAME", raising=False)
    monkeypatch.delenv("LOGS_BUCKET_NAME", raising=False)

    settings = Settings()
    service = AssetStorageService(settings=settings)

    # Point local_dir to tmp_path for test isolation
    service.local_dir = tmp_path

    sample_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRtest"
    url = await service.save_visual_asset(
        image_bytes=sample_bytes,
        filename="test_mockup.png",
        session_id="camp-1234",
    )

    assert (tmp_path / "test_mockup.png").exists()
    assert (tmp_path / "test_mockup.png").read_bytes() == sample_bytes
    assert url.endswith("/generated/test_mockup.png")


@pytest.mark.asyncio
async def test_save_visual_asset_gcs_production(monkeypatch: pytest.MonkeyPatch):
    """Verify production mode uploads bytes to GCS bucket when configured."""
    monkeypatch.setenv("ENV", "prod")
    monkeypatch.setenv("ARTIFACTS_BUCKET_NAME", "my-test-bucket")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")

    settings = Settings()
    service = AssetStorageService(settings=settings)

    mock_storage_client = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    with patch("google.cloud.storage.Client", return_value=mock_storage_client):
        sample_bytes = b"fake_png_data"
        url = await service.save_visual_asset(
            image_bytes=sample_bytes,
            filename="prod_visual.png",
            session_id="camp-5678",
        )

        mock_storage_client.bucket.assert_called_once_with("my-test-bucket")
        mock_bucket.blob.assert_called_once_with("campaigns/camp-5678/prod_visual.png")
        mock_blob.upload_from_string.assert_called_once_with(
            sample_bytes, content_type="image/png"
        )
        assert (
            url
            == "https://storage.googleapis.com/my-test-bucket/campaigns/camp-5678/prod_visual.png"
        )
