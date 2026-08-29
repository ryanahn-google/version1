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
        self, endpoint_url: str, prompt_text: str, context_id: str | None = None
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

        payload = {
            "jsonrpc": "2.0",
            "method": "message/send",
            "params": params,
            "id": f"mvc-task-{uuid.uuid4().hex[:8]}",
        }
        headers = {"Content-Type": "application/json", "A2A-Version": "0.3"}

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
        """Execute local Vertex AI agent generation for MVC subagents."""
        import asyncio
        import os

        if os.environ.get("INTEGRATION_TEST") == "TRUE":
            return None

        try:
            from google.genai import Client

            settings = get_settings()
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
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema_cls,
                    },
                ),
                timeout=8.0,
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

    async def run_market_sensing(
        self,
        brand_name: str,
        product_name: str,
        objective: str,
        audience: str,
        feedback: str | None = None,
        context_id: str | None = None,
    ) -> MarketSensingDeliverable:
        """Run [P1] Market Sensing Agent."""
        prompt = (
            f"Brand: {brand_name}\n"
            f"Product: {product_name}\n"
            f"Objective: {objective}\n"
            f"Target Audience: {audience}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n\n"
            "Synthesize comprehensive market trends, competitive signals, and consumer sentiment. "
            "If Human Revision Instructions are provided, adapt the target market, trends, and strategic opportunities accordingly."
        )
        if self.p1_url:
            logger.info("Calling remote [P1] A2A endpoint: %s", self.p1_url)
            try:
                data = await self._call_remote_a2a(
                    self.p1_url, prompt, context_id=context_id
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
        target_market = f"Global Tier-1 Urban Tech Markets ({audience})"

        if feedback:
            target_market += f" [Refined: {feedback}]"
            trends.insert(0, f"Revision Focus: {feedback}")
            opportunities.insert(0, f"Tailored Strategic Shift: {feedback}")
            positive_themes.insert(0, f"Feedback Integration: {feedback}")

        return MarketSensingDeliverable(
            targetMarket=target_market,
            consumerTrends=trends,
            competitiveAnalysis=[
                CompetitorAnalysis(
                    competitor="Alpha Phone 17 Pro",
                    strengths=["Ecosystem lock-in", "Titanium build"],
                    vulnerabilities=["High repair cost", "Conservative AI features"],
                ),
                CompetitorAnalysis(
                    competitor="Apex Ultra X",
                    strengths=["Aggressive promotional pricing", "Fast charging"],
                    vulnerabilities=[
                        "Inconsistent low-light image processing",
                        "Fragmented UX",
                    ],
                ),
            ],
            sentimentOverview=SentimentOverview(
                positiveThemes=positive_themes,
                frictionPoints=[
                    "Rising flagship prices",
                    "Battery concerns during AI processing",
                ],
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
    ) -> CampaignBriefDeliverable:
        """Run [P2] Strategy & Brief Agent."""
        prompt = (
            f"Brand: {brand_name}, Product: {product_name}\n"
            f"Objective: {objective}\n"
            f"Market Sensing Deliverable: {market_sensing.model_dump_json()}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n\n"
            "Formulate a sharp creative campaign strategy brief. "
            "If Human Revision Instructions are provided, prioritize the revision feedback in the campaign title, value proposition, personas, and messaging pillars."
        )
        if self.p2_url:
            logger.info("Calling remote [P2] A2A endpoint: %s", self.p2_url)
            try:
                data = await self._call_remote_a2a(
                    self.p2_url, prompt, context_id=context_id
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
        title = f"Illuminate Your Potential: {product_name} Black Friday Premiere"
        core_val = (
            f"Experience uncompromised creative freedom with {product_name}'s next-gen "
            "AI engine and pro visual capture, backed by Nova's best holiday incentives."
        )
        if feedback:
            title = f"{product_name} Premiere: Refined for {feedback[:35]}"
            core_val = f"{core_val} (Refined per feedback: '{feedback}')"

        return CampaignBriefDeliverable(
            campaignTitle=title,
            coreValueProposition=core_val,
            targetPersonas=[
                TargetPersona(
                    name="Tech-Savvy Creator"
                    + (f" ({feedback[:20]})" if feedback else ""),
                    demographics="25-38, Urban Professionals, Mobile Content Creators",
                    primaryNeeds=[
                        "Flawless low-light capture",
                        "Seamless generative editing",
                    ]
                    + ([f"Focus: {feedback}"] if feedback else []),
                    barriers=["Flagship price barrier", "Annual upgrade fatigue"],
                ),
                TargetPersona(
                    name="Performance Seeker",
                    demographics="30-45, Corporate & Tech Leaders",
                    primaryNeeds=["All-day reliable battery", "On-device security"],
                    barriers=["Ecosystem migration resistance"],
                ),
            ],
            messagingPillars=[
                MessagingPillar(
                    pillar="Pro-Grade AI Vision"
                    if not feedback
                    else f"Revised Pillar: {feedback[:25]}",
                    keyMessage="Capture every night detail with zero blur or grain."
                    if not feedback
                    else f"Tailored Message: {feedback}",
                    proofPoints=[
                        "200MP sensor",
                        "Instant AI denoise",
                        "4K HDR Night Video",
                    ],
                ),
                MessagingPillar(
                    pillar="Unmatched Black Friday Value",
                    keyMessage="The premier flagship upgrade, guaranteed within reach.",
                    proofPoints=[
                        "Up to $800 trade-in credit",
                        "Double storage holiday gift",
                    ],
                ),
            ],
            toneAndVoice=["Visionary", "Sophisticated", "Empowering", "Authoritative"],
        )

    async def run_creative_content(
        self,
        brief: CampaignBriefDeliverable,
        feedback: str | None = None,
        context_id: str | None = None,
    ) -> CreativeContentDeliverable:
        """Run [P3] Creative Content Agent."""
        prompt = (
            f"Campaign ID / Session ID: {context_id or 'default'}\n"
            f"Campaign Brief: {brief.model_dump_json()}\n"
            f"Human Revision Instructions: {feedback or 'None'}\n\n"
            "Translate the brief into marketing headline, body copy, CTA, and a photorealistic 16:9 visual prompt for Nano Banana. "
            "If Human Revision Instructions are provided, rigorously align the visual concept and copy with the requested changes."
        )
        if self.p3_url:
            logger.info("Calling remote [P3] A2A endpoint: %s", self.p3_url)
            try:
                data = await self._call_remote_a2a(
                    self.p3_url, prompt, context_id=context_id
                )
                return CreativeContentDeliverable.model_validate(data)
            except Exception as e:
                logger.warning(
                    "Remote [P3] A2A call failed: %s. Falling back to local agent execution.",
                    e,
                )

        # Delegate execution entirely to the creative_content subagent pipeline
        from app.agents.creative_content.agent import run_creative_content_pipeline

        logger.info(
            "Executing [P3] Creative Content via self-contained sequential subagent pipeline"
        )
        return await run_creative_content_pipeline(
            brief=brief,
            feedback=feedback,
            session_id=context_id,
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
    ) -> PerformanceInsightsDeliverable:
        """Run [P4] Performance & Insights Agent."""
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
            f"Human Revision Instructions: {feedback or 'None'}\n\n"
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
                    self.p4_url, prompt, context_id=context_id
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
                # Ensure 100% budget conservation even with LLM output
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

                allocations.append(
                    ChannelAllocation(
                        channel=ch,
                        allocationAmount=round(budget * (pct / 100.0), 2),
                        percentage=round(pct, 1),
                        rationale=f"Primary driver for {ch.lower()} reach"
                        + (
                            f" [Boosted per revision: {feedback[:30]}]"
                            if ch == boost_channel
                            else ""
                        ),
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
                visualConceptSummary=f"Evaluated visual concept: {creative.visualConceptTitle}"
                if creative
                else None,
            )

        # Ensure creativeAssetUrl is carried forward
        if creative and not deliverable.creativeAssetUrl:
            deliverable.creativeAssetUrl = creative.assetUrl
        if creative and not deliverable.visualConceptSummary:
            deliverable.visualConceptSummary = f"Evaluated visual concept '{creative.visualConceptTitle}' for high-impact social and video engagement."

        return deliverable
