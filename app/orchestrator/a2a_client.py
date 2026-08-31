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

"""Dual-mode A2A client for dispatching work to P1-P4 sub-agents."""

import json
import logging
import re
import uuid
from typing import Any

import aiohttp
from fastapi import HTTPException, status

from app.schemas.campaign import ParsePromptResponse
from app.schemas.deliverables import (
    CampaignBriefDeliverable,
    ChannelAllocation,
    CompetitorAnalysis,
    CreativeContentDeliverable,
    MarketSensingDeliverable,
    MessagingPillar,
    PerformanceInsightsDeliverable,
    ProjectedKPIs,
    SentimentOverview,
    TargetPersona,
)
from app.settings import A2AClientSettings, get_settings

logger = logging.getLogger(__name__)


def resolve_language(text: str, explicit_lang: str | None = None) -> str:
    """Resolve whether target language is Korean ('ko') or English ('en')."""
    if explicit_lang in ("ko", "en"):
        return explicit_lang
    if any("\uac00" <= ch <= "\ud7a3" for ch in text):
        return "ko"
    return "en"


class A2ASubAgentClient:
    """Client for executing P1-P4 agents via remote A2A JSON-RPC or local module execution."""

    def __init__(
        self,
        p1_url: str | None = None,
        p2_url: str | None = None,
        p3_url: str | None = None,
        p4_url: str | None = None,
        settings: A2AClientSettings | None = None,
    ) -> None:
        cfg = settings or get_settings()
        self.p1_url = p1_url or cfg.a2a_p1_url
        self.p2_url = p2_url or cfg.a2a_p2_url
        self.p3_url = p3_url or cfg.a2a_p3_url
        self.p4_url = p4_url or cfg.a2a_p4_url

    async def _call_remote_a2a(
        self,
        endpoint_url: str,
        prompt_text: str,
        context_id: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Dispatch JSON-RPC call to remote Agent Runtime A2A endpoint."""
        message_dict: dict[str, Any] = {
            "role": "user",
            "parts": [{"text": prompt_text}],
            "messageId": str(uuid.uuid4()),
        }
        params: dict[str, Any] = {"message": message_dict}
        if context_id:
            sanitized_cid = re.sub(r"[^A-Za-z0-9_-]", "-", context_id)
            message_dict["contextId"] = sanitized_cid
            params["contextId"] = sanitized_cid
        if user_id:
            params["userId"] = user_id

        payload = {
            "jsonrpc": "2.0",
            "method": "message/send",
            "params": params,
            "id": f"mvc-task-{uuid.uuid4().hex[:8]}",
        }
        headers = {"Content-Type": "application/json", "A2A-Version": "0.3"}
        if user_id:
            headers["X-User-Id"] = user_id

        # Attach Google OAuth Bearer token if running against Google Cloud endpoints
        try:
            import google.auth
            import google.auth.transport.requests

            credentials, _ = google.auth.default()
            if not credentials.valid:
                credentials.refresh(google.auth.transport.requests.Request())
            if credentials.token:
                headers["Authorization"] = f"Bearer {credentials.token}"
        except Exception:
            pass

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint_url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                if resp.status in (400, 403):
                    err_text = await resp.text()
                    err_lower = err_text.lower()
                    if any(
                        term in err_lower
                        for term in (
                            "model armor",
                            "guardrail",
                            "safety",
                            "blocked",
                            "violation",
                        )
                    ):
                        logger.warning(
                            "Subagent call blocked by Agent Gateway Model Armor: %s",
                            err_text,
                        )
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=(
                                "보안 가드레일(Model Armor) 정책에 의해 "
                                "요청이 차단되었습니다. 입력 프롬프트를 "
                                "확인해 주세요."
                            ),
                        )
                resp.raise_for_status()
                data = await resp.json()
                res = data.get("result", {})

                result_text = "{}"
                if res.get("artifacts"):
                    parts = res["artifacts"][0].get("parts", [])
                    if parts:
                        result_text = parts[0].get("text", "{}")
                elif res.get("history"):
                    for h in reversed(res["history"]):
                        if h.get("role") == "agent":
                            parts = h.get("parts", [])
                            if parts:
                                result_text = parts[0].get("text", "{}")
                                break
                else:
                    msg = res.get("status", {}).get("message") or res.get("message", {})
                    parts = msg.get("parts", [{}])
                    result_text = parts[0].get("text", "{}") if parts else "{}"

                try:
                    return json.loads(result_text)
                except Exception:
                    return {"raw_response": result_text}

    async def _execute_local_agent(
        self, prompt: str, schema_cls: type[Any], stage_name: str
    ) -> Any | None:
        import asyncio

        settings = get_settings()
        if settings.integration_test:
            return None

        try:
            from google.genai import Client

            project = settings.google_cloud_project
            location = settings.google_cloud_location or "global"

            client = Client(
                vertexai=True,
                project=project,
                location=location,
            )
            model_name = getattr(settings, "sub_agent_model", "gemini-2.5-flash")
            logger.info(
                "Synthesizing [%s] deliverable with Vertex AI (%s)...",
                stage_name,
                model_name,
            )
            config: dict[str, Any] = {
                "response_mime_type": "application/json",
                "response_schema": schema_cls,
            }
            if "Market Sensing" in stage_name:
                from google.genai import types as genai_types

                config["tools"] = [
                    genai_types.Tool(google_search=genai_types.GoogleSearch())
                ]

            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=25.0,
            )
            if resp.candidates and resp.candidates[0].grounding_metadata:
                gm = resp.candidates[0].grounding_metadata
                queries = getattr(gm, "web_search_queries", None)
                if queries:
                    logger.info(
                        "[%s] Grounded with Google Search queries: %s",
                        stage_name,
                        queries,
                    )
            if resp.text:
                return schema_cls.model_validate_json(resp.text)
        except Exception as exc:
            logger.warning(
                "Local Vertex AI agent execution for [%s] failed or unavailable: %s. Using heuristic synthesizer.",
                stage_name,
                exc,
            )
        return None

    async def parse_campaign_prompt(
        self, prompt: str, language: str = "ko"
    ) -> ParsePromptResponse:
        """Parse natural language prompt into structured campaign brief parameters via Gemini."""
        target_lang = resolve_language(prompt, language)
        lang_str = "Korean" if target_lang == "ko" else "English"
        sys_prompt = (
            "You are an expert campaign intake parser for Marketing Value Creator (MVC).\n"
            "Analyze the user's natural language input and extract structured campaign brief parameters:\n\n"
            f'User Input: "{prompt}"\n\n'
            "Extract the following fields conforming strictly to the ParsePromptResponse schema:\n"
            '- brandName: Brand name. If not explicitly mentioned or ambiguous, return empty string "".\n'
            '- productName: Product or service name. If not explicitly mentioned or ambiguous, return empty string "".\n'
            '- campaignObjective: The campaign objective or core goal. If not explicitly mentioned, return empty string "".\n'
            '- targetAudience: Target audience segment or demographics. If not explicitly mentioned or ambiguous, return empty string "".\n'
            "- budgetAmount: Numeric total budget as a float or null. If not explicitly mentioned or ambiguous, return null.\n"
            '- currency: "KRW" if Korean won/원/₩ or if prompt is in Korean, "USD" if dollar/$/USD or English.\n'
            '- channels: Array of marketing channel names if mentioned (e.g. ["Digital Video", "Social Media"]). If not mentioned, return [].\n\n'
            "CRITICAL RULES:\n"
            "1. NEVER hallucinate, invent, or guess unspecified values. Do NOT invent brand names like 'Nova Electronics' or product names like 'Galaxy S27' unless the user explicitly mentioned them in the prompt.\n"
            '2. If information is missing or ambiguous, leave the corresponding field strictly as an empty string "" (or null for budgetAmount).\n'
            f"3. Format text in {lang_str}."
        )

        ai_res = await self._execute_local_agent(
            sys_prompt, ParsePromptResponse, "Prompt Parser"
        )
        if ai_res and isinstance(ai_res, ParsePromptResponse):
            return ai_res

        # Fallback when LLM parsing fails or is unavailable:
        # Simply retain the original prompt as campaignObjective, with other fields empty for user input.
        return ParsePromptResponse(
            brandName="",
            productName="",
            campaignObjective=prompt.strip(),
            targetAudience="",
            budgetAmount=None,
            currency="KRW" if target_lang == "ko" else "USD",
            channels=[],
        )

    async def run_market_sensing(
        self,
        brand_name: str,
        product_name: str,
        objective: str,
        audience: str,
        feedback: str | None = None,
        context_id: str | None = None,
        user_id: str | None = None,
        language: str = "ko",
    ) -> MarketSensingDeliverable:
        """Run [P1] Market Sensing Agent."""
        target_lang = resolve_language(f"{objective} {feedback or ''}", language)
        lang_directive = (
            "\nCRITICAL LANGUAGE REQUIREMENT: Output all deliverable textual fields (targetMarket, consumerTrends, positiveThemes, frictionPoints, strategicOpportunities, competitor strengths/vulnerabilities) strictly in Korean (한국어로 작성). Do NOT respond in English.\n"
            if target_lang == "ko"
            else "\nCRITICAL LANGUAGE REQUIREMENT: Output all deliverable textual fields strictly in English.\n"
        )
        prompt = (
            f"Brand: {brand_name}\n"
            f"Product: {product_name}\n"
            f"Objective: {objective}\n"
            f"Target Audience: {audience}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n"
            f"{lang_directive}\n"
            "Synthesize comprehensive market trends, competitive signals, and consumer sentiment. "
            "If Human Revision Instructions are provided, adapt the target market, trends, and strategic opportunities accordingly."
        )
        if self.p1_url:
            logger.info("Calling remote [P1] A2A endpoint: %s", self.p1_url)
            try:
                data = await self._call_remote_a2a(
                    self.p1_url, prompt, context_id=context_id, user_id=user_id
                )
                return MarketSensingDeliverable.model_validate(data)
            except Exception as e:
                logger.warning(
                    "Remote [P1] A2A call failed: %s. Falling back to local agent execution.",
                    e,
                )

        ai_deliv = await self._execute_local_agent(
            prompt, MarketSensingDeliverable, "P1 Market Sensing"
        )
        if ai_deliv:
            return ai_deliv

        # Heuristic fallback execution
        logger.info("Executing [P1] Market Sensing via local agent fallback")
        if target_lang == "ko":
            trends = [
                "온디바이스 멀티모달 AI 기능의 빠른 대중화 및 실시간 번역 수요 급증",
                "보상 판매(Trade-in) 프로모션을 통한 플래그십 기기 교체 선호도 증가",
                "프로급 저조도 야간 촬영 및 고배율 줌 카메라 성능에 대한 높은 관심",
            ]
            opportunities = [
                "AI 생산성 슈퍼파워를 강조한 연말 프리미엄 기프트 포지셔닝",
                "최대 보상판매 혜택을 전면에 내세워 초기 구매 장벽 완화",
                "경쟁 제품 대비 압도적인 야간 및 실시간 컴퓨테이셔널 카메라 성능 비교 부각",
            ]
            positive_themes = [
                "혁신적인 AI 사진 편집 및 업무 생산성 기능에 대한 높은 기대감",
                "블랙프라이데이 특별 프로모션 및 보상 판매 혜택 기대",
            ]
            friction_points = [
                "플래그십 모델의 가격 인상에 대한 심리적 부담",
                "장시간 AI 프로세싱 시 배터리 소모에 대한 우려",
            ]
            target_market = f"글로벌 및 국내 주요 테크 얼리어답터 및 프리미엄 스마트폰 수요층 ({audience or '일반'})"
            comp_a = CompetitorAnalysis(
                competitor="Alpha Phone 17 Pro",
                strengths=["강력한 에코시스템 락인", "프리미엄 티타늄 외관"],
                vulnerabilities=[
                    "높은 수리비 및 부품 비용",
                    "상대적으로 보수적인 AI 기능 적용",
                ],
            )
            comp_b = CompetitorAnalysis(
                competitor="Apex Ultra X",
                strengths=["공격적인 프로모션 가격", "초고속 충전 기술"],
                vulnerabilities=[
                    "저조도 사진 처리의 일관성 부족",
                    "OS 및 UI 최적화 불안정",
                ],
            )
        else:
            trends = [
                "Surging adoption of on-device multimodal AI capabilities",
                "High willingness to upgrade via promotional trade-in incentives",
                "Demand for pro-grade nightography and instant computational zoom",
            ]
            opportunities = [
                "Position as the definitive holiday luxury gift with AI productivity superpower",
                "Bundle flagship trade-in bonus to lower purchase hesitation",
                "Highlight night photography shootout comparisons against competitors",
            ]
            positive_themes = [
                "Excitement for revolutionary AI photo editing",
                "Anticipation for Black Friday deals",
            ]
            friction_points = [
                "Rising flagship prices",
                "Battery concerns during AI processing",
            ]
            target_market = f"Global Tier-1 Urban Tech Markets ({audience})"
            comp_a = CompetitorAnalysis(
                competitor="Alpha Phone 17 Pro",
                strengths=["Ecosystem lock-in", "Titanium build"],
                vulnerabilities=["High repair cost", "Conservative AI features"],
            )
            comp_b = CompetitorAnalysis(
                competitor="Apex Ultra X",
                strengths=["Aggressive promotional pricing", "Fast charging"],
                vulnerabilities=[
                    "Inconsistent low-light image processing",
                    "Fragmented UX",
                ],
            )

        if feedback:
            prefix = "피드백 반영" if target_lang == "ko" else "Revision Focus"
            target_market += f" [{prefix}: {feedback}]"
            trends.insert(0, f"{prefix}: {feedback}")
            opportunities.insert(0, f"{prefix}: {feedback}")
            positive_themes.insert(0, f"{prefix}: {feedback}")

        return MarketSensingDeliverable(
            targetMarket=target_market,
            consumerTrends=trends,
            competitiveAnalysis=[comp_a, comp_b],
            sentimentOverview=SentimentOverview(
                positiveThemes=positive_themes,
                frictionPoints=friction_points,
                overallSentimentScore=0.82 if feedback else 0.78,
            ),
            strategicOpportunities=opportunities,
        )

    async def run_strategy_brief(
        self,
        brand_name: str,
        product_name: str,
        objective: str,
        market_sensing: MarketSensingDeliverable,
        feedback: str | None = None,
        context_id: str | None = None,
        user_id: str | None = None,
        language: str = "ko",
    ) -> CampaignBriefDeliverable:
        """Run [P2] Strategy & Brief Agent."""
        target_lang = resolve_language(f"{objective} {feedback or ''}", language)
        lang_directive = (
            "\nCRITICAL LANGUAGE REQUIREMENT: Output all deliverable textual fields (campaignTitle, coreValueProposition, targetPersonas name/demographics/needs/barriers, messagingPillars, toneAndVoice) strictly in Korean (한국어로 작성). Do NOT respond in English.\n"
            if target_lang == "ko"
            else "\nCRITICAL LANGUAGE REQUIREMENT: Output all deliverable textual fields strictly in English.\n"
        )
        prompt = (
            f"Brand: {brand_name}, Product: {product_name}\n"
            f"Objective: {objective}\n"
            f"Market Sensing Deliverable: {market_sensing.model_dump_json()}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n"
            f"{lang_directive}\n"
            "Formulate a sharp creative campaign strategy brief. "
            "If Human Revision Instructions are provided, prioritize the revision feedback in the campaign title, value proposition, personas, and messaging pillars."
        )
        if self.p2_url:
            logger.info("Calling remote [P2] A2A endpoint: %s", self.p2_url)
            try:
                data = await self._call_remote_a2a(
                    self.p2_url, prompt, context_id=context_id, user_id=user_id
                )
                return CampaignBriefDeliverable.model_validate(data)
            except Exception as e:
                logger.warning(
                    "Remote [P2] A2A call failed: %s. Falling back to local agent execution.",
                    e,
                )

        ai_deliv = await self._execute_local_agent(
            prompt, CampaignBriefDeliverable, "P2 Strategy Brief"
        )
        if ai_deliv:
            return ai_deliv

        logger.info("Executing [P2] Strategy Brief via local agent fallback")
        if target_lang == "ko":
            title = f"{product_name or '신제품'} 프리미어: 차세대 혁신을 경험하다"
            core_val = (
                f"{product_name or '신제품'}의 혁신적인 AI 엔진과 프로급 성능으로 "
                "업무와 일상의 생산성을 극대화하고 가장 앞선 프리미엄 가치를 경험하세요."
            )
            if feedback:
                title = f"{product_name or '신제품'} 프리미어: 피드백 반영 ({feedback[:25]})"
                core_val = f"{core_val} (피드백 반영: '{feedback}')"

            personas = [
                TargetPersona(
                    name="테크 얼리어답터 & 크리에이터"
                    + (f" ({feedback[:15]})" if feedback else ""),
                    demographics="25-42세, 전문직 및 디지털 콘텐츠 크리에이터",
                    primaryNeeds=[
                        "최고 사양 AI 처리 속도",
                        "프로급 저조도 카메라",
                        "효율적인 멀티태스킹",
                    ],
                    barriers=[
                        "플래그십 가격 부담",
                        "기존 사용 기기로부터의 데이터 이전 번거로움",
                    ],
                ),
                TargetPersona(
                    name="실용적 프리미엄 업그레이더",
                    demographics="30-49세, 직장인 및 비즈니스 전문가",
                    primaryNeeds=[
                        "장기 소프트웨어 업데이트 지원",
                        "신뢰성 있는 배터리 수명",
                        "합리적인 보상판매 혜택",
                    ],
                    barriers=[
                        "복잡한 통신사 요금제 및 약정",
                        "잦은 신제품 출시에 따른 피로감",
                    ],
                ),
            ]
            pillars = [
                MessagingPillar(
                    pillar="온디바이스 AI 생산성 혁신",
                    keyMessage="더 강력해진 AI가 당신의 일상과 업무 효율을 극대화합니다.",
                    proofPoints=[
                        "실시간 음성 요약 및 번역",
                        "스마트 사진 자동 보정",
                        "온디바이스 NPU",
                    ],
                ),
                MessagingPillar(
                    pillar="최대 보상판매 & 합리적 프리미엄 혜택",
                    keyMessage="쓰던 기기 그대로 반납하고 가장 부담 없이 차세대 플래그십을 시작하세요.",
                    proofPoints=[
                        "업계 최고 수준 중고 보상가",
                        "무이자 할부",
                        "사전예약 더블 스토리지",
                    ],
                ),
            ]
            tones = [
                "혁신적인 (Innovative)",
                "역동적인 (Empowering)",
                "신뢰할 수 있는 (Trustworthy)",
            ]
        else:
            title = f"Illuminate Your Potential: {product_name} Black Friday Premiere"
            core_val = (
                f"Experience uncompromised creative freedom with {product_name}'s next-gen "
                "AI engine and pro visual capture, backed by Nova's best holiday incentives."
            )
            if feedback:
                title = f"{product_name} Premiere: Refined for {feedback[:35]}"
                core_val = f"{core_val} (Refined per feedback: '{feedback}')"

            personas = [
                TargetPersona(
                    name="Tech-Savvy Creator"
                    + (f" ({feedback[:20]})" if feedback else ""),
                    demographics="25-38, Urban Professionals, Mobile Content Creators",
                    primaryNeeds=[
                        "Rapid on-device AI editing",
                        "True pro-grade 4K camera",
                        "Seamless multi-tasking",
                    ],
                    barriers=[
                        "Flagship price barrier",
                        "Data transfer inertia from competing ecosystems",
                    ],
                ),
                TargetPersona(
                    name="Value-Driven Tech Enthusiast",
                    demographics="28-45, Tech Early Adopters, Gadget Upgrade Seekers",
                    primaryNeeds=[
                        "Industry-leading trade-in bonus",
                        "Guaranteed software longevity",
                        "Battery efficiency",
                    ],
                    barriers=[
                        "Confusing carrier contracts",
                        "Incremental upgrade skepticism",
                    ],
                ),
            ]
            pillars = [
                MessagingPillar(
                    pillar="AI-Powered Creative Freedom",
                    keyMessage="Transform every idea into reality with on-device generative tools built for creators.",
                    proofPoints=[
                        "Sub-second multimodal generation",
                        "Instant 100x zoom stabilization",
                        "Zero cloud latency",
                    ],
                ),
                MessagingPillar(
                    pillar="Maximum Value Trade-in Upgrade",
                    keyMessage="Upgrade to flagship performance effortlessly with unmatched holiday trade-in credits.",
                    proofPoints=[
                        "Guaranteed highest trade-in value",
                        "0% interest financing",
                        "Double storage promotion",
                    ],
                ),
            ]
            tones = ["Visionary", "Sophisticated", "Empowering", "Authoritative"]

        return CampaignBriefDeliverable(
            campaignTitle=title,
            coreValueProposition=core_val,
            targetPersonas=personas,
            messagingPillars=pillars,
            toneAndVoice=tones,
        )

    async def run_creative_content(
        self,
        brief: CampaignBriefDeliverable,
        feedback: str | None = None,
        context_id: str | None = None,
        user_id: str | None = None,
        visual_prompt_override: str | None = None,
        language: str = "ko",
    ) -> CreativeContentDeliverable:
        """Run [P3] Creative Content Agent."""
        campaign_id = context_id or "default"
        user_line = f"User ID: {user_id}\n" if user_id else ""
        target_lang = resolve_language(
            f"{brief.campaignTitle} {brief.coreValueProposition} {feedback or ''}",
            language,
        )
        lang_directive = (
            "\nCRITICAL LANGUAGE REQUIREMENT: Output visualConceptTitle, headlineCopy, bodyCopy, and callToAction strictly in Korean (한국어로 작성). For visualPromptUsed, use descriptive English for high-quality image generation.\n"
            if target_lang == "ko"
            else "\nCRITICAL LANGUAGE REQUIREMENT: Output visualConceptTitle, headlineCopy, bodyCopy, callToAction, and visualPromptUsed strictly in English.\n"
        )
        prompt = (
            f"{user_line}"
            f"Campaign ID / Session ID: {campaign_id}\n"
            f"Campaign Brief: {brief.model_dump_json()}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n"
            f"{lang_directive}\n"
            "Translate the brief into marketing headline, body copy, CTA, and a photorealistic 16:9 visual prompt for Nano Banana. "
            "If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes."
        )
        if self.p3_url:
            logger.info("Calling remote [P3] A2A endpoint: %s", self.p3_url)
            try:
                data = await self._call_remote_a2a(
                    self.p3_url, prompt, context_id=context_id, user_id=user_id
                )
                deliv = CreativeContentDeliverable.model_validate(data)
                if deliv.assetUrl and (
                    deliv.assetUrl.startswith("http")
                    or deliv.assetUrl.startswith("gs://")
                ):
                    deliv.storageUri = deliv.assetUrl
                    deliv.assetUrl = f"/api/v1/campaigns/{campaign_id}/visual"
                return deliv
            except Exception as e:
                logger.warning(
                    "Remote [P3] A2A call failed: %s. Falling back to local agent execution.",
                    e,
                )

        # Delegate execution to the creative_content subagent pipeline
        from app.agents.creative_content.agent import run_creative_content_pipeline

        logger.info(
            "Executing [P3] Creative Content via self-contained sequential subagent pipeline"
        )
        return await run_creative_content_pipeline(
            brief=brief,
            feedback=feedback,
            session_id=campaign_id,
            user_id=user_id,
            visual_prompt_override=visual_prompt_override,
            language=target_lang,
        )

    async def run_performance_insights(
        self,
        budget: float,
        currency: str,
        channels: list[str],
        brief: CampaignBriefDeliverable,
        creative: CreativeContentDeliverable | None = None,
        feedback: str | None = None,
        context_id: str | None = None,
        user_id: str | None = None,
        language: str = "ko",
    ) -> PerformanceInsightsDeliverable:
        """Run [P4] Performance & Insights Agent."""
        target_lang = resolve_language(
            f"{brief.campaignTitle} {feedback or ''}", language
        )
        lang_directive = (
            "\nCRITICAL LANGUAGE REQUIREMENT: Output channelAllocations rationale, recommendations, and visualConceptSummary strictly in Korean (한국어로 작성). Do NOT respond in English.\n"
            if target_lang == "ko"
            else "\nCRITICAL LANGUAGE REQUIREMENT: Output channelAllocations rationale, recommendations, and visualConceptSummary strictly in English.\n"
        )

        creative_context = ""
        if creative:
            creative_context = (
                f"\nEvaluated Creative Visual Concept: {creative.visualConceptTitle}\n"
                f"Creative Headline: {creative.headlineCopy}\n"
                f"Creative Asset URL: {creative.assetUrl}\n"
                f"Visual Prompt: {creative.visualPromptUsed}\n"
            )

        prompt = (
            f"Budget: {budget} {currency}\n"
            f"Channels: {channels}\n"
            f"Brief: {brief.model_dump_json()}\n"
            f"{creative_context}"
            f"Human Revision Instructions: {feedback or 'None'}\n"
            f"{lang_directive}\n"
            "Model multi-channel budget allocations and forecast realistic KPIs/ROAS. "
            "Evaluate how the creative visual concept drives engagement and conversion on visual channels. "
            "Ensure the sum of percentage equals 100% and amounts equal total budget. "
            "Populate creativeAssetUrl and visualConceptSummary in your deliverable."
        )
        deliverable: PerformanceInsightsDeliverable | None = None
        if self.p4_url:
            logger.info("Calling remote [P4] A2A endpoint: %s", self.p4_url)
            try:
                data = await self._call_remote_a2a(
                    self.p4_url, prompt, context_id=context_id, user_id=user_id
                )
                deliverable = PerformanceInsightsDeliverable.model_validate(data)
            except Exception as e:
                logger.warning(
                    "Remote [P4] A2A call failed: %s. Falling back to local agent execution.",
                    e,
                )

        if not deliverable:
            ai_deliv = await self._execute_local_agent(
                prompt, PerformanceInsightsDeliverable, "P4 Performance Insights"
            )
            if ai_deliv:
                total_pct = sum(a.percentage for a in ai_deliv.channelAllocations)
                if round(total_pct, 1) != 100.0 and ai_deliv.channelAllocations:
                    diff = round(100.0 - total_pct, 1)
                    ai_deliv.channelAllocations[0].percentage = round(
                        ai_deliv.channelAllocations[0].percentage + diff, 1
                    )
                    ai_deliv.channelAllocations[0].allocationAmount = round(
                        budget * (ai_deliv.channelAllocations[0].percentage / 100.0), 2
                    )
                deliverable = ai_deliv

        if not deliverable:
            logger.info("Executing [P4] Performance Insights via local agent fallback")
            allocations: list[ChannelAllocation] = []
            n_channels = len(channels) if channels else 1
            base_pct = round(100.0 / n_channels, 1)

            boost_channel = None
            if feedback:
                fb_lower = feedback.lower()
                for ch in channels:
                    if any(word in fb_lower for word in ch.lower().split()):
                        boost_channel = ch
                        break

            for ch in channels:
                pct = base_pct
                if boost_channel:
                    if ch == boost_channel:
                        pct = min(60.0, base_pct + 15.0)
                    else:
                        pct = max(5.0, base_pct - 15.0 / max(1, n_channels - 1))

                if target_lang == "ko":
                    rationale = f"{ch} 채널을 통한 타겟 도달 및 전환 극대화"
                    if feedback and ch == boost_channel:
                        rationale += f" [피드백 반영 예산 증액: {feedback[:25]}]"
                else:
                    rationale = f"Primary driver for {ch.lower()} reach"
                    if feedback and ch == boost_channel:
                        rationale += f" [Boosted per revision: {feedback[:30]}]"

                allocations.append(
                    ChannelAllocation(
                        channel=ch,
                        allocationAmount=round(budget * (pct / 100.0), 2),
                        percentage=round(pct, 1),
                        rationale=rationale,
                    )
                )

            total_pct = sum(a.percentage for a in allocations)
            if total_pct != 100.0 and allocations:
                allocations[0].percentage = round(
                    allocations[0].percentage + (100.0 - total_pct), 1
                )
                allocations[0].allocationAmount = round(
                    budget * (allocations[0].percentage / 100.0), 2
                )

            if target_lang == "ko":
                recs = [
                    "캠페인 런칭 7일 전 디지털 비디오 예산의 40%를 집중 집행하여 사전 관심도 극대화",
                    "보상판매 및 할인 혜택 관련 고의도 키워드 검색 광고를 집행하여 즉각적인 ROAS 개선",
                    "소셜 채널에서 제품 기능 시연 비주얼을 활용한 A/B 테스트를 진행하여 전환율 제고",
                ]
                if feedback:
                    recs.insert(
                        0,
                        f"피드백 반영: 지침에 따라 전략 수정 완료 ('{feedback}').",
                    )
                summary = (
                    f"평가된 비주얼 컨셉: '{creative.visualConceptTitle}' - 소셜 및 비디오 채널 클릭율 및 전환 상승 견인"
                    if creative
                    else None
                )
            else:
                recs = [
                    "Front-load 40% of digital video spend 7 days prior to Black Friday to prime high-intent audiences.",
                    "Utilize dynamic search ads targeting trade-in keywords for immediate ROAS uplift.",
                    "A/B test the indigo neon visual creative against standard white studio renders in social retargeting.",
                ]
                if feedback:
                    recs.insert(
                        0,
                        f"Revision Applied: Strategy shifted per instructions ('{feedback}').",
                    )
                summary = (
                    f"Evaluated visual concept: {creative.visualConceptTitle}"
                    if creative
                    else None
                )

            deliverable = PerformanceInsightsDeliverable(
                totalBudget=budget,
                currency=currency,
                channelAllocations=allocations,
                projectedKpis=ProjectedKPIs(
                    estimatedImpressions=int(
                        budget * 29.2 if feedback else budget * 28.5
                    ),
                    estimatedClicks=int(budget * 0.98 if feedback else budget * 0.95),
                    estimatedConversions=int(
                        budget * 0.041 if feedback else budget * 0.038
                    ),
                    projectedCtr=3.45 if feedback else 3.33,
                ),
                expectedRoas=4.65 if feedback else 4.45,
                recommendations=recs,
                creativeAssetUrl=creative.assetUrl if creative else None,
                visualConceptSummary=summary,
            )

        # Ensure creativeAssetUrl is carried forward
        if creative and not deliverable.creativeAssetUrl:
            deliverable.creativeAssetUrl = creative.assetUrl
        if creative and not deliverable.visualConceptSummary:
            deliverable.visualConceptSummary = (
                f"평가된 비주얼 컨셉 '{creative.visualConceptTitle}' 기반 집행 최적화"
                if target_lang == "ko"
                else f"Evaluated visual concept '{creative.visualConceptTitle}' for high-impact social and video engagement."
            )

        return deliverable
