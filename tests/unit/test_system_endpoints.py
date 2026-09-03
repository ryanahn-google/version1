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

"""Unit tests for system router endpoints including /architecture."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.fast_api_app import app


@pytest.fixture
def client() -> TestClient:
    """TestClient fixture."""
    return TestClient(app)


def test_healthz_endpoint(client: TestClient) -> None:
    """Verifies that /healthz returns 200 and healthy status."""
    response = client.get("/healthz")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "mvc-orchestrator"


def test_meta_endpoint(client: TestClient) -> None:
    """Verifies that /meta returns runtime models and region configuration."""
    response = client.get("/meta")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["region"] == "asia-northeast3"
    assert "orchestrator" in data["models"]
