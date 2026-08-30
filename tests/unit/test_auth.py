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

"""Unit tests for user authentication, session repository, and GCS isolation."""

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.fast_api_app import app
from app.orchestrator.draft_store import DraftImageStore
from app.orchestrator.session_repo import SessionRepository
from app.storage_service import save_visual_marketing_asset


@pytest.mark.asyncio
async def test_user_creation_and_update(tmp_path):
    """Verify Google user creation with UUID v4 and subsequent update."""
    db_file = tmp_path / "test_auth.db"
    repo = SessionRepository(f"sqlite+aiosqlite:///{db_file}")

    # 1. Create user
    user1 = await repo.create_or_update_google_user(
        google_sub="google-sub-12345",
        email="test-user@gmail.com",
        name="Test User",
        picture="https://example.com/pic.png",
    )
    assert user1.email == "test-user@gmail.com"
    assert user1.name == "Test User"
    assert user1.role == "MARKETER"
    # Verify user_id is a valid UUID
    uuid_obj = uuid.UUID(user1.user_id)
    assert str(uuid_obj) == user1.user_id

    # 2. Update user on re-login
    user2 = await repo.create_or_update_google_user(
        google_sub="google-sub-12345",
        email="test-user@gmail.com",
        name="Updated Name",
        picture="https://example.com/new_pic.png",
    )
    assert user2.user_id == user1.user_id
    assert user2.name == "Updated Name"
    assert user2.picture == "https://example.com/new_pic.png"


@pytest.mark.asyncio
async def test_session_lifecycle(tmp_path):
    """Verify session creation, sliding-window extension, and deletion."""
    db_file = tmp_path / "test_session.db"
    repo = SessionRepository(f"sqlite+aiosqlite:///{db_file}")

    user = await repo.create_or_update_google_user(
        google_sub="sub-999",
        email="marketer@gmail.com",
        name="Marketer Jane",
    )

    # 1. Create session token
    token = await repo.create_auth_session(
        user_id=user.user_id,
        expires_days=7,
        ip_address="127.0.0.1",
        user_agent="pytest-client",
    )
    assert isinstance(token, str)
    assert len(token) > 30

    # 2. Retrieve user by valid token
    fetched_user = await repo.get_user_by_session_token(token)
    assert fetched_user is not None
    assert fetched_user.user_id == user.user_id
    assert fetched_user.email == "marketer@gmail.com"

    # 3. Retrieve user by nonexistent token
    none_user = await repo.get_user_by_session_token("nonexistent-token-abc")
    assert none_user is None

    # 4. Delete session (logout)
    await repo.delete_auth_session(token)
    logged_out_user = await repo.get_user_by_session_token(token)
    assert logged_out_user is None


def test_storage_service_user_isolation():
    """Verify GCS blob paths include user_id when provided."""
    fake_png = b"\x89PNG\r\n\x1a\ntest_bytes"
    user_id = "u-uuid-1234"
    session_id = "camp-abc"

    with (
        patch(
            "app.storage_service._resolve_project_and_bucket",
            return_value=("test-proj", "test-bucket", "test-loc"),
        ),
        patch(
            "app.storage_service._upload_via_direct_http",
            return_value=True,
        ),
    ):
        url = save_visual_marketing_asset(
            fake_png, session_id=session_id, user_id=user_id
        )
        assert (
            f"https://storage.googleapis.com/test-bucket/users/{user_id}/campaigns/{session_id}/"
            in url
        )


def test_commit_draft_to_gcs_with_user_id():
    """Verify commit_draft_to_gcs forwards user_id to storage service."""
    store = DraftImageStore()
    session_id = "test-camp-user"
    user_id = "user-uuid-999"
    fake_png = b"\x89PNG\r\n\x1a\nimage_data"

    store.save_draft(session_id, fake_png)
    assert store.has_draft(session_id)

    with patch(
        "app.storage_service.save_visual_marketing_asset",
        return_value=f"https://storage.googleapis.com/test-bucket/users/{user_id}/campaigns/{session_id}/creative.png",
    ) as mock_save:
        gcs_url = store.commit_draft_to_gcs(session_id, user_id=user_id)
        assert gcs_url is not None
        assert f"users/{user_id}/campaigns/{session_id}" in gcs_url
        mock_save.assert_called_once_with(
            fake_png, session_id=session_id, user_id=user_id
        )


def test_api_auth_flow():
    """Test full API authentication flow with mock dev login, /me, and /logout."""
    client = TestClient(app)

    # 1. /meta should return auth.googleClientId key
    meta_res = client.get("/meta")
    assert meta_res.status_code == 200
    meta_json = meta_res.json()
    assert "auth" in meta_json
    assert "googleClientId" in meta_json["auth"]
    assert meta_json["auth"]["devLoginEnabled"] is True

    # 2. /api/v1/auth/me without cookie should be 401
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401

    # 3. /api/v1/auth/dev-login should succeed and set mvc_session cookie
    login_res = client.post(
        "/api/v1/auth/dev-login",
        json={"email": "custom-dev@gmail.com", "name": "Custom Dev"},
    )
    assert login_res.status_code == 200
    user_data = login_res.json()
    assert user_data["email"] == "custom-dev@gmail.com"
    assert user_data["name"] == "Custom Dev"
    assert "userId" in user_data
    assert "mvc_session" in login_res.cookies

    # 4. /api/v1/auth/me with session cookie should return user profile
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "custom-dev@gmail.com"

    # 5. /api/v1/campaigns should list user's campaigns
    campaigns_res = client.get("/api/v1/campaigns")
    assert campaigns_res.status_code == 200
    assert isinstance(campaigns_res.json(), list)

    # 6. /api/v1/auth/logout should clear cookie
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "logged_out"


def test_long_bearer_token_and_jwt():
    """Verify that oversized Bearer tokens and JWT ID tokens don't overflow DB columns."""
    client = TestClient(app)

    # 1. Bearer token with long simulated Google ID token (JWT)
    import base64
    import json

    payload = {
        "email": "loadtest-sa@capstone-staging-506811.iam.gserviceaccount.com",
        "sub": "104829381923891",
        "name": "Load Test SA",
    }
    b64_payload = (
        base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    )
    fake_jwt = f"eyJhbGciOiJSUzI1NiJ9.{b64_payload}." + "sig" * 200
    assert len(fake_jwt) > 600

    resp = client.get(
        "/api/v1/campaigns", headers={"Authorization": f"Bearer {fake_jwt}"}
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # 2. Bearer token with long arbitrary non-JWT string (>500 chars)
    long_string = "dev-token-" + "x" * 500
    resp2 = client.get(
        "/api/v1/campaigns", headers={"Authorization": f"Bearer {long_string}"}
    )
    assert resp2.status_code == 200
    assert isinstance(resp2.json(), list)


@pytest.mark.parametrize("env_name", ["staging", "production", "prod"])
def test_dev_login_disabled_in_staging_and_prod(
    monkeypatch: pytest.MonkeyPatch, env_name: str
) -> None:
    """Verify /meta and /dev-login behavior in staging and production."""
    from app.settings import get_settings

    monkeypatch.setenv("ENV", env_name)
    get_settings.cache_clear()

    client = TestClient(app)

    # 1. /meta should return devLoginEnabled = False and correct env
    meta_res = client.get("/meta")
    assert meta_res.status_code == 200
    meta_json = meta_res.json()
    assert meta_json["env"] == env_name
    assert meta_json["auth"]["devLoginEnabled"] is False

    # 2. /api/v1/auth/dev-login should return 403 Forbidden
    login_res = client.post(
        "/api/v1/auth/dev-login",
        json={"email": "hacker@gmail.com", "name": "Hacker"},
    )
    assert login_res.status_code == 403
    assert (
        "Developer quick login is disabled in staging and production"
        " environments." in login_res.json()["detail"]
    )


def test_dev_login_enabled_in_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify /meta and /dev-login behavior in development environment."""
    from app.settings import get_settings

    monkeypatch.setenv("ENV", "development")
    get_settings.cache_clear()

    client = TestClient(app)

    # 1. /meta should return devLoginEnabled = True and env = development
    meta_res = client.get("/meta")
    assert meta_res.status_code == 200
    meta_json = meta_res.json()
    assert meta_json["env"] == "development"
    assert meta_json["auth"]["devLoginEnabled"] is True

    # 2. /api/v1/auth/dev-login should succeed
    login_res = client.post(
        "/api/v1/auth/dev-login",
        json={"email": "dev-user@gmail.com", "name": "Dev User"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["email"] == "dev-user@gmail.com"
