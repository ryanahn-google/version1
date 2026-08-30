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

"""Unit tests for FastAPI docs and redoc endpoint security in production."""

import pytest
from fastapi.testclient import TestClient

from app.settings import SecuritySettings, Settings


def test_is_production_property() -> None:
    """Verify is_production property behavior on SecuritySettings and Settings."""
    assert SecuritySettings(env="production").is_production is True
    assert SecuritySettings(env="prod").is_production is True
    assert SecuritySettings(env="PROD").is_production is True
    assert SecuritySettings(env="Production").is_production is True

    assert SecuritySettings(env="development").is_production is False
    assert SecuritySettings(env="staging").is_production is False
    assert SecuritySettings(env="test").is_production is False
    assert SecuritySettings(env="local").is_production is False

    assert Settings(env="production").is_production is True
    assert Settings(env="development").is_production is False


def test_prod_docs_disabled_via_create_app(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify that in production _create_app disables docs_url and redoc_url."""
    from app.fast_api_app import _create_app
    from app.settings import get_settings

    monkeypatch.setenv("ENV", "production")
    get_settings.cache_clear()
    try:
        test_app = _create_app()
        assert test_app.docs_url is None
        assert test_app.redoc_url is None

        client = TestClient(test_app)
        assert client.get("/docs").status_code == 404
        assert client.get("/redoc").status_code == 404
    finally:
        get_settings.cache_clear()


def test_dev_docs_enabled_via_create_app(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify that in development _create_app keeps docs_url and redoc_url active."""
    from app.fast_api_app import _create_app
    from app.settings import get_settings

    monkeypatch.setenv("ENV", "development")
    get_settings.cache_clear()
    try:
        test_app = _create_app()
        assert test_app.docs_url == "/docs"
        assert test_app.redoc_url == "/redoc"

        client = TestClient(test_app)
        assert client.get("/docs").status_code == 200
        assert client.get("/redoc").status_code == 200
    finally:
        get_settings.cache_clear()
