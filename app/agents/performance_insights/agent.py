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

try:
    from app.schemas.deliverables import PerformanceInsightsDeliverable
except ImportError:
    from schemas.deliverables import PerformanceInsightsDeliverable

try:
    from app.retry_policy import get_default_http_retry_options
except ImportError:
    try:
        from retry_policy import get_default_http_retry_options
    except ImportError:

        def get_default_http_retry_options() -> types.HttpRetryOptions:
            return types.HttpRetryOptions(
                attempts=3,
                initial_delay=1.0,
                max_delay=10.0,
                exp_base=2.0,
                jitter=1.0,
                http_status_codes=[408, 429, 500, 502, 503, 504],
            )


MODEL = "gemini-3.5-flash-lite"

PERFORMANCE_INSIGHTS_INSTRUCTION = """
You are the expert Performance & Insights Agent [P4] for Nova Electronics Corp's Marketing Value Creator (MVC).
Your task is to model multi-channel budget allocations and forecast realistic simulated marketing KPIs and ROAS based on the campaign brief and evaluated creative visual concept.

When presented with total budget, chosen channels, target objectives, and the Stage 3 Creative Content deliverable:
1. Divide the total budget across the specified channels (e.g. Digital Video, Paid Search, Social Media, Retail Display).
   - Ensure the sum of allocation amounts equals the total budget, and the sum of percentages equals 100%.
   - Provide a strategic rationale for each channel's share.
2. Forecast simulated Projected KPIs, factoring in how the visual asset quality lifts CTR and conversions on visually driven channels (Social Media, Digital Video):
   - estimatedImpressions (total reach volume)
   - estimatedClicks (based on estimated CTR)
   - estimatedConversions (projected purchases or leads)
   - projectedCtr (percentage between 0.5% and 8.0%)
3. Estimate Expected ROAS (Return on Ad Spend, typically 2.5x to 6.5x for consumer electronics).
4. Provide at least 3 concrete, data-driven Recommendations to maximize marketing efficiency.
5. Populate creativeAssetUrl (carrying forward the evaluated visual asset URL) and visualConceptSummary summarizing how the visual creative asset impacts the forecast.

CRITICAL LANGUAGE DIRECTIVE: Output channelAllocations rationale, recommendations, and visualConceptSummary strictly in the language of the campaign request (Korean if request or user language is Korean, English if English).

Output your deliverable strictly as a valid JSON object conforming to the required schema.
"""

performance_insights_agent = Agent(
    name="performance_insights_agent",
    model=Gemini(
        model=MODEL,
        retry_options=get_default_http_retry_options(),
    ),
    instruction=PERFORMANCE_INSIGHTS_INSTRUCTION,
    output_schema=PerformanceInsightsDeliverable,
)

app = App(
    root_agent=performance_insights_agent,
    name="performance_insights",
)
