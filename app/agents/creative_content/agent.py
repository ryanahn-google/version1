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

"""[P3] Creative Content Agent for Marketing Value Creator (MVC)."""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

try:
    from app.schemas.deliverables import CreativeContentDeliverable
except ImportError:
    from schemas.deliverables import CreativeContentDeliverable

MODEL = "gemini-3.5-flash-lite"
IMAGE_MODEL = "imagen-3.0-generate-002"

CREATIVE_CONTENT_INSTRUCTION = """
You are the expert Creative Content Agent [P3] for Nova Electronics Corp's Marketing Value Creator (MVC).
Your task is to translate the campaign strategy brief into captivating marketing copy and photographic visual concepts suitable for Imagen 3 generation.

When given the campaign brief, target personas, and messaging pillars:
1. Create an evocative Visual Concept Title.
2. Construct a photorealistic, studio-quality Visual Prompt for Imagen 3 detailing lighting, subject, atmosphere, composition, and product focus (16:9 aspect ratio).
3. Draft a high-impact Headline Copy that commands attention.
4. Craft an engaging promotional Body Copy emphasizing the core value proposition.
5. Provide an urgent, persuasive Call To Action (e.g. "Experience Galaxy S27 Ultra — Pre-order with Double Storage").

For assetUrl, provide the planned GCS artifact path (or placeholder gs://mvc-artifacts-default/campaigns/creative_visual.png).
Output your deliverable strictly as a valid JSON object conforming to the required schema.
"""

creative_content_agent = Agent(
    name="creative_content_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=CREATIVE_CONTENT_INSTRUCTION,
    output_schema=CreativeContentDeliverable,
)

app = App(
    root_agent=creative_content_agent,
    name="creative_content",
)
