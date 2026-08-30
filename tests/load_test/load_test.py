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

"""Load test suite simulating campaign creation and retrieval workflows."""

import logging
import os
import uuid
from typing import Any

from locust import HttpUser, between, task

CAMPAIGNS_ENDPOINT = "/api/v1/campaigns"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class CampaignLoadUser(HttpUser):
    """Simulates marketers creating and monitoring campaign workflows."""

    wait_time = between(1, 3)

    def _get_headers(self) -> dict[str, str]:
        """Construct authorization headers from environment or dev defaults."""
        headers = {"Content-Type": "application/json"}
        token = (
            os.environ.get("_ID_TOKEN")
            or os.environ.get("ID_TOKEN")
            or "dev-marketer@nova.com"
        )
        headers["Authorization"] = f"Bearer {token}"
        return headers

    @task(3)
    def create_and_retrieve_campaign(self) -> None:
        """Create a new campaign session and retrieve its latest status."""
        headers = self._get_headers()
        run_tag = uuid.uuid4().hex[:8]
        payload: dict[str, Any] = {
            "brandName": "Nova Electronics Corp",
            "productName": f"Galaxy S27-{run_tag}",
            "campaignObjective": (
                "Automated load test: Global marketing value creation launch"
            ),
            "targetAudience": (
                "Enterprise decision makers and technology professionals"
            ),
            "budgetAmount": 500000.0,
            "currency": "USD",
            "channels": ["Digital Video", "Paid Search", "Social Media"],
        }

        # 1. Create Campaign
        with self.client.post(
            CAMPAIGNS_ENDPOINT,
            name="POST /api/v1/campaigns",
            headers=headers,
            json=payload,
            catch_response=True,
        ) as create_resp:
            if create_resp.status_code == 429:
                create_resp.failure("Rate limited (HTTP 429)")
                return
            if create_resp.status_code not in (200, 201):
                create_resp.failure(
                    f"Create failed with HTTP {create_resp.status_code}: "
                    f"{create_resp.text[:120]}"
                )
                return

            try:
                data = create_resp.json()
                session_id = data.get("sessionId")
            except ValueError as exc:
                create_resp.failure(f"Failed to parse JSON response: {exc}")
                return

            if not session_id:
                create_resp.failure("Missing sessionId in response payload")
                return

        # 2. Retrieve Campaign Session State
        get_url = f"{CAMPAIGNS_ENDPOINT}/{session_id}"
        with self.client.get(
            get_url,
            name="GET /api/v1/campaigns/[sessionId]",
            headers=headers,
            catch_response=True,
        ) as get_resp:
            if get_resp.status_code != 200:
                get_resp.failure(
                    f"Get session failed with HTTP {get_resp.status_code}: "
                    f"{get_resp.text[:120]}"
                )

    @task(1)
    def list_user_campaigns(self) -> None:
        """List active campaigns for authenticated user."""
        headers = self._get_headers()
        with self.client.get(
            CAMPAIGNS_ENDPOINT,
            name="GET /api/v1/campaigns",
            headers=headers,
            catch_response=True,
        ) as list_resp:
            if list_resp.status_code != 200:
                list_resp.failure(
                    f"List campaigns failed with HTTP {list_resp.status_code}: "
                    f"{list_resp.text[:120]}"
                )
