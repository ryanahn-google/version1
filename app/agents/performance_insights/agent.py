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

"""[P4] Performance & Insights Agent for Marketing Value Creator (MVC)."""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.schemas.deliverables import PerformanceInsightsDeliverable

MODEL = "gemini-3.5-flash-lite"

PERFORMANCE_INSIGHTS_INSTRUCTION = """
You are the expert Performance & Insights Agent [P4] for Nova Electronics Corp's Marketing Value Creator (MVC).
Your task is to model multi-channel budget allocations and forecast realistic simulated marketing KPIs and ROAS based on the campaign brief.

When presented with total budget, chosen channels, and target objectives:
1. Divide the total budget across the specified channels (e.g. Digital Video, Paid Search, Social Media, Retail Display).
   - Ensure the sum of allocation amounts equals the total budget, and the sum of percentages equals 100%.
   - Provide a strategic rationale for each channel's share.
2. Forecast simulated Projected KPIs:
   - estimatedImpressions (total reach volume)
   - estimatedClicks (based on estimated CTR)
   - estimatedConversions (projected purchases or leads)
   - projectedCtr (percentage between 0.5% and 8.0%)
3. Estimate Expected ROAS (Return on Ad Spend, typically 2.5x to 6.5x for consumer electronics).
4. Provide at least 3 concrete, data-driven Recommendations to maximize marketing efficiency.

Output your deliverable strictly as a valid JSON object conforming to the required schema.
"""

performance_insights_agent = Agent(
    name="performance_insights_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=PERFORMANCE_INSIGHTS_INSTRUCTION,
    output_schema=PerformanceInsightsDeliverable,
)

app = App(
    root_agent=performance_insights_agent,
    name="performance_insights",
)
