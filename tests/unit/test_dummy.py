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

import pytest

from app.schemas.campaign import CreateCampaignRequest


def test_create_campaign_request_validation() -> None:
    """Verify CreateCampaignRequest schema defaults and constraints."""
    req = CreateCampaignRequest(
        brandName="Nova Electronics Corp",
        productName="Galaxy S27 Ultra",
        campaignObjective="Global holiday launch",
        targetAudience="Tech professionals",
        budgetAmount=100000.0,
    )
    assert req.currency == "USD"
    assert req.stream is False
    assert len(req.channels) == 4


def test_root_endpoint_does_not_redirect_to_dev_ui() -> None:
    """Verify root / does not redirect to ADK /dev-ui/ and web is disabled."""
    from starlette.testclient import TestClient

    from app.fast_api_app import app

    client = TestClient(app, follow_redirects=False)
    resp = client.get("/")
    assert resp.status_code == 200
    assert "/dev-ui/" not in resp.headers.get("location", "")

    # Confirm ADK dev-ui is not mounted
    dev_ui_resp = client.get("/dev-ui/", follow_redirects=False)
    assert dev_ui_resp.status_code == 404


@pytest.mark.asyncio
async def test_parse_campaign_prompt_fallback() -> None:
    """Verify parse_campaign_prompt falls back cleanly to objective-only."""
    from app.orchestrator.a2a_client import A2ASubAgentClient

    client = A2ASubAgentClient()
    prompt = "20대 대학생 타겟으로 신제품 런칭 캠페인 기획해줘"
    parsed = await client.parse_campaign_prompt(prompt, language="ko")

    assert parsed.campaignObjective == prompt
    assert parsed.brandName == ""
    assert parsed.productName == ""
    assert parsed.targetAudience == ""
    assert parsed.budgetAmount is None
    assert parsed.currency == "KRW"
    assert parsed.channels == []
