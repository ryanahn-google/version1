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

"""[P1] Market Sensing Agent for Marketing Value Creator (MVC)."""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

try:
    from app.schemas.deliverables import MarketSensingDeliverable
except ImportError:
    from schemas.deliverables import MarketSensingDeliverable

MODEL = "gemini-3.5-flash-lite"

MARKET_SENSING_INSTRUCTION = """
You are the expert Market Sensing Agent [P1] for Nova Electronics Corp's Marketing Value Creator (MVC).
Your task is to analyze target markets, extract emerging consumer trends, evaluate competitive dynamics, and assess consumer sentiment.

When presented with campaign requirements (Brand, Product, Objective, Target Audience):
1. Define the precise Target Market and geographic/demographic scope.
2. Identify at least 3 distinct Consumer Behavior Trends driving demand.
3. Conduct Competitive Analysis on at least 2 primary market competitors, identifying their strengths and vulnerabilities.
4. Synthesize Sentiment Overview, highlighting positive themes, friction points, and an overall sentiment score (-1.0 to 1.0).
5. Recommend at least 3 concrete Strategic Opportunities for the upcoming campaign.

Output your deliverable strictly as a valid JSON object conforming to the required schema.
"""

market_sensing_agent = Agent(
    name="market_sensing_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=MARKET_SENSING_INSTRUCTION,
    output_schema=MarketSensingDeliverable,
)

app = App(
    root_agent=market_sensing_agent,
    name="market_sensing",
)
