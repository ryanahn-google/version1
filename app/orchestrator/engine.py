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

"""Multi-Agent Campaign DAG Execution Engine with Human-in-the-Loop review gates."""

import logging
import uuid

from fastapi import HTTPException, status

from app.orchestrator.a2a_client import A2ASubAgentClient
from app.orchestrator.draft_store import get_draft_image_store
from app.orchestrator.session_repo import SessionRepository, get_session_repo
from app.schemas.campaign import (
    ApprovalAction,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
    CreateCampaignRequest,
    ParsePromptResponse,
    StageApprovalRequest,
)

logger = logging.getLogger(__name__)


class CampaignOrchestrationEngine:
    """Orchestrates multi-agent campaign workflows with HITL async approval gates."""

    def __init__(
        self,
        repo: SessionRepository | None = None,
        a2a_client: A2ASubAgentClient | None = None,
    ) -> None:
        self.repo = repo or get_session_repo()
        self.a2a = a2a_client or A2ASubAgentClient()

    async def create_campaign(
        self,
        request: CreateCampaignRequest,
        principal: str,
        user_id: str | None = None,
    ) -> CampaignSessionResponse:
        """Create campaign and execute Stage 1 non-streaming."""
        session_id = f"camp-{uuid.uuid4().hex[:8]}"
        await self.repo.create_session(
            session_id=session_id,
            user_id=user_id,
            brand_name=request.brandName,
            product_name=request.productName,
            campaign_objective=request.campaignObjective,
            budget_amount=request.budgetAmount,
            currency=request.currency,
            channels=request.channels,
            tenant_id="nova-corp",
        )
        lang = getattr(request, "language", "ko")
        deliv1 = await self.a2a.run_market_sensing(
            brand_name=request.brandName,
            product_name=request.productName,
            objective=request.campaignObjective,
            audience=request.targetAudience,
            context_id=f"{session_id}-p1",
            language=lang,
        )
        deliv2 = await self.a2a.run_strategy_brief(
            brand_name=request.brandName,
            product_name=request.productName,
            objective=request.campaignObjective,
            market_sensing=deliv1,
            context_id=f"{session_id}-p2",
            language=lang,
        )
        updated = await self.repo.update_session(
            session_id=session_id,
            status=CampaignStatus.PAUSED_FOR_REVIEW,
            current_stage=CampaignStage.STRATEGY_BRIEF,
            deliverables={
                "marketSensing": deliv1.model_dump(mode="json"),
                "campaignBrief": deliv2.model_dump(mode="json"),
            },
            user_id=user_id,
        )
        if not updated:
            raise RuntimeError(f"Session {session_id} not found after creation.")
        return updated

    async def rollback_stage(
        self,
        session_id: str,
        user_id: str | None = None,
    ) -> CampaignSessionResponse:
        """Rollback session strictly to the immediately preceding stage (N - 1)."""
        session = await self.repo.get_session(session_id, user_id=user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign session '{session_id}' not found.",
            )

        current_stage = session.currentStage
        # Map of valid single-step rollbacks: Current Stage -> Preceding Stage
        rollback_map = {
            CampaignStage.CREATIVE_CONTENT: CampaignStage.STRATEGY_BRIEF,
            CampaignStage.PERFORMANCE_INSIGHTS: CampaignStage.CREATIVE_CONTENT,
            CampaignStage.MEDIA_EXECUTION: CampaignStage.PERFORMANCE_INSIGHTS,
            CampaignStage.COMPLETED: CampaignStage.MEDIA_EXECUTION,
        }

        if current_stage not in rollback_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot roll back from stage '{current_stage.value}'. "
                    "Stage 1 (Planning / Market Sensing & Strategy Brief) is the initial stage."
                ),
            )

        target_stage = rollback_map[current_stage]
        updated = await self.repo.update_session(
            session_id,
            current_stage=target_stage,
            status=CampaignStatus.PAUSED_FOR_REVIEW,
            user_id=user_id,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update session stage during rollback.",
            )
        return updated

    async def approve_stage(
        self,
        session_id: str,
        request: StageApprovalRequest,
        principal: str,
        user_id: str | None = None,
    ) -> CampaignSessionResponse:
        """Handle human review approval or revision feedback directly."""
        session = await self.repo.get_session(session_id, user_id=user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign session '{session_id}' not found.",
            )

        current_stage = session.currentStage
        action = request.action
        feedback = request.feedback

        # Commit marketer-provided deliverable updates if present
        if request.deliverableUpdates:
            current_delivs = session.deliverables.model_dump(mode="json")
            for key, val in request.deliverableUpdates.items():
                if val is not None:
                    if (
                        key in current_delivs
                        and isinstance(current_delivs[key], dict)
                        and isinstance(val, dict)
                    ):
                        current_delivs[key].update(val)
                    else:
                        current_delivs[key] = val
            updated_session = await self.repo.update_session(
                session_id,
                deliverables=current_delivs,
            )
            if updated_session:
                session = updated_session

        # --- Case 1: Revision requested ---
        session_lang = (
            "ko"
            if any(
                "\uac00" <= ch <= "\ud7a3"
                for ch in f"{session.campaignObjective} {session.productName} {feedback or ''}"
            )
            else "en"
        )
        if action == ApprovalAction.REVISE:
            await self.repo.update_session(session_id, increment_revision=True)

            if current_stage == CampaignStage.MARKET_SENSING:
                audience = getattr(session, "targetAudience", "General")
                deliv1 = await self.a2a.run_market_sensing(
                    session.brandName,
                    session.productName,
                    session.campaignObjective,
                    audience,
                    feedback=feedback,
                    context_id=f"{session_id}-p1-rev",
                    language=session_lang,
                )
                updated = await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"marketSensing": deliv1.model_dump(mode="json")},
                )
                return updated or session

            elif current_stage == CampaignStage.STRATEGY_BRIEF:
                market_sensing = session.deliverables.marketSensing
                if not market_sensing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Missing Market Sensing deliverable for Strategy Brief revision",
                    )
                deliv2 = await self.a2a.run_strategy_brief(
                    session.brandName,
                    session.productName,
                    session.campaignObjective,
                    market_sensing,
                    feedback=feedback,
                    context_id=f"{session_id}-p2-rev",
                    language=session_lang,
                )
                updated = await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"campaignBrief": deliv2.model_dump(mode="json")},
                )
                return updated or session

            elif current_stage == CampaignStage.CREATIVE_CONTENT:
                campaign_brief = session.deliverables.campaignBrief
                if not campaign_brief:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Missing Campaign Brief deliverable for Creative Content revision",
                    )
                # Purge old in-memory draft image before re-running P3
                get_draft_image_store().delete_draft(session_id)

                effective_user_id = session.userId or user_id
                deliv3 = await self.a2a.run_creative_content(
                    campaign_brief,
                    feedback=feedback,
                    context_id=session_id,
                    user_id=effective_user_id,
                    language=session_lang,
                )
                if deliv3.assetUrl and (
                    deliv3.assetUrl.startswith("http")
                    or deliv3.assetUrl.startswith("gs://")
                ):
                    deliv3.storageUri = deliv3.assetUrl
                    deliv3.assetUrl = f"/api/v1/campaigns/{session_id}/visual"

                updated = await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"creativeContent": deliv3.model_dump(mode="json")},
                )
                return updated or session

            elif current_stage == CampaignStage.PERFORMANCE_INSIGHTS:
                campaign_brief = session.deliverables.campaignBrief
                if not campaign_brief:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Missing Campaign Brief deliverable for Performance Insights revision",
                    )
                deliv4 = await self.a2a.run_performance_insights(
                    budget=session.budgetAmount,
                    currency=session.currency,
                    channels=session.channels,
                    brief=campaign_brief,
                    creative=session.deliverables.creativeContent,
                    feedback=feedback,
                    context_id=f"{session_id}-p4-rev",
                    language=session_lang,
                )
                updated = await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={
                        "performanceInsights": deliv4.model_dump(mode="json")
                    },
                )
                return updated or session

            elif current_stage == CampaignStage.MEDIA_EXECUTION:
                updated = await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                )
                return updated or session

        # --- Case 2: Approval -> Advance to next stage ---
        if current_stage == CampaignStage.MARKET_SENSING:
            next_stage = CampaignStage.STRATEGY_BRIEF
            market_sensing = session.deliverables.marketSensing
            if not market_sensing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing Market Sensing deliverable to proceed",
                )
            deliv_p2 = await self.a2a.run_strategy_brief(
                session.brandName,
                session.productName,
                session.campaignObjective,
                market_sensing,
                context_id=f"{session_id}-p2",
                language=session_lang,
            )
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=next_stage,
                deliverables={"campaignBrief": deliv_p2.model_dump(mode="json")},
            )
            return updated or session

        elif current_stage == CampaignStage.STRATEGY_BRIEF:
            next_stage = CampaignStage.CREATIVE_CONTENT
            campaign_brief = session.deliverables.campaignBrief
            if not campaign_brief:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing Campaign Brief deliverable to proceed",
                )
            effective_user_id = session.userId or user_id
            deliv_p3 = await self.a2a.run_creative_content(
                campaign_brief,
                context_id=session_id,
                user_id=effective_user_id,
                language=session_lang,
            )
            if deliv_p3.assetUrl and (
                deliv_p3.assetUrl.startswith("http")
                or deliv_p3.assetUrl.startswith("gs://")
            ):
                deliv_p3.storageUri = deliv_p3.assetUrl
                deliv_p3.assetUrl = f"/api/v1/campaigns/{session_id}/visual"

            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=next_stage,
                deliverables={"creativeContent": deliv_p3.model_dump(mode="json")},
            )
            return updated or session

        elif current_stage == CampaignStage.CREATIVE_CONTENT:
            next_stage = CampaignStage.PERFORMANCE_INSIGHTS
            campaign_brief = session.deliverables.campaignBrief
            if not campaign_brief:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing Campaign Brief deliverable to proceed",
                )
            # HITL Approval: Commit in-memory draft image to Cloud Storage (GCS)
            effective_user_id = session.userId or user_id
            committed_gcs_url = get_draft_image_store().commit_draft_to_gcs(
                session_id, user_id=effective_user_id
            )
            if session.deliverables.creativeContent:
                if committed_gcs_url:
                    session.deliverables.creativeContent.storageUri = committed_gcs_url
                if session.deliverables.creativeContent.storageUri:
                    session.deliverables.creativeContent.assetUrl = (
                        f"/api/v1/campaigns/{session_id}/visual"
                    )
                await self.repo.update_session(
                    session_id,
                    deliverables={
                        "creativeContent": session.deliverables.creativeContent.model_dump(
                            mode="json"
                        )
                    },
                )

            deliv_p4 = await self.a2a.run_performance_insights(
                session.budgetAmount,
                session.currency,
                session.channels,
                campaign_brief,
                creative=session.deliverables.creativeContent,
                context_id=f"{session_id}-p4",
                language=session_lang,
            )
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=CampaignStage.PERFORMANCE_INSIGHTS,
                deliverables={"performanceInsights": deliv_p4.model_dump(mode="json")},
            )
            return updated or session

        elif current_stage == CampaignStage.PERFORMANCE_INSIGHTS:
            next_stage = CampaignStage.MEDIA_EXECUTION
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=next_stage,
            )
            return updated or session

        elif current_stage == CampaignStage.MEDIA_EXECUTION:
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.COMPLETED,
                current_stage=CampaignStage.COMPLETED,
            )
            return updated or session

        return session

    async def parse_prompt(
        self, prompt: str, language: str = "ko"
    ) -> ParsePromptResponse:
        """Parse natural language prompt into structured campaign brief parameters."""
        return await self.a2a.parse_campaign_prompt(prompt, language=language)


_orchestrator_engine = CampaignOrchestrationEngine()


def get_orchestration_engine() -> CampaignOrchestrationEngine:
    """Dependency getter for orchestration engine."""
    return _orchestrator_engine
