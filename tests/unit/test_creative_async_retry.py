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

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.creative_content.agent import synthesize_nano_banana_image


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
