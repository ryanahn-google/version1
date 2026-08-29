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

"""[P3] Creative Content Agent for Marketing Value Creator (MVC).

Implements a self-contained 2-step sequential generation pipeline:
Step 1: Copywriting and visual prompt engineering (Gemini 3.5 Flash Lite).
Step 2: Native visual asset synthesis and persistence (Nano Banana 2 Lite).
"""

from __future__ import annotations

import asyncio
import logging
import os

from google.adk.agents import Agent, SequentialAgent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

try:
    from app.schemas.deliverables import (
        CampaignBriefDeliverable,
        CreativeContentDeliverable,
    )
    from app.settings import get_settings
except ImportError:
    from schemas.deliverables import (  # type: ignore[no-redef]
        CampaignBriefDeliverable,
        CreativeContentDeliverable,
    )
    from settings import get_settings  # type: ignore[no-redef]

logger = logging.getLogger(__name__)

TEXT_MODEL = "gemini-3.5-flash-lite"
IMAGE_MODEL = "gemini-3.1-flash-lite-image"  # Nano Banana 2 Lite
FALLBACK_ASSET_URL = "https://storage.googleapis.com/mvc-artifacts-public/campaigns/galaxy_s27_visual.jpg"

# --- Step 1: Prompt & Copywriting Agent ---
COPY_AND_PROMPT_INSTRUCTION = """
You are the expert Creative Copy & Art Direction Specialist [P3-Step1] for Nova Electronics Corp.
Your task is to translate the campaign strategy brief into captivating marketing copy and photographic visual concepts tailored for Nano Banana image generation.

When given the campaign brief, target personas, and human revision instructions:
1. Create an evocative Visual Concept Title.
2. Construct a photorealistic, studio-quality Visual Prompt for Nano Banana image generation detailing lighting, subject, atmosphere, composition, and product focus (16:9 aspect ratio).
3. Draft a high-impact Headline Copy that commands attention.
4. Craft an engaging promotional Body Copy emphasizing the core value proposition.
5. Provide an urgent, persuasive Call To Action (e.g. "Experience Galaxy S27 Ultra — Pre-order with Double Storage").

If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes.
"""

copy_and_prompt_agent = Agent(
    name="creative_copy_agent",
    model=Gemini(
        model=TEXT_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=COPY_AND_PROMPT_INSTRUCTION,
)


# --- Step 2: Visual Asset Synthesis Function & Agent ---
def generate_marketing_visual(visual_prompt: str) -> str:
    """Synthesize 16:9 marketing visual with Nano Banana 2 Lite (gemini-3.1-flash-lite-image) and persist to storage.

    Args:
        visual_prompt: The photorealistic, studio-quality 16:9 visual prompt describing the scene.

    Returns:
        The accessible public HTTPS URL of the persisted marketing visual.
    """
    if os.environ.get("INTEGRATION_TEST") == "TRUE":
        return FALLBACK_ASSET_URL

    try:
        from google.genai import Client

        project = (
            os.environ.get("GOOGLE_CLOUD_PROJECT")
            or os.environ.get("PROJECT_ID")
            or "sample-505914"
        )
        location = os.environ.get("GOOGLE_CLOUD_LOCATION") or "global"
        image_model = os.environ.get("IMAGE_MODEL") or IMAGE_MODEL

        client = Client(vertexai=True, project=project, location=location)
        logger.info(
            "P3 Tool generate_marketing_visual: synthesizing with %s at %s...",
            image_model,
            location,
        )
        resp = client.models.generate_content(
            model=image_model,
            contents=visual_prompt,
        )
        img_bytes: bytes | None = None
        if resp and resp.candidates and resp.candidates[0].content.parts:
            for part in resp.candidates[0].content.parts:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    img_bytes = part.inline_data.data
                    break

        if img_bytes:
            try:
                from .storage_service import save_visual_marketing_asset
            except ImportError:
                try:
                    from storage_service import save_visual_marketing_asset
                except ImportError:
                    from app.agents.creative_content.storage_service import (
                        save_visual_marketing_asset,
                    )

            url = save_visual_marketing_asset(img_bytes)
            logger.info("P3 Tool successfully stored visual: %s", url)
            return url
    except Exception as exc:
        logger.warning("P3 Tool generate_marketing_visual failed: %s", exc)

    return FALLBACK_ASSET_URL


async def synthesize_nano_banana_image(
    prompt: str, session_id: str | None = None
) -> str | None:
    """Synthesize marketing visual using Nano Banana 2 Lite (gemini-3.1-flash-lite-image) and persist to storage."""
    url = generate_marketing_visual(prompt)
    return url if url != FALLBACK_ASSET_URL else None


IMAGE_SYNTHESIS_INSTRUCTION = """
You are the Visual Synthesis & Asset Packaging Specialist [P3-Step2] for Nova Electronics Corp.
Your task is to take the copy and visual prompt produced by Step 1:
1. You MUST call the `generate_marketing_visual` tool passing `visual_prompt` containing the 16:9 prompt.
2. Set `assetUrl` in your output to the exact URL returned by the `generate_marketing_visual` tool.
3. Assemble and output the complete deliverable strictly conforming to the CreativeContentDeliverable schema.
"""

image_synthesis_agent = Agent(
    name="creative_image_agent",
    model=Gemini(
        model=TEXT_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=IMAGE_SYNTHESIS_INSTRUCTION,
    tools=[generate_marketing_visual],
    output_schema=CreativeContentDeliverable,
)

# Root SequentialAgent composing Step 1 (Copy & Prompt) and Step 2 (Image Synthesis)
creative_content_agent = SequentialAgent(
    name="creative_content_agent",
    sub_agents=[copy_and_prompt_agent, image_synthesis_agent],
)

app = App(
    root_agent=creative_content_agent,
    name="creative_content",
)


# --- Standalone High-Performance Sequential Pipeline for Local & Direct Execution ---
async def run_creative_content_pipeline(
    brief: CampaignBriefDeliverable,
    feedback: str | None = None,
    session_id: str | None = None,
) -> CreativeContentDeliverable:
    """Self-contained 2-step sequential generation pipeline for [P3] Creative Content.

    Step 1: Generates copy & visual prompt using Gemini 3.5 Flash Lite.
    Step 2: Synthesizes high-res 16:9 visual using Nano Banana 2 Lite and persists to storage.
    """
    settings = get_settings()
    project = settings.google_cloud_project or "sample-505914"
    location = settings.google_cloud_location or "global"
    sub_agent_model = getattr(settings, "sub_agent_model", TEXT_MODEL)

    prompt = (
        f"Campaign Brief: {brief.model_dump_json()}\n"
        f"Human Revision Instructions: {feedback or 'None'}\n\n"
        "Translate the brief into marketing headline, body copy, CTA, and a photorealistic 16:9 visual prompt for Nano Banana. "
        "If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes."
    )

    deliverable: CreativeContentDeliverable | None = None

    # Step 1: Generate copy & prompt with LLM
    if os.environ.get("INTEGRATION_TEST") != "TRUE":
        try:
            from google.genai import Client

            client = Client(vertexai=True, project=project, location=location)
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=sub_agent_model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": CreativeContentDeliverable,
                    },
                ),
                timeout=8.0,
            )
            if resp.text:
                deliverable = CreativeContentDeliverable.model_validate_json(resp.text)
        except Exception as e:
            logger.warning(
                "P3 Step 1 AI copy generation failed: %s. Using heuristic copy.", e
            )

    if not deliverable:
        visual_prompt = (
            "Cinematic 8k photograph of a futuristic titanium smartphone standing upright "
            "on a reflective wet obsidian pedestal in a neon-lit cybernetic cityscape at dusk. "
            "Volumetric lighting, shallow depth of field, dramatic indigo and amber highlights, "
            "ultra-sharp lens reflection, professional commercial studio product photography --ar 16:9"
        )
        headline = "Own the Dark. Rule the Night."
        body_copy = (
            f"{brief.coreValueProposition} Unleash studio-level generative editing and "
            "cinematic zoom right from your palm this Black Friday."
        )
        cta = "Claim Black Friday Exclusives — Double Your Storage Free"

        if feedback:
            visual_prompt = f"{visual_prompt}. Art direction update incorporating feedback: '{feedback}'."
            headline = f"Redefined: {feedback[:40]}"
            body_copy = f"{body_copy} Enhanced per revision request: {feedback}."
            cta = f"Act Now: {feedback[:30]}"

        deliverable = CreativeContentDeliverable(
            visualConceptTitle=f"Night City Awakening — {brief.campaignTitle}",
            visualPromptUsed=visual_prompt,
            assetUrl=FALLBACK_ASSET_URL,
            headlineCopy=headline,
            bodyCopy=body_copy,
            callToAction=cta,
            aspectRatio="16:9",
        )

    # Step 2: Synthesize visual asset with Nano Banana 2 Lite and persist to storage
    if deliverable.visualPromptUsed:
        generated_url = await synthesize_nano_banana_image(
            deliverable.visualPromptUsed, session_id=session_id
        )
        if generated_url:
            deliverable.assetUrl = generated_url

    return deliverable
