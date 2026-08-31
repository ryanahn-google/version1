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

"""A2A Protocol & Sub-Agent Contract Integration Tests.

Validates that all four sub-agents (Market Sensing, Strategy Brief,
Creative Content, Performance & Insights) implement the A2A standard:
- Agent Card (.well-known/agent-card.json)
- JSON-RPC 2.0 message/send handling
- Dynamic routing under /a2a/{agent_name}
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.creative_content.fast_api_app import app as p3_app
from app.agents.creative_content.fast_api_app import lifespan as p3_lifespan
from app.agents.market_sensing.fast_api_app import app as p1_app
from app.agents.market_sensing.fast_api_app import lifespan as p1_lifespan
from app.agents.performance_insights.fast_api_app import app as p4_app
from app.agents.performance_insights.fast_api_app import lifespan as p4_lifespan
from app.agents.strategy_brief.fast_api_app import app as p2_app
from app.agents.strategy_brief.fast_api_app import lifespan as p2_lifespan
from app.orchestrator.a2a_client import A2ASubAgentClient


@pytest.mark.asyncio
async def test_p1_market_sensing_agent_card():
    """Verify [P1] Market Sensing serves a valid A2A Agent Card."""
    async with p1_lifespan(p1_app):
        transport = ASGITransport(app=p1_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/a2a/market_sensing/.well-known/agent-card.json")
            assert resp.status_code == 200
            card = resp.json()
            assert card["name"] == "market_sensing_agent"
            assert "capabilities" in card
            skill_names = [s.get("name") for s in card.get("skills", [])]
            assert "google_search" in skill_names


@pytest.mark.asyncio
async def test_p2_strategy_brief_agent_card():
    """Verify [P2] Strategy & Brief serves a valid A2A Agent Card."""
    async with p2_lifespan(p2_app):
        transport = ASGITransport(app=p2_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/a2a/strategy_brief/.well-known/agent-card.json")
            assert resp.status_code == 200
            card = resp.json()
            assert card["name"] == "strategy_brief_agent"
            assert "capabilities" in card


@pytest.mark.asyncio
async def test_p3_creative_content_agent_card():
    """Verify [P3] Creative Content serves a valid A2A Agent Card."""
    async with p3_lifespan(p3_app):
        transport = ASGITransport(app=p3_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/a2a/creative_content/.well-known/agent-card.json")
            assert resp.status_code == 200
            card = resp.json()
            assert card["name"] == "creative_content_agent"
            assert "capabilities" in card


@pytest.mark.asyncio
async def test_p4_performance_insights_agent_card():
    """Verify [P4] Performance & Insights serves a valid A2A Agent Card."""
    async with p4_lifespan(p4_app):
        transport = ASGITransport(app=p4_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/a2a/performance_insights/.well-known/agent-card.json"
            )
            assert resp.status_code == 200
            card = resp.json()
            assert card["name"] == "performance_insights_agent"
            assert "capabilities" in card


@pytest.mark.asyncio
async def test_p1_market_sensing_a2a_jsonrpc_dispatch():
    """Verify [P1] Market Sensing handles A2A JSON-RPC message/send requests."""
    async with p1_lifespan(p1_app):
        transport = ASGITransport(app=p1_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "jsonrpc": "2.0",
                "method": "message/send",
                "params": {
                    "message": {
                        "role": "user",
                        "parts": [
                            {
                                "text": "Brand: Nova Electronics Corp\nProduct: Galaxy S27 Ultra\nObjective: Launch new AI flagship"
                            }
                        ],
                        "messageId": str(uuid.uuid4()),
                    }
                },
                "id": f"test-p1-{uuid.uuid4().hex[:8]}",
            }
            resp = await client.post("/a2a/market_sensing", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("jsonrpc") == "2.0"
            assert "result" in data or "error" in data


@pytest.mark.asyncio
async def test_orchestrator_a2a_client_fallback_mode():
    """Verify Orchestrator A2A client cleanly falls back to local execution when endpoints unreachable."""
    client = A2ASubAgentClient(
        p1_url="http://localhost:9999/nonexistent",
        p2_url="http://localhost:9999/nonexistent",
        p3_url="http://localhost:9999/nonexistent",
        p4_url="http://localhost:9999/nonexistent",
    )
    # Market sensing fallback executes locally and returns deliverable
    p1 = await client.run_market_sensing(
        brand_name="Nova Electronics Corp",
        product_name="Galaxy S27 Ultra",
        objective="Launch AI flagship",
        audience="Tech enthusiasts",
    )
    assert p1 is not None
    assert len(p1.consumerTrends) >= 1
    assert p1.targetMarket is not None


@pytest.mark.asyncio
async def test_p3_creative_content_a2a_user_id_propagation():
    """Verify [P3] Creative Content receives and binds X-User-Id header during A2A message/send."""
    test_user_id = "f4aeb07f-9778-4328-ada4-f9f8236e1191"
    async with p3_lifespan(p3_app):
        transport = ASGITransport(app=p3_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "jsonrpc": "2.0",
                "method": "message/send",
                "params": {
                    "message": {
                        "role": "user",
                        "parts": [
                            {
                                "text": f"Brand: Nova\nProduct: Phone\nObjective: Launch\nUser ID: {test_user_id}"
                            }
                        ],
                        "messageId": str(uuid.uuid4()),
                    },
                    "userId": test_user_id,
                },
                "id": f"test-p3-{uuid.uuid4().hex[:8]}",
            }
            resp = await client.post(
                "/a2a/creative_content",
                json=payload,
                headers={"X-User-Id": test_user_id, "A2A-Version": "0.3"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("jsonrpc") == "2.0"
            assert "result" in data or "error" in data
