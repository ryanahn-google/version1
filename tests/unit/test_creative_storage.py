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

"""Unit tests for creative_content GCS-only asset storage."""

import os
from unittest.mock import MagicMock, patch

import pytest

from app.agents.creative_content.storage_service import (
    FALLBACK_ASSET_URL,
    save_visual_marketing_asset,
)


def test_save_visual_marketing_asset_gcs_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify image is uploaded exclusively to GCS and no local files are created."""
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv("ARTIFACTS_BUCKET_NAME", "test-artifacts-bucket")
    monkeypatch.setenv("ENV", "staging")

    fake_client = MagicMock()
    fake_bucket = MagicMock()
    fake_blob = MagicMock()
    fake_client.bucket.return_value = fake_bucket
    fake_bucket.blob.return_value = fake_blob

    with patch("google.cloud.storage.Client", return_value=fake_client):
        url = save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="mockup.png",
            session_id="test_session",
        )

    assert (
        url
        == "https://storage.googleapis.com/test-artifacts-bucket/campaigns/test_session/mockup.png"
    )
    fake_blob.upload_from_string.assert_called_once_with(
        b"fake_png_data", content_type="image/png"
    )
    assert not os.path.exists("static/generated")
    assert not os.path.exists("static")


def test_save_visual_marketing_asset_fallback_without_local_write(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify fallback URL is returned without creating local disk files when GCS fails."""
    monkeypatch.delenv("ARTIFACTS_BUCKET_NAME", raising=False)
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv("ENV", "development")

    with (
        patch("google.cloud.storage.Client", side_effect=RuntimeError("No GCS")),
        patch(
            "app.agents.creative_content.storage_service._upload_via_direct_http",
            return_value=False,
        ),
    ):
        url = save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="fallback.png",
            session_id="test_session",
        )

    assert url == FALLBACK_ASSET_URL
    assert not os.path.exists("static/generated")
    assert not os.path.exists("static")
