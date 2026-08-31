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

"""Unit tests for A2A user context propagation and ADK user binding."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from a2a.auth.user import UnauthenticatedUser
from a2a.server.agent_execution import RequestContext
from a2a.server.context import ServerCallContext
from google.adk.a2a.converters.request_converter import _get_user_id
from starlette.datastructures import Headers

from app.agents.creative_content.a2a_utils import (
    _A2AHeaderUser,
    _A2AServerCallContextBuilder,
)
from app.agents.creative_content.agent import generate_marketing_visual
from app.orchestrator.a2a_client import A2ASubAgentClient
from app.settings import get_settings


class _FakeRequest:
    """Helper fake Starlette Request object for unit tests."""

    def __init__(
        self,
        headers: dict[str, str] | None = None,
        json_data: dict | None = None,
        scope: dict | None = None,
    ) -> None:
        self.headers = Headers(headers or {})
        self._json = json_data or {}
        self.scope = scope or {}


def test_a2a_header_user_properties() -> None:
    """Verify _A2AHeaderUser returns correct identity and authentication status."""
    user = _A2AHeaderUser("user-uuid-12345")
    assert user.user_name == "user-uuid-12345"
    assert user.is_authenticated is True

    empty_user = _A2AHeaderUser("")
    assert empty_user.user_name == ""
    assert empty_user.is_authenticated is False


def test_context_builder_extracts_x_user_id_header() -> None:
    """Verify _A2AServerCallContextBuilder extracts user from X-User-Id header."""
    builder = _A2AServerCallContextBuilder()
    req = _FakeRequest(headers={"X-User-Id": "f4aeb07f-9778-4328-ada4-f9f8236e1191"})

    user = builder.build_user(req)
    assert isinstance(user, _A2AHeaderUser)
    assert user.user_name == "f4aeb07f-9778-4328-ada4-f9f8236e1191"
    assert user.is_authenticated is True


def test_context_builder_extracts_case_insensitive_header() -> None:
    """Verify _A2AServerCallContextBuilder handles lowercase and capitalized headers."""
    builder = _A2AServerCallContextBuilder()

    req_lower = _FakeRequest(headers={"x-user-id": "lower-user-id"})
    user_lower = builder.build_user(req_lower)
    assert isinstance(user_lower, _A2AHeaderUser)
    assert user_lower.user_name == "lower-user-id"

    req_cap = _FakeRequest(headers={"X-User-ID": "cap-user-id"})
    user_cap = builder.build_user(req_cap)
    assert isinstance(user_cap, _A2AHeaderUser)
    assert user_cap.user_name == "cap-user-id"


def test_context_builder_extracts_from_json_body_fallback() -> None:
    """Verify _A2AServerCallContextBuilder extracts user from params.userId when header is absent."""
    builder = _A2AServerCallContextBuilder()

    # Test params.userId
    req_body = _FakeRequest(
        headers={},
        json_data={
            "jsonrpc": "2.0",
            "method": "message/send",
            "params": {"userId": "body-user-uuid-777"},
        },
    )
    user_body = builder.build_user(req_body)
    assert isinstance(user_body, _A2AHeaderUser)
    assert user_body.user_name == "body-user-uuid-777"

    # Test params.user_id
    req_body_snake = _FakeRequest(
        headers={},
        json_data={
            "jsonrpc": "2.0",
            "method": "message/send",
            "params": {"user_id": "snake-user-uuid-888"},
        },
    )
    user_snake = builder.build_user(req_body_snake)
    assert isinstance(user_snake, _A2AHeaderUser)
    assert user_snake.user_name == "snake-user-uuid-888"


def test_context_builder_unauthenticated_fallback() -> None:
    """Verify _A2AServerCallContextBuilder returns UnauthenticatedUser when no identity present."""
    builder = _A2AServerCallContextBuilder()
    req = _FakeRequest(headers={}, json_data={"jsonrpc": "2.0", "params": {}})

    user = builder.build_user(req)
    assert isinstance(user, UnauthenticatedUser)
    assert user.user_name == ""
    assert user.is_authenticated is False


def test_adk_get_user_id_resolution_with_header_user() -> None:
    """Verify ADK _get_user_id resolves call_context user_name instead of A2A_USER_{context_id}."""
    authenticated_user = _A2AHeaderUser("real-marketer-uuid")
    call_ctx = ServerCallContext(user=authenticated_user)
    req_ctx = RequestContext(call_context=call_ctx, context_id="camp-session-42")

    resolved_user_id = _get_user_id(req_ctx)
    assert resolved_user_id == "real-marketer-uuid"
    assert not resolved_user_id.startswith("A2A_USER_")


def test_adk_get_user_id_fallback_when_unauthenticated() -> None:
    """Verify ADK _get_user_id falls back to A2A_USER_{context_id} when user is unauthenticated."""
    unauthenticated = UnauthenticatedUser()
    call_ctx = ServerCallContext(user=unauthenticated)
    req_ctx = RequestContext(call_context=call_ctx, context_id="camp-session-42")

    resolved_user_id = _get_user_id(req_ctx)
    assert resolved_user_id == "A2A_USER_camp-session-42"


@pytest.mark.asyncio
async def test_a2a_client_call_remote_dual_transmission() -> None:
    """Verify Orchestrator A2A client transmits user_id via both X-User-Id header and params.userId."""
    client = A2ASubAgentClient()

    fake_response = AsyncMock()
    fake_response.status = 200
    fake_response.raise_for_status = MagicMock()
    fake_response.json = AsyncMock(return_value={"result": {"artifacts": []}})

    fake_post_ctx = MagicMock()
    fake_post_ctx.__aenter__ = AsyncMock(return_value=fake_response)
    fake_post_ctx.__aexit__ = AsyncMock(return_value=None)

    fake_session = MagicMock()
    fake_session.post = MagicMock(return_value=fake_post_ctx)
    fake_session_ctx = MagicMock()
    fake_session_ctx.__aenter__ = AsyncMock(return_value=fake_session)
    fake_session_ctx.__aexit__ = AsyncMock(return_value=None)

    with patch("aiohttp.ClientSession", return_value=fake_session_ctx):
        await client._call_remote_a2a(
            endpoint_url="http://mock-p3-endpoint/a2a",
            prompt_text="Generate marketing visuals",
            context_id="camp-12345",
            user_id="user-target-uuid-999",
        )

    fake_session.post.assert_called_once()
    call_kwargs = fake_session.post.call_args[1]

    # Verify header transmission
    assert call_kwargs["headers"]["X-User-Id"] == "user-target-uuid-999"

    # Verify payload transmission
    payload = call_kwargs["json"]
    assert payload["params"]["userId"] == "user-target-uuid-999"
    assert payload["params"]["contextId"] == "camp-12345"


def test_generate_marketing_visual_ignores_synthetic_a2a_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify generate_marketing_visual ignores A2A_USER_{context_id} and falls back to settings.user_id."""
    monkeypatch.setenv("INTEGRATION_TEST", "FALSE")
    monkeypatch.setenv("USER_ID", "fallback-default-user")
    get_settings.cache_clear()

    settings = get_settings()
    expected_fallback_user = settings.user_id

    fake_session = MagicMock()
    fake_session.id = "camp-test-sess"
    fake_session.user_id = "A2A_USER_camp-test-sess"

    fake_context = MagicMock()
    fake_context.session = fake_session
    fake_context.user_id = None

    with patch(
        "app.agents.creative_content.agent.get_draft_image_store",
        return_value=None,
    ):
        with patch("google.genai.Client") as mock_client:
            mock_ai = MagicMock()
            mock_client.return_value = mock_ai
            mock_part = MagicMock()
            mock_part.inline_data = MagicMock(data=b"fake_png")
            mock_candidate = MagicMock(content=MagicMock(parts=[mock_part]))
            mock_ai.models.generate_content.return_value = MagicMock(
                candidates=[mock_candidate]
            )

            with patch(
                "app.agents.creative_content.storage_service.save_visual_marketing_asset"
            ) as mock_save:
                mock_save.return_value = (
                    "https://storage.googleapis.com/bucket/path.png"
                )

                generate_marketing_visual(
                    visual_prompt="Studio shot of Galaxy S27 Ultra",
                    session_id="camp-test-sess",
                    user_id=None,
                    tool_context=fake_context,
                )

                mock_save.assert_called_once()
                save_kwargs = mock_save.call_args[1]
                assert save_kwargs["user_id"] == expected_fallback_user
                assert not save_kwargs["user_id"].startswith("A2A_USER_")


@pytest.mark.asyncio
async def test_a2a_remote_call_blocks_model_armor() -> None:
    """Verify _call_remote_a2a translates Model Armor block to HTTP 400."""
    from fastapi import HTTPException

    client = A2ASubAgentClient()
    mock_resp = MagicMock()
    mock_resp.status = 400
    mock_resp.text = AsyncMock(
        return_value='{"error": "Prompt rejected by Model Armor inspection."}'
    )

    class FakePostContext:
        async def __aenter__(self):
            return mock_resp

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    class FakeSession:
        def post(self, *args, **kwargs):
            return FakePostContext()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("aiohttp.ClientSession", return_value=FakeSession()):
        with pytest.raises(HTTPException) as exc_info:
            await client._call_remote_a2a(
                endpoint_url="https://mock-endpoint",
                prompt_text="malicious prompt",
            )
        assert exc_info.value.status_code == 400
        assert "Model Armor" in exc_info.value.detail
