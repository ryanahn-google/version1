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

import asyncio
import concurrent.futures
import logging
import random
import uuid
from typing import Any

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools.tool_context import ToolContext
from google.adk.workflow import START, Workflow
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


logger = logging.getLogger(__name__)

TEXT_MODEL = "gemini-3.5-flash-lite"
IMAGE_MODEL = "gemini-3.1-flash-lite-image"  # Nano Banana 2 Lite

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

CRITICAL LANGUAGE DIRECTIVE: Output visualConceptTitle, headlineCopy, bodyCopy, and callToAction strictly in the language of the campaign request (Korean if request or user language is Korean, English if English). For visualPromptUsed, always write in rich, studio-quality English suitable for Nano Banana / Imagen image synthesis.

If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes.
"""

copy_and_prompt_agent = Agent(
    name="creative_copy_agent",
    model=Gemini(
        model=TEXT_MODEL,
        retry_options=get_default_http_retry_options(),
    ),
    instruction=COPY_AND_PROMPT_INSTRUCTION,
    mode="single_turn",
)


get_draft_image_store: Any = None
try:
    from app.orchestrator.draft_store import (
        get_draft_image_store as _get_store,
    )

    get_draft_image_store = _get_store
except ImportError:
    try:
        from orchestrator.draft_store import (
            get_draft_image_store as _get_store,
        )

        get_draft_image_store = _get_store
    except ImportError:
        pass


_MOCK_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
    b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)


# --- Step 2: Visual Asset Synthesis Function & Agent ---
async def synthesize_nano_banana_image(
    prompt: str,
    session_id: str | None = None,
    user_id: str | None = None,
    max_attempts: int = 2,
    timeout_seconds: float = 25.0,
    initial_delay: float = 1.5,
    jitter: float = 1.0,
) -> str | None:
    """Synthesize marketing visual using Nano Banana 2 Lite asynchronously.

    Executes non-blocking async generation with retry logic (exponential backoff
    with jitter) and persists the asset to memory or GCS.

    Args:
        prompt: Detailed visual synthesis prompt.
        session_id: Optional campaign session ID.
        user_id: Optional authenticated user ID.
        max_attempts: Number of generation attempts (default 2).
        timeout_seconds: Timeout per generation attempt in seconds.
        initial_delay: Base retry backoff in seconds.
        jitter: Randomized jitter factor.

    Returns:
        Persisted asset URL or draft URL, or None if synthesis fails.
    """
    effective_session_id = session_id or f"temp-session-{uuid.uuid4().hex[:8]}"
    effective_user_id = user_id

    if effective_user_id and str(effective_user_id).startswith("A2A_USER_"):
        effective_user_id = None

    settings = get_settings()
    effective_user_id = effective_user_id or settings.user_id

    if settings.integration_test:
        if get_draft_image_store:
            store = get_draft_image_store()
            if store:
                return store.save_draft(effective_session_id, _MOCK_PNG_BYTES)
        return None

    try:
        from google.genai import Client

        project = settings.google_cloud_project
        location = settings.google_cloud_location or "global"
        image_model = settings.image_model or IMAGE_MODEL

        client = Client(vertexai=True, project=project, location=location)
        logger.info(
            "P3 synthesize_nano_banana_image: synthesizing with %s at %s "
            "(session_id=%s, user_id=%s)...",
            image_model,
            location,
            effective_session_id,
            effective_user_id,
        )

        for attempt in range(max_attempts):
            try:
                import inspect

                aio_models = getattr(client, "aio", None) and getattr(
                    client.aio, "models", None
                )
                gen_func = getattr(aio_models, "generate_content", None)
                if (
                    aio_models
                    and gen_func
                    and (
                        inspect.iscoroutinefunction(gen_func)
                        or hasattr(gen_func, "assert_awaited")
                    )
                ):
                    resp = await asyncio.wait_for(
                        gen_func(model=image_model, contents=prompt),
                        timeout=timeout_seconds,
                    )
                elif aio_models and hasattr(aio_models, "generate_content"):
                    res = aio_models.generate_content(
                        model=image_model, contents=prompt
                    )
                    if inspect.isawaitable(res):
                        resp = await asyncio.wait_for(res, timeout=timeout_seconds)
                    else:
                        resp = await asyncio.to_thread(
                            client.models.generate_content,
                            model=image_model,
                            contents=prompt,
                        )
                else:
                    resp = await asyncio.to_thread(
                        client.models.generate_content,
                        model=image_model,
                        contents=prompt,
                    )
                img_bytes: bytes | None = None
                if resp and resp.candidates:
                    cand_content = resp.candidates[0].content
                    if cand_content and cand_content.parts:
                        for part in cand_content.parts:
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and inline_data.data:
                                img_bytes = inline_data.data
                                break

                if img_bytes:
                    if get_draft_image_store:
                        store = get_draft_image_store()
                        if store:
                            draft_url = store.save_draft(
                                effective_session_id, img_bytes
                            )
                            logger.info(
                                "P3 successfully stored draft visual: %s",
                                draft_url,
                            )
                            return draft_url

                    try:
                        from .storage_service import save_visual_marketing_asset
                    except ImportError:
                        try:
                            from storage_service import (
                                save_visual_marketing_asset,
                            )
                        except ImportError:
                            try:
                                from app.storage_service import (
                                    save_visual_marketing_asset,
                                )
                            except ImportError:
                                from app.agents.creative_content.storage_service import (
                                    save_visual_marketing_asset,
                                )

                    url = await asyncio.to_thread(
                        save_visual_marketing_asset,
                        img_bytes,
                        session_id=effective_session_id,
                        user_id=effective_user_id,
                    )
                    logger.info("P3 successfully stored visual: %s", url)
                    return url
            except Exception as exc:
                if attempt + 1 >= max_attempts:
                    logger.warning(
                        "Nano Banana visual synthesis failed after %d attempts: %s",
                        max_attempts,
                        exc,
                    )
                    return None
                delay = initial_delay * (2**attempt) + random.uniform(0.0, jitter)
                logger.warning(
                    "Nano Banana visual synthesis attempt %d failed: %s. "
                    "Retrying in %.2fs...",
                    attempt + 1,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

    except Exception as outer_exc:
        logger.warning(
            "P3 synthesize_nano_banana_image initialization failed: %s",
            outer_exc,
        )

    return None


def generate_marketing_visual(
    visual_prompt: str,
    tool_context: ToolContext | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
) -> str | None:
    """Tool wrapper for marketing visual generation using Nano Banana 2 Lite.

    Args:
        visual_prompt: Studio-quality visual prompt describing the scene.
        tool_context: Optional ADK execution context injected by framework.
        session_id: Optional campaign session ID.
        user_id: Optional user ID.

    Returns:
        The accessible draft URL or storage URL of the marketing visual.
    """
    effective_session_id = session_id
    effective_user_id = user_id

    if tool_context:
        try:
            if hasattr(tool_context, "session") and tool_context.session:
                effective_session_id = effective_session_id or getattr(
                    tool_context.session, "id", None
                )
                ctx_user_id = getattr(tool_context.session, "user_id", None)
                if ctx_user_id and not str(ctx_user_id).startswith("A2A_USER_"):
                    effective_user_id = effective_user_id or str(ctx_user_id)
            if not effective_session_id:
                effective_session_id = getattr(tool_context, "session_id", None)
            if not effective_user_id:
                ctx_user_id = getattr(tool_context, "user_id", None)
                if ctx_user_id and not str(ctx_user_id).startswith("A2A_USER_"):
                    effective_user_id = str(ctx_user_id)
        except Exception as ctx_err:
            logger.debug(
                "Could not resolve session_id/user_id from tool_context: %s",
                ctx_err,
            )

    coro = synthesize_nano_banana_image(
        visual_prompt,
        session_id=effective_session_id,
        user_id=effective_user_id,
    )
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


IMAGE_SYNTHESIS_INSTRUCTION = """
You are the Visual Synthesis & Asset Packaging Specialist [P3-Step2] for Nova Electronics Corp.
Your task is to take the copy and visual prompt produced by Step 1:
1. Identify any Campaign ID / Session ID and User ID specified in the context or prompt.
2. You MUST call the `generate_marketing_visual` tool passing:
   - `visual_prompt`: The photorealistic, studio-quality 16:9 visual prompt.
   - `session_id`: The Campaign ID / Session ID if present.
   - `user_id`: The User ID if present.
3. Set `assetUrl` in your output to the exact URL returned by the `generate_marketing_visual` tool.
4. Assemble and output the complete deliverable strictly conforming to the CreativeContentDeliverable schema.
"""

image_synthesis_agent = Agent(
    name="creative_image_agent",
    model=Gemini(
        model=TEXT_MODEL,
        retry_options=get_default_http_retry_options(),
    ),
    instruction=IMAGE_SYNTHESIS_INSTRUCTION,
    tools=[generate_marketing_visual],
    output_schema=CreativeContentDeliverable,
    mode="single_turn",
)

# Root Workflow composing Step 1 (Copy & Prompt) and Step 2 (Image Synthesis)
creative_content_agent = Workflow(
    name="creative_content_agent",
    edges=[(START, copy_and_prompt_agent, image_synthesis_agent)],
)

app = App(
    root_agent=creative_content_agent,
    name="creative_content",
)

_background_tasks: set[asyncio.Task[Any]] = set()


# --- Standalone High-Performance Sequential Pipeline for Local & Direct Execution ---
async def run_creative_content_pipeline(
    brief: CampaignBriefDeliverable,
    feedback: str | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
    visual_prompt_override: str | None = None,
    language: str = "ko",
    async_image: bool | None = None,
) -> CreativeContentDeliverable:
    """Self-contained 2-step sequential generation pipeline for [P3] Creative Content.

    Step 1: Generates copy & visual prompt using Gemini 3.5 Flash Lite.
    Step 2: Synthesizes high-res 16:9 visual using Nano Banana 2 Lite and persists to storage.
    """
    settings = get_settings()
    project = settings.google_cloud_project
    location = settings.google_cloud_location or "global"
    sub_agent_model = getattr(settings, "sub_agent_model", TEXT_MODEL)

    target_lang = (
        "ko"
        if language == "ko"
        or any(
            "\uac00" <= ch <= "\ud7a3"
            for ch in f"{brief.campaignTitle} {feedback or ''}"
        )
        else "en"
    )
    lang_directive = (
        "\nCRITICAL LANGUAGE REQUIREMENT: Output visualConceptTitle, headlineCopy, bodyCopy, and callToAction strictly in Korean (한국어로 작성). For visualPromptUsed, use descriptive English for high-quality image generation.\n"
        if target_lang == "ko"
        else "\nCRITICAL LANGUAGE REQUIREMENT: Output visualConceptTitle, headlineCopy, bodyCopy, callToAction, and visualPromptUsed strictly in English.\n"
    )

    prompt = (
        f"Campaign Brief: {brief.model_dump_json()}\n"
        f"Human Revision Instructions: {feedback or 'None'}\n"
        f"{lang_directive}\n"
        "Translate the brief into marketing headline, body copy, CTA, and a photorealistic 16:9 visual prompt for Nano Banana. "
        "If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes."
    )

    deliverable: CreativeContentDeliverable | None = None

    # Step 1: Generate copy & prompt with LLM
    if not settings.integration_test:
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
        visual_prompt = visual_prompt_override or (
            "Cinematic 8k photograph of a futuristic titanium smartphone standing upright "
            "on a reflective wet obsidian pedestal in a neon-lit cybernetic cityscape at dusk. "
            "Volumetric lighting, shallow depth of field, dramatic indigo and amber highlights, "
            "ultra-sharp lens reflection, professional commercial studio product photography --ar 16:9"
        )
        if target_lang == "ko":
            concept_title = f"미래 도시의 여명 — {brief.campaignTitle}"
            headline = "일상의 한계를 뛰어넘다. 차세대 AI 플래그십의 시작"
            body_copy = (
                f"{brief.coreValueProposition} 더 강력해진 온디바이스 AI와 "
                "프로급 카메라가 선사하는 놀라운 창의성을 이번 특별 프로모션을 통해 경험하세요."
            )
            cta = "지금 바로 사전예약 혜택 확인하기"
            if feedback:
                headline = f"피드백 반영: {feedback[:30]}"
                body_copy = f"{body_copy} (수정 반영: {feedback})"
                cta = f"특별 혜택 바로가기: {feedback[:20]}"
        else:
            concept_title = f"Night City Awakening — {brief.campaignTitle}"
            headline = "Own the Dark. Rule the Night."
            body_copy = (
                f"{brief.coreValueProposition} Unleash studio-level generative editing and "
                "cinematic zoom right from your palm this Black Friday."
            )
            cta = "Claim Black Friday Exclusives — Double Your Storage Free"
            if feedback:
                headline = f"Redefined: {feedback[:40]}"
                body_copy = f"{body_copy} Enhanced per revision request: {feedback}."
                cta = f"Act Now: {feedback[:30]}"

        if feedback and not visual_prompt_override:
            visual_prompt = (
                f"{visual_prompt}. Art direction update incorporating "
                f"feedback: '{feedback}'."
            )

        deliverable = CreativeContentDeliverable(
            visualConceptTitle=concept_title,
            visualPromptUsed=visual_prompt,
            assetUrl=None,
            storageUri=None,
            headlineCopy=headline,
            bodyCopy=body_copy,
            callToAction=cta,
            aspectRatio="16:9",
        )
    elif visual_prompt_override:
        deliverable.visualPromptUsed = visual_prompt_override

    # Step 2: Synthesize visual asset with Nano Banana 2 Lite and persist to storage
    prompt_to_synthesize = visual_prompt_override or deliverable.visualPromptUsed
    if prompt_to_synthesize:
        deliverable.visualPromptUsed = prompt_to_synthesize
        should_async = (
            async_image
            if async_image is not None
            else (not settings.integration_test and bool(session_id))
        )

        if should_async and session_id:
            effective_sid = session_id
            effective_uid = user_id

            async def _background_visual_task() -> None:
                try:
                    logger.info(
                        "Background Nano Banana image synthesis started for session '%s'...",
                        effective_sid,
                    )
                    bg_url = await synthesize_nano_banana_image(
                        prompt_to_synthesize,
                        session_id=effective_sid,
                        user_id=effective_uid,
                    )
                    if bg_url and effective_sid:
                        from app.orchestrator.session_repo import get_session_repo

                        repo = get_session_repo()
                        curr_sess = await repo.get_session(session_id=effective_sid)
                        if curr_sess and curr_sess.deliverables.creativeContent:
                            deliv_dict = (
                                curr_sess.deliverables.creativeContent.model_dump(
                                    mode="json"
                                )
                            )
                            if bg_url.startswith("http") or bg_url.startswith("gs://"):
                                deliv_dict["storageUri"] = bg_url
                                deliv_dict["assetUrl"] = (
                                    f"/api/v1/campaigns/{effective_sid}/visual"
                                )
                            else:
                                deliv_dict["assetUrl"] = bg_url
                            await repo.update_session(
                                effective_sid,
                                deliverables={"creativeContent": deliv_dict},
                            )
                            logger.info(
                                "Background visual synthesis completed and session '%s' updated: %s",
                                effective_sid,
                                deliv_dict.get("assetUrl"),
                            )
                except Exception as bg_err:
                    logger.warning(
                        "Background visual synthesis failed for session '%s': %s",
                        effective_sid,
                        bg_err,
                    )

            bg_task = asyncio.create_task(_background_visual_task())
            _background_tasks.add(bg_task)
            bg_task.add_done_callback(_background_tasks.discard)
            deliverable.assetUrl = None
            deliverable.storageUri = None
        else:
            generated_url = await synthesize_nano_banana_image(
                prompt_to_synthesize, session_id=session_id, user_id=user_id
            )
            if generated_url:
                if generated_url.startswith("http") or generated_url.startswith(
                    "gs://"
                ):
                    deliverable.storageUri = generated_url
                    deliverable.assetUrl = f"/api/v1/campaigns/{session_id}/visual"
                else:
                    deliverable.assetUrl = generated_url
            else:
                deliverable.assetUrl = None
                deliverable.storageUri = None

    return deliverable
