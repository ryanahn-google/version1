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
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.storage_service import (
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
            user_id="user-123",
        )

    assert (
        url
        == "https://storage.googleapis.com/test-artifacts-bucket/users/user-123/campaigns/test_session/mockup.png"
    )
    fake_blob.upload_from_string.assert_called_once_with(
        b"fake_png_data", content_type="image/png"
    )
    assert not os.path.exists("static/generated")
    assert not os.path.exists("static")


def test_save_visual_marketing_asset_default_filename(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify default filename format creative_{session_id}_{hash}.png when filename is omitted."""
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv(
        "ARTIFACTS_BUCKET_NAME", "capstone-staging-506811-version1-artifacts"
    )
    monkeypatch.setenv("ENV", "staging")

    fake_client = MagicMock()
    fake_bucket = MagicMock()
    fake_blob = MagicMock()
    fake_client.bucket.return_value = fake_bucket
    fake_bucket.blob.return_value = fake_blob

    with patch("google.cloud.storage.Client", return_value=fake_client):
        url = save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            session_id="camp-50954146",
            user_id="f4aeb07f-9778-4328-ada4-f9f8236e1191",
        )

    expected_prefix = (
        "https://storage.googleapis.com/capstone-staging-506811-version1-artifacts/users/"
        "f4aeb07f-9778-4328-ada4-f9f8236e1191/campaigns/camp-50954146/creative_camp-50954146_"
    )
    assert url.startswith(expected_prefix)
    assert url.endswith(".png")
    fake_blob.upload_from_string.assert_called_once_with(
        b"fake_png_data", content_type="image/png"
    )


def test_save_visual_marketing_asset_rejects_missing_or_default_user() -> None:
    """Verify ValueError is raised if user_id is missing or 'default'."""
    with pytest.raises(ValueError, match="Invalid user_id"):
        save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="mockup.png",
            session_id="test_session",
            user_id=None,
        )

    with pytest.raises(ValueError, match="Invalid user_id"):
        save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="mockup.png",
            session_id="test_session",
            user_id="default",
        )


def test_save_visual_marketing_asset_rejects_missing_or_default_session() -> None:
    """Verify ValueError is raised if session_id is missing or 'default'."""
    with pytest.raises(ValueError, match="Invalid session_id"):
        save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="mockup.png",
            session_id=None,
            user_id="user-123",
        )

    with pytest.raises(ValueError, match="Invalid session_id"):
        save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="mockup.png",
            session_id="default",
            user_id="user-123",
        )


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
            "app.storage_service._upload_via_direct_http",
            return_value=False,
        ),
    ):
        url = save_visual_marketing_asset(
            image_bytes=b"fake_png_data",
            filename="fallback.png",
            session_id="test_session",
            user_id="user-123",
        )

    assert url == FALLBACK_ASSET_URL
    assert not os.path.exists("static/generated")
    assert not os.path.exists("static")


def test_extract_blob_path_from_gcs_url() -> None:
    """Verify blob path extraction from https and gs URLs."""
    from app.storage_service import (
        extract_blob_path_from_gcs_url,
    )

    https_url = (
        "https://storage.googleapis.com/test-bucket/users/u123/campaigns/s1/img.png"
    )
    assert (
        extract_blob_path_from_gcs_url(https_url, "test-bucket")
        == "users/u123/campaigns/s1/img.png"
    )

    gs_url = "gs://test-bucket/campaigns/s1/img.png"
    assert (
        extract_blob_path_from_gcs_url(gs_url, "test-bucket") == "campaigns/s1/img.png"
    )


def test_generate_v4_signed_url_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify V4 Signed URL generation with service account credentials."""
    from app.storage_service import generate_v4_signed_url

    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv("ARTIFACTS_BUCKET_NAME", "test-bucket")

    fake_client = MagicMock()
    fake_bucket = MagicMock()
    fake_blob = MagicMock()
    fake_client.bucket.return_value = fake_bucket
    fake_bucket.blob.return_value = fake_blob

    fake_creds = MagicMock()
    fake_creds.service_account_email = "test-sa@example.com"
    fake_creds.token = "mock-bearer-token"
    fake_creds.valid = True
    fake_client._credentials = fake_creds

    expected_signed = "https://storage.googleapis.com/test-bucket/img.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abcd"
    fake_blob.generate_signed_url.return_value = expected_signed

    with patch("google.cloud.storage.Client", return_value=fake_client):
        signed_url = generate_v4_signed_url(
            blob_path="img.png",
            bucket_name="test-bucket",
            expiration_minutes=30,
        )

    assert signed_url == expected_signed
    fake_blob.generate_signed_url.assert_called_once()
    call_kwargs = fake_blob.generate_signed_url.call_args[1]
    assert call_kwargs["version"] == "v4"
    assert call_kwargs["service_account_email"] == "test-sa@example.com"
    assert call_kwargs["access_token"] == "mock-bearer-token"


def test_get_campaign_visual_307_redirect(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify GET /api/v1/campaigns/{sessionId}/visual returns 307 redirect to V4 signed URL."""
    from starlette.testclient import TestClient

    from app.fast_api_app import app
    from app.schemas.campaign import (
        CampaignDeliverables,
        CampaignSessionResponse,
        CampaignStage,
        CampaignStatus,
    )
    from app.schemas.deliverables import CreativeContentDeliverable
    from app.settings import get_settings

    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv("ARTIFACTS_BUCKET_NAME", "test-bucket")
    get_settings.cache_clear()

    mock_deliverables = CampaignDeliverables(
        creativeContent=CreativeContentDeliverable(
            visualConceptTitle="Concept A",
            visualPromptUsed="Prompt",
            assetUrl="/api/v1/campaigns/sess-visual-test/visual",
            storageUri="https://storage.googleapis.com/test-bucket/users/u1/campaigns/sess-visual-test/visual.png",
            headlineCopy="Headline",
            bodyCopy="Body",
            callToAction="CTA",
        )
    )
    mock_session = CampaignSessionResponse(
        sessionId="sess-visual-test",
        userId="u1",
        brandName="Brand",
        productName="Product",
        campaignObjective="Awareness",
        budgetAmount=1000.0,
        currency="USD",
        currentStage=CampaignStage.PERFORMANCE_INSIGHTS,
        status=CampaignStatus.PAUSED_FOR_REVIEW,
        deliverables=mock_deliverables,
    )

    fake_repo = MagicMock()
    fake_repo.get_session = AsyncMock(return_value=mock_session)

    expected_signed = "https://storage.googleapis.com/test-bucket/users/u1/campaigns/sess-visual-test/visual.png?signed=true"

    from app.fast_api_app import get_session_repo

    app.dependency_overrides[get_session_repo] = lambda: fake_repo

    try:
        with (
            patch(
                "app.storage_service.generate_v4_signed_url",
                return_value=expected_signed,
            ),
            TestClient(app) as client,
        ):
            response = client.get(
                "/api/v1/campaigns/sess-visual-test/visual", follow_redirects=False
            )

        assert response.status_code == 307
        assert response.headers["location"] == expected_signed
        assert "max-age=3600" in response.headers["cache-control"]
    finally:
        app.dependency_overrides.pop(get_session_repo, None)


def test_get_campaign_visual_token_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify GET /api/v1/campaigns/{sessionId}/visual-token returns JSON token."""
    from starlette.testclient import TestClient

    from app.fast_api_app import app
    from app.schemas.campaign import (
        CampaignDeliverables,
        CampaignSessionResponse,
        CampaignStage,
        CampaignStatus,
    )
    from app.schemas.deliverables import CreativeContentDeliverable
    from app.settings import get_settings

    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "capstone-staging-506811")
    monkeypatch.setenv("ARTIFACTS_BUCKET_NAME", "test-bucket")
    get_settings.cache_clear()

    mock_deliverables = CampaignDeliverables(
        creativeContent=CreativeContentDeliverable(
            visualConceptTitle="Concept A",
            visualPromptUsed="Prompt",
            assetUrl="/api/v1/campaigns/sess-visual-test/visual",
            storageUri="https://storage.googleapis.com/test-bucket/users/u1/campaigns/sess-visual-test/visual.png",
            headlineCopy="Headline",
            bodyCopy="Body",
            callToAction="CTA",
        )
    )
    mock_session = CampaignSessionResponse(
        sessionId="sess-visual-test",
        userId="u1",
        brandName="Brand",
        productName="Product",
        campaignObjective="Awareness",
        budgetAmount=1000.0,
        currency="USD",
        currentStage=CampaignStage.PERFORMANCE_INSIGHTS,
        status=CampaignStatus.PAUSED_FOR_REVIEW,
        deliverables=mock_deliverables,
    )

    fake_repo = MagicMock()
    fake_repo.get_session = AsyncMock(return_value=mock_session)

    expected_signed = "https://storage.googleapis.com/test-bucket/users/u1/campaigns/sess-visual-test/visual.png?signed=true"

    from app.fast_api_app import get_session_repo

    app.dependency_overrides[get_session_repo] = lambda: fake_repo

    try:
        with (
            patch(
                "app.storage_service.generate_v4_signed_url",
                return_value=expected_signed,
            ),
            TestClient(app) as client,
        ):
            response = client.get("/api/v1/campaigns/sess-visual-test/visual-token")

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["signedUrl"] == expected_signed
        assert json_data["expiresIn"] == 3600
    finally:
        app.dependency_overrides.pop(get_session_repo, None)
