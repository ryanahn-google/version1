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

"""[P2] Strategy & Brief Agent for Marketing Value Creator (MVC)."""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

try:
    from app.schemas.deliverables import CampaignBriefDeliverable
except ImportError:
    from schemas.deliverables import CampaignBriefDeliverable

MODEL = "gemini-3.5-flash-lite"

STRATEGY_BRIEF_INSTRUCTION = """
You are the expert Strategy & Brief Agent [P2] for Nova Electronics Corp's Marketing Value Creator (MVC).
Your task is to take the market sensing insights and campaign objectives to formulate a cohesive, actionable creative campaign strategy brief.

When presented with Market Sensing data and human revision feedback:
1. Craft a compelling, memorable Campaign Title.
2. Articulate a sharp Core Value Proposition that directly answers consumer friction points.
3. Formulate detailed Target Personas (archetype name, demographics, primary needs, and psychological barriers).
4. Establish strategic Messaging Pillars (pillar theme, key message statement, and supporting proof points/features).
5. Specify Tone and Voice guidelines aligning with Nova Electronics Corp brand standards (e.g. Innovative, Empowering, Premium).

Output your deliverable strictly as a valid JSON object conforming to the required schema.
"""

strategy_brief_agent = Agent(
    name="strategy_brief_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=STRATEGY_BRIEF_INSTRUCTION,
    output_schema=CampaignBriefDeliverable,
)

app = App(
    root_agent=strategy_brief_agent,
    name="strategy_brief",
)
