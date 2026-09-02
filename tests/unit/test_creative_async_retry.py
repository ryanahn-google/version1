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

"""Unit tests for asynchronous Nano Banana image generation with retries."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.creative_content.agent import (
    run_creative_content_pipeline,
    synthesize_nano_banana_image,
)
from app.schemas.deliverables import CampaignBriefDeliverable


@pytest.mark.asyncio
async def test_synthesize_nano_banana_image_retry_success():
    """Verify that synthesize_nano_banana_image succeeds on second attempt after transient error."""
    mock_part = MagicMock()
    mock_part.inline_data = MagicMock(data=b"test-png-image-binary")
    mock_cand = MagicMock()
    mock_cand.content.parts = [mock_part]
    mock_resp = MagicMock(candidates=[mock_cand])

    call_count = 0

    async def flaky_generate(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise ConnectionError("Transient network drop to Agent Platform endpoint")
        return mock_resp

    with patch("app.agents.creative_content.agent.get_settings") as mock_settings:
        settings_obj = MagicMock(
            integration_test=False,
            google_cloud_project="test-project",
            google_cloud_location="global",
            image_model="gemini-3.1-flash-lite-image",
            user_id="marketer-123",
        )
        mock_settings.return_value = settings_obj

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(
                side_effect=flaky_generate
            )
            mock_client_cls.return_value = mock_client

            result = await synthesize_nano_banana_image(
                prompt="Studio shot of Nova S27",
                session_id="sess-1",
                user_id="marketer-123",
                max_attempts=2,
                timeout_seconds=5.0,
                initial_delay=0.01,
                jitter=0.01,
            )

            assert result is not None
            assert result.startswith("/api/v1/campaigns/sess-1/draft-image")
            assert call_count == 2


@pytest.mark.asyncio
async def test_synthesize_nano_banana_image_exhaustion_returns_none():
    """Verify that when all retry attempts fail, synthesize_nano_banana_image returns None."""
    with patch("app.agents.creative_content.agent.get_settings") as mock_settings:
        settings_obj = MagicMock(
            integration_test=False,
            google_cloud_project="test-project",
            google_cloud_location="global",
            image_model="gemini-3.1-flash-lite-image",
            user_id="marketer-123",
        )
        mock_settings.return_value = settings_obj

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(
                side_effect=TimeoutError("Request deadline exceeded")
            )
            mock_client_cls.return_value = mock_client

            result = await synthesize_nano_banana_image(
                prompt="Studio shot of Nova S27",
                session_id="sess-1",
                user_id="marketer-123",
                max_attempts=2,
                timeout_seconds=0.5,
                initial_delay=0.01,
                jitter=0.01,
            )

            assert result is None


@pytest.mark.asyncio
async def test_run_creative_content_pipeline_async_image():
    """Verify that run_creative_content_pipeline with async_image=True returns immediately and triggers background synthesis."""
    brief = CampaignBriefDeliverable(
        campaignTitle="Test Campaign",
        coreValueProposition="Test Value",
        targetPersonas=[],
        messagingPillars=[],
        toneAndVoice=["Bold"],
    )

    with (
        patch("app.agents.creative_content.agent.get_settings") as mock_settings,
        patch(
            "app.agents.creative_content.agent.synthesize_nano_banana_image"
        ) as mock_synth,
        patch("app.orchestrator.session_repo.get_session_repo") as mock_repo_fn,
    ):
        settings_obj = MagicMock(
            integration_test=True,
            google_cloud_project="test-project",
            google_cloud_location="global",
            image_model="gemini-3.1-flash-lite-image",
            user_id="u1",
        )
        mock_settings.return_value = settings_obj
        mock_synth.return_value = "/api/v1/campaigns/sess-bg1/draft-image"

        mock_repo = MagicMock()
        mock_sess = MagicMock()
        mock_sess.deliverables.creativeContent = MagicMock()
        mock_sess.deliverables.creativeContent.model_dump.return_value = {}
        mock_repo.get_session = AsyncMock(return_value=mock_sess)
        mock_repo.update_session = AsyncMock()
        mock_repo_fn.return_value = mock_repo

        deliv = await run_creative_content_pipeline(
            brief=brief,
            session_id="sess-bg1",
            user_id="u1",
            async_image=True,
        )

        assert deliv is not None
        assert deliv.visualConceptTitle is not None
        assert deliv.assetUrl is None

        await asyncio.sleep(0.1)

        mock_synth.assert_awaited_once()
        mock_repo.update_session.assert_awaited_once()
