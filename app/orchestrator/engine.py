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
from collections.abc import AsyncGenerator

from app.orchestrator.a2a_client import A2ASubAgentClient
from app.orchestrator.session_repo import SessionRepository, get_session_repo
from app.schemas.campaign import (
    ApprovalAction,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
    CampaignStreamEvent,
    CreateCampaignRequest,
    StageApprovalRequest,
)

logger = logging.getLogger(__name__)


def _format_sse(event: CampaignStreamEvent) -> str:
    """Format Pydantic event into SSE wire protocol."""
    return f"event: {event.event}\ndata: {event.model_dump_json()}\n\n"


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
        self, request: CreateCampaignRequest, principal: str
    ) -> CampaignSessionResponse:
        """Create campaign and execute Stage 1 non-streaming."""
        session_id = f"camp-{uuid.uuid4().hex[:8]}"
        await self.repo.create_session(
            session_id=session_id,
            brand_name=request.brandName,
            product_name=request.productName,
            campaign_objective=request.campaignObjective,
            budget_amount=request.budgetAmount,
            currency=request.currency,
            channels=request.channels,
            tenant_id="nova-corp",
        )
        deliv = await self.a2a.run_market_sensing(
            brand_name=request.brandName,
            product_name=request.productName,
            objective=request.campaignObjective,
            audience=request.targetAudience,
            context_id=f"{session_id}-p1",
        )
        updated = await self.repo.update_session(
            session_id=session_id,
            status=CampaignStatus.PAUSED_FOR_REVIEW,
            current_stage=CampaignStage.MARKET_SENSING,
            deliverables={"marketSensing": deliv.model_dump(mode="json")},
        )
        return updated

    async def stream_create_campaign(
        self, request: CreateCampaignRequest, principal: str
    ) -> AsyncGenerator[str, None]:
        """Initialize campaign session and stream execution of Stage 1 (Market Sensing)."""
        session_id = f"camp-{uuid.uuid4().hex[:8]}"
        await self.repo.create_session(
            session_id=session_id,
            brand_name=request.brandName,
            product_name=request.productName,
            campaign_objective=request.campaignObjective,
            budget_amount=request.budgetAmount,
            currency=request.currency,
            channels=request.channels,
            tenant_id="nova-corp",
        )

        yield _format_sse(
            CampaignStreamEvent(
                event="stage_started",
                stage=CampaignStage.MARKET_SENSING.value,
                sessionId=session_id,
                data={
                    "message": f"Starting [P1] Market Sensing for {request.productName}..."
                },
            )
        )

        try:
            deliv = await self.a2a.run_market_sensing(
                brand_name=request.brandName,
                product_name=request.productName,
                objective=request.campaignObjective,
                audience=request.targetAudience,
                context_id=f"{session_id}-p1",
            )

            updated_session = await self.repo.update_session(
                session_id=session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=CampaignStage.MARKET_SENSING,
                deliverables={"marketSensing": deliv.model_dump(mode="json")},
            )

            yield _format_sse(
                CampaignStreamEvent(
                    event="artifact_generated",
                    stage=CampaignStage.MARKET_SENSING.value,
                    sessionId=session_id,
                    data={"marketSensing": deliv.model_dump(mode="json")},
                )
            )

            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_paused_for_review",
                    stage=CampaignStage.MARKET_SENSING.value,
                    sessionId=session_id,
                    data={
                        "message": "Market Sensing completed. Paused for Marketer review.",
                        "session": updated_session.model_dump(mode="json")
                        if updated_session
                        else {},
                    },
                )
            )

        except Exception as exc:
            logger.exception("Failed during Market Sensing stage: %s", exc)
            await self.repo.update_session(session_id, status=CampaignStatus.FAILED)
            yield _format_sse(
                CampaignStreamEvent(
                    event="error",
                    stage=CampaignStage.MARKET_SENSING.value,
                    sessionId=session_id,
                    data={"error": str(exc)},
                )
            )

    async def approve_stage(
        self,
        session_id: str,
        request: StageApprovalRequest,
        principal: str,
    ) -> CampaignSessionResponse | None:
        """Process approval or revision non-streaming."""
        async for _ in self.stream_stage_approval(session_id, request, principal):
            pass
        return await self.repo.get_session(session_id)

    async def stream_stage_approval(
        self,
        session_id: str,
        request: StageApprovalRequest,
        principal: str,
    ) -> AsyncGenerator[str, None]:
        """Handle human review approval or revision feedback, and stream subsequent execution."""
        session = await self.repo.get_session(session_id)
        if not session:
            yield _format_sse(
                CampaignStreamEvent(
                    event="error",
                    stage="UNKNOWN",
                    sessionId=session_id,
                    data={"error": f"Session {session_id} not found"},
                )
            )
            return

        current_stage = session.currentStage
        action = request.action
        feedback = request.feedback

        # --- Case 1: Revision requested ---
        if action == ApprovalAction.REVISE:
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_started",
                    stage=current_stage.value,
                    sessionId=session_id,
                    data={
                        "message": f"Revising {current_stage.value} with feedback: {feedback}"
                    },
                )
            )
            await self.repo.update_session(session_id, increment_revision=True)

            if current_stage == CampaignStage.MARKET_SENSING:
                deliv1 = await self.a2a.run_market_sensing(
                    session.brandName,
                    session.productName,
                    session.campaignObjective,
                    "General",
                    context_id=f"{session_id}-p1-rev",
                )
                await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"marketSensing": deliv1.model_dump(mode="json")},
                )
                yield _format_sse(
                    CampaignStreamEvent(
                        event="artifact_generated",
                        stage=current_stage.value,
                        sessionId=session_id,
                        data={"marketSensing": deliv1.model_dump(mode="json")},
                    )
                )

            elif current_stage == CampaignStage.STRATEGY_BRIEF:
                deliv2 = await self.a2a.run_strategy_brief(
                    session.brandName,
                    session.productName,
                    session.campaignObjective,
                    session.deliverables.marketSensing,
                    feedback=feedback,
                    context_id=f"{session_id}-p2-rev",
                )
                await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"campaignBrief": deliv2.model_dump(mode="json")},
                )
                yield _format_sse(
                    CampaignStreamEvent(
                        event="artifact_generated",
                        stage=current_stage.value,
                        sessionId=session_id,
                        data={"campaignBrief": deliv2.model_dump(mode="json")},
                    )
                )

            elif current_stage == CampaignStage.CREATIVE_CONTENT:
                deliv3 = await self.a2a.run_creative_content(
                    session.deliverables.campaignBrief, feedback=feedback, context_id=f"{session_id}-p3-rev"
                )
                await self.repo.update_session(
                    session_id,
                    status=CampaignStatus.PAUSED_FOR_REVIEW,
                    deliverables={"creativeContent": deliv3.model_dump(mode="json")},
                )
                yield _format_sse(
                    CampaignStreamEvent(
                        event="artifact_generated",
                        stage=current_stage.value,
                        sessionId=session_id,
                        data={"creativeContent": deliv3.model_dump(mode="json")},
                    )
                )

            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_paused_for_review",
                    stage=current_stage.value,
                    sessionId=session_id,
                    data={
                        "message": f"Revision completed for {current_stage.value}. Paused for review."
                    },
                )
            )
            return

        # --- Case 2: Approval -> Advance to next stage ---
        if current_stage == CampaignStage.MARKET_SENSING:
            next_stage = CampaignStage.STRATEGY_BRIEF
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_started",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={"message": "P1 Approved. Starting [P2] Strategy & Brief..."},
                )
            )
            deliv_p2 = await self.a2a.run_strategy_brief(
                session.brandName,
                session.productName,
                session.campaignObjective,
                session.deliverables.marketSensing,
                context_id=f"{session_id}-p2",
            )
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=next_stage,
                deliverables={"campaignBrief": deliv_p2.model_dump(mode="json")},
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="artifact_generated",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={"campaignBrief": deliv_p2.model_dump(mode="json")},
                )
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_paused_for_review",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={
                        "message": "Strategy Brief ready for review.",
                        "session": updated.model_dump(mode="json") if updated else {},
                    },
                )
            )

        elif current_stage == CampaignStage.STRATEGY_BRIEF:
            next_stage = CampaignStage.CREATIVE_CONTENT
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_started",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={
                        "message": "P2 Approved. Starting [P3] Creative Content generation (Imagen 3)..."
                    },
                )
            )
            deliv_p3 = await self.a2a.run_creative_content(
                session.deliverables.campaignBrief, context_id=f"{session_id}-p3"
            )
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.PAUSED_FOR_REVIEW,
                current_stage=next_stage,
                deliverables={"creativeContent": deliv_p3.model_dump(mode="json")},
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="artifact_generated",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={"creativeContent": deliv_p3.model_dump(mode="json")},
                )
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_paused_for_review",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={
                        "message": "Creative Content visual ready for review.",
                        "session": updated.model_dump(mode="json") if updated else {},
                    },
                )
            )

        elif current_stage == CampaignStage.CREATIVE_CONTENT:
            next_stage = CampaignStage.PERFORMANCE_INSIGHTS
            yield _format_sse(
                CampaignStreamEvent(
                    event="stage_started",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={
                        "message": "P3 Approved. Starting [P4] Performance & Insights budget allocation..."
                    },
                )
            )
            deliv_p4 = await self.a2a.run_performance_insights(
                session.budgetAmount,
                session.currency,
                session.channels,
                session.deliverables.campaignBrief,
                context_id=f"{session_id}-p4",
            )
            updated = await self.repo.update_session(
                session_id,
                status=CampaignStatus.COMPLETED,
                current_stage=CampaignStage.COMPLETED,
                deliverables={"performanceInsights": deliv_p4.model_dump(mode="json")},
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="artifact_generated",
                    stage=next_stage.value,
                    sessionId=session_id,
                    data={"performanceInsights": deliv_p4.model_dump(mode="json")},
                )
            )
            yield _format_sse(
                CampaignStreamEvent(
                    event="campaign_completed",
                    stage=CampaignStage.COMPLETED.value,
                    sessionId=session_id,
                    data={
                        "message": "Full campaign planning DAG completed successfully!",
                        "session": updated.model_dump(mode="json") if updated else {},
                    },
                )
            )


_orchestrator_engine = CampaignOrchestrationEngine()


def get_orchestration_engine() -> CampaignOrchestrationEngine:
    """Dependency getter for orchestration engine."""
    return _orchestrator_engine
