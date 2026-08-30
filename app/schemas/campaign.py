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

"""Pydantic v2 schemas for Campaign workflow, requests, and session states."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.deliverables import (
    CampaignBriefDeliverable,
    CreativeContentDeliverable,
    MarketSensingDeliverable,
    PerformanceInsightsDeliverable,
)


class CampaignStage(StrEnum):
    """Stages of the Multi-Agent Campaign Planning DAG."""

    MARKET_SENSING = "MARKET_SENSING"
    STRATEGY_BRIEF = "STRATEGY_BRIEF"
    CREATIVE_CONTENT = "CREATIVE_CONTENT"
    PERFORMANCE_INSIGHTS = "PERFORMANCE_INSIGHTS"
    MEDIA_EXECUTION = "MEDIA_EXECUTION"
    COMPLETED = "COMPLETED"


class CampaignStatus(StrEnum):
    """Lifecycle status of a campaign planning session."""

    INITIALIZING = "INITIALIZING"
    RUNNING = "RUNNING"
    PAUSED_FOR_REVIEW = "PAUSED_FOR_REVIEW"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ApprovalAction(StrEnum):
    """Human-in-the-Loop review actions."""

    APPROVE = "approve"
    REVISE = "revise"


class CreateCampaignRequest(BaseModel):
    """Payload to initiate a new campaign planning workflow."""

    brandName: str = Field(
        ...,
        description="Brand or enterprise name",
        json_schema_extra={"example": "Nova Electronics Corp"},
    )
    productName: str = Field(
        ...,
        description="Product or service name",
        json_schema_extra={"example": "Galaxy S27 Ultra"},
    )
    campaignObjective: str = Field(
        ...,
        description="High level campaign target or narrative goal",
        json_schema_extra={
            "example": "Black Friday Global Campaign targeting premium tech enthusiasts with AI camera features."
        },
    )
    targetAudience: str = Field(
        ...,
        description="Target customer segment description",
        json_schema_extra={
            "example": "Tech-savvy professionals and mobile photographers aged 25-45."
        },
    )
    budgetAmount: float = Field(
        ...,
        gt=0.0,
        description="Total campaign budget",
        json_schema_extra={"example": 1000000.0},
    )
    currency: str = Field(
        default="USD",
        description="Currency ISO code",
        json_schema_extra={"example": "USD"},
    )
    channels: list[str] = Field(
        default_factory=lambda: [
            "Digital Video",
            "Paid Search",
            "Social Media",
            "Retail Display",
        ],
        description="Preferred marketing channels",
    )
    stream: bool = Field(
        default=True,
        description="Whether to stream progress as SSE events",
    )


class StageApprovalRequest(BaseModel):
    """Payload submitted by marketer for stage review."""

    action: ApprovalAction = Field(
        ...,
        description="'approve' to proceed to next stage, 'revise' to re-run with feedback",
    )
    feedback: str | None = Field(
        default=None,
        description="Optional text feedback or modification instructions",
    )
    deliverableUpdates: dict[str, Any] | None = Field(
        default=None,
        description="Optional marketer-edited deliverable fields to commit upon approval or revision",
    )
    stream: bool = Field(
        default=True,
        description="Whether to stream subsequent stage execution",
    )


class CampaignDeliverables(BaseModel):
    """Aggregated deliverables across all stages."""

    marketSensing: MarketSensingDeliverable | None = None
    campaignBrief: CampaignBriefDeliverable | None = None
    creativeContent: CreativeContentDeliverable | None = None
    performanceInsights: PerformanceInsightsDeliverable | None = None


class CampaignSessionResponse(BaseModel):
    """Complete campaign session details."""

    sessionId: str = Field(..., description="Unique campaign session identifier")
    userId: str | None = Field(
        default=None, description="Owner user ID for user-isolated access"
    )
    tenantId: str = Field(
        default="default", description="Tenant identifier for multi-tenancy"
    )
    status: CampaignStatus = Field(..., description="Current lifecycle status")
    currentStage: CampaignStage = Field(..., description="Active or paused stage")
    brandName: str
    productName: str
    campaignObjective: str
    budgetAmount: float
    currency: str
    channels: list[str] = Field(default_factory=list)
    deliverables: CampaignDeliverables = Field(default_factory=CampaignDeliverables)
    revisionCount: int = Field(default=0, description="Number of revisions requested")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CampaignStreamEvent(BaseModel):
    """Event payload emitted over SSE stream."""

    event: str = Field(
        ...,
        description="Event type (stage_started, agent_thinking, artifact_generated, stage_paused_for_review, stage_completed, campaign_completed, error)",
    )
    stage: str
    sessionId: str
    data: dict[str, Any] = Field(default_factory=dict)
