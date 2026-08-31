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

"""Unit tests for [P1] Market Sensing Agent configuration and Google Search tool."""

from google.adk.tools import google_search
from google.adk.tools.google_search_tool import GoogleSearchTool

from app.agents.market_sensing.agent import (
    MODEL,
    app,
    market_sensing_agent,
)
from app.schemas.deliverables import MarketSensingDeliverable


def test_market_sensing_agent_tool_configuration() -> None:
    """Verify that market_sensing_agent has google_search tool configured."""
    assert market_sensing_agent.tools is not None
    assert len(market_sensing_agent.tools) == 1

    tool = market_sensing_agent.tools[0]
    assert isinstance(tool, GoogleSearchTool)
    assert tool is google_search
    assert tool.name == "google_search"


def test_market_sensing_agent_model_and_schema() -> None:
    """Verify model preservation and deliverable schema contract."""
    assert MODEL == "gemini-3.5-flash-lite"
    assert market_sensing_agent.model.model == "gemini-3.5-flash-lite"
    assert market_sensing_agent.output_schema == MarketSensingDeliverable


def test_market_sensing_instruction_guidelines() -> None:
    """Verify system instructions guide search usage and language requirements."""
    instruction = market_sensing_agent.instruction
    assert "google_search" in instruction
    assert "Google Search" in instruction
    assert "Consumer Behavior Trends" in instruction
    assert "Competitive Analysis" in instruction
    assert "Sentiment Overview" in instruction
    assert "Strategic Opportunities" in instruction
    assert "CRITICAL LANGUAGE DIRECTIVE" in instruction


def test_market_sensing_app_root_agent() -> None:
    """Verify ADK App naming and root agent binding."""
    assert app.name == "market_sensing"
    assert app.root_agent == market_sensing_agent
