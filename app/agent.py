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

"""Root Orchestrator Agent for Marketing Value Creator (MVC)."""

from collections.abc import AsyncGenerator

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.models_fallback import FallbackGemini
from app.orchestrator.tools import ORCHESTRATOR_TOOLS
from app.retry_policy import get_default_http_retry_options
from app.settings import get_settings

MODEL = "gemini-3.1-pro-preview"

ORCHESTRATOR_INSTRUCTION = """
You are the Root Orchestrator for Nova Electronics Corp's Marketing Value Creator (MVC) platform.
You coordinate four specialized sub-agents ([P1] Market Sensing, [P2] Strategy & Brief, [P3] Creative Content, [P4] Performance & Insights)
across an automated multi-stage campaign planning simulation with Human-in-the-Loop review gates.

Your duties:
1. Parse campaign planning requirements from marketers (Brand Name, Product Name, Target Objective, Budget, Channels) using `parse_campaign_prompt`.
2. Create new campaign sessions and trigger Stage 1 (Market Sensing) using `create_campaign_session`.
3. Check campaign status and deliverables using `get_campaign_status`.
4. Guide marketers through Human-in-the-Loop review gates:
   - When the user approves a stage, call `approve_campaign_stage` with action='approve' to advance to the next stage:
     * Stage 1: Market Sensing -> Stage 2: Strategy & Brief
     * Stage 2: Strategy & Brief -> Stage 3: Creative Content
     * Stage 3: Creative Content -> Stage 4: Performance & Insights
     * Stage 4: Performance & Insights -> Media Execution / Completed
   - When the user provides revision feedback, call `approve_campaign_stage` with action='revise' and pass feedback.
   - When the user wants to roll back to the previous stage, call `rollback_campaign_stage`.
5. Clearly report stage results, metrics, and deliverables back to the marketer.
"""

if get_settings().integration_test:
    from google.adk.models.base_llm import BaseLlm
    from google.adk.models.llm_request import LlmRequest
    from google.adk.models.llm_response import LlmResponse

    class _IntegrationTestMockLlm(BaseLlm):
        """Deterministic mock LLM for integration testing without external credentials."""

        def __init__(self) -> None:
            super().__init__(model="mock-gemini")

        async def generate_content_async(
            self, llm_request: LlmRequest, stream: bool = False
        ) -> AsyncGenerator[LlmResponse, None]:
            content = types.Content(
                role="model",
                parts=[types.Part.from_text(text="I am the MVC Root Orchestrator.")],
            )
            if stream:
                yield LlmResponse(content=content, partial=True)
            yield LlmResponse(content=content, partial=False)

    _model = _IntegrationTestMockLlm()
else:
    settings = get_settings()
    primary_llm = Gemini(
        model=settings.orchestrator_model,
        client_kwargs={
            "location": "global",
            "vertexai": settings.google_genai_use_enterprise,
        },
        retry_options=get_default_http_retry_options(),
    )
    fallback_llm = Gemini(
        model=settings.orchestrator_fallback_model,
        client_kwargs={
            "location": "global",
            "vertexai": settings.google_genai_use_enterprise,
        },
        retry_options=get_default_http_retry_options(),
    )
    _model = FallbackGemini(primary=primary_llm, fallback=fallback_llm)

root_agent = Agent(
    name="mvc_orchestrator",
    model=_model,
    instruction=ORCHESTRATOR_INSTRUCTION,
    tools=ORCHESTRATOR_TOOLS,
)

app = App(
    root_agent=root_agent,
    name="app",
)
