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

"""Pydantic v2 data models for Marketing Value Creator (MVC)."""

from app.schemas.campaign import (
    ApprovalAction,
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
    CreateCampaignRequest,
    StageApprovalRequest,
)
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
from app.schemas.errors import ErrorResponse

__all__ = [
    "ApprovalAction",
    "CampaignBriefDeliverable",
    "CampaignDeliverables",
    "CampaignSessionResponse",
    "CampaignStage",
    "CampaignStatus",
    "ChannelAllocation",
    "CompetitorAnalysis",
    "CreateCampaignRequest",
    "CreativeContentDeliverable",
    "ErrorResponse",
    "MarketSensingDeliverable",
    "MessagingPillar",
    "PerformanceInsightsDeliverable",
    "ProjectedKPIs",
    "SentimentOverview",
    "StageApprovalRequest",
    "TargetPersona",
]
