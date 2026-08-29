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

"""Pydantic v2 schemas for sub-agent deliverables (P1-P4)."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field

# --- [P1] Market Sensing Deliverable Models ---


class CompetitorAnalysis(BaseModel):
    """Competitive analysis details for a single competitor."""

    competitor: str = Field(..., description="Competitor name")
    strengths: list[str] = Field(
        default_factory=list, description="Key competitor strengths"
    )
    vulnerabilities: list[str] = Field(
        default_factory=list, description="Competitor weaknesses or market gaps"
    )


class SentimentOverview(BaseModel):
    """Consumer sentiment analysis overview."""

    positiveThemes: list[str] = Field(
        default_factory=list, description="Positive sentiment drivers"
    )
    frictionPoints: list[str] = Field(
        default_factory=list, description="Consumer pain points or complaints"
    )
    overallSentimentScore: float = Field(
        ..., ge=-1.0, le=1.0, description="Sentiment score from -1.0 to 1.0"
    )


class MarketSensingDeliverable(BaseModel):
    """Structured deliverable for [P1] Market Sensing Agent."""

    targetMarket: str = Field(
        ..., description="Target market and geographic segment definition"
    )
    consumerTrends: list[str] = Field(
        default_factory=list, description="Emerging consumer behavior trends"
    )
    competitiveAnalysis: list[CompetitorAnalysis] = Field(
        default_factory=list, description="Benchmarked competitors"
    )
    sentimentOverview: SentimentOverview = Field(
        ..., description="Consumer sentiment summary"
    )
    strategicOpportunities: list[str] = Field(
        default_factory=list, description="Recommended strategic angles for campaign"
    )


# --- [P2] Strategy & Brief Deliverable Models ---


class TargetPersona(BaseModel):
    """Target audience persona profile."""

    name: str = Field(..., description="Persona title/archetype")
    demographics: str = Field(
        ..., description="Age, occupation, income level, location"
    )
    primaryNeeds: list[str] = Field(
        default_factory=list, description="Core motivations and needs"
    )
    barriers: list[str] = Field(
        default_factory=list, description="Adoption hesitations or objections"
    )


class MessagingPillar(BaseModel):
    """Campaign core message pillar mapped to channels."""

    pillar: str = Field(..., description="Theme/pillar name")
    keyMessage: str = Field(..., description="Core narrative statement")
    proofPoints: list[str] = Field(
        default_factory=list, description="Supporting facts or product features"
    )


class CampaignBriefDeliverable(BaseModel):
    """Structured deliverable for [P2] Strategy & Brief Agent."""

    campaignTitle: str = Field(..., description="Approved campaign concept title")
    coreValueProposition: str = Field(
        ..., description="Central unified value proposition"
    )
    targetPersonas: list[TargetPersona] = Field(
        default_factory=list, description="Detailed target audience personas"
    )
    messagingPillars: list[MessagingPillar] = Field(
        default_factory=list, description="Strategic communication pillars"
    )
    toneAndVoice: list[str] = Field(
        default_factory=list, description="Brand voice adjectives and guidelines"
    )


# --- [P3] Creative Content Deliverable Models ---


class CreativeContentDeliverable(BaseModel):
    """Structured deliverable for [P3] Creative Content Agent."""

    visualConceptTitle: str = Field(..., description="Title of the visual concept")
    visualPromptUsed: str = Field(
        ..., description="High-detail prompt dispatched to Imagen 3"
    )
    assetUrl: str = Field(
        ..., description="GCS URI or accessible HTTP URL of generated marketing image"
    )
    headlineCopy: str = Field(..., description="Catchy primary headline")
    bodyCopy: str = Field(..., description="Supporting promotional body copy")
    callToAction: str = Field(
        ..., description="Target action prompt (e.g. Pre-order Now)"
    )
    aspectRatio: str = Field(default="16:9", description="Generated aspect ratio")
    generationTimestamp: datetime | None = Field(
        default_factory=lambda: datetime.now(UTC), description="Generation timestamp"
    )


# --- [P4] Performance & Insights Deliverable Models ---


class ChannelAllocation(BaseModel):
    """Budget allocation by media channel."""

    channel: str = Field(..., description="Channel name (e.g. Digital Video, Search)")
    allocationAmount: float = Field(
        ..., ge=0.0, description="Allocated amount in currency"
    )
    percentage: float = Field(
        ..., ge=0.0, le=100.0, description="Percentage of total budget"
    )
    rationale: str = Field(..., description="Strategic reasoning for this allocation")


class ProjectedKPIs(BaseModel):
    """Simulated forecast metrics."""

    estimatedImpressions: int = Field(
        ..., ge=0, description="Simulated total reach/impressions"
    )
    estimatedClicks: int = Field(
        ..., ge=0, description="Simulated click-through volume"
    )
    estimatedConversions: int = Field(
        ..., ge=0, description="Simulated target conversions"
    )
    projectedCtr: float = Field(
        ..., ge=0.0, description="Projected Click-Through Rate (%)"
    )


class PerformanceInsightsDeliverable(BaseModel):
    """Structured deliverable for [P4] Performance & Insights Agent."""

    totalBudget: float = Field(..., ge=0.0, description="Total campaign budget modeled")
    currency: str = Field(default="USD", description="Currency symbol/code")
    channelAllocations: list[ChannelAllocation] = Field(
        default_factory=list, description="Breakdown of budget across channels"
    )
    projectedKpis: ProjectedKPIs = Field(..., description="Simulated ROI metrics")
    expectedRoas: float = Field(
        ..., ge=0.0, description="Projected Return on Ad Spend (multiplier)"
    )
    recommendations: list[str] = Field(
        default_factory=list, description="Performance optimization suggestions"
    )
    creativeAssetUrl: str | None = Field(
        default=None,
        description="Visual asset evaluated for conversion and CTR impact",
    )
    visualConceptSummary: str | None = Field(
        default=None,
        description="Creative concept summary evaluated during performance modeling",
    )
