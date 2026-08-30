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

"""SQLAlchemy ORM model for Orchestrator Campaign Sessions."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow
from app.schemas.campaign import CampaignStage, CampaignStatus


class CampaignSessionModel(Base):
    """SQLAlchemy model mapping orchestrator_sessions table."""

    __tablename__ = "orchestrator_sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tenant_id: Mapped[str] = mapped_column(
        String(64), default="default", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default=CampaignStatus.INITIALIZING.value, nullable=False
    )
    current_stage: Mapped[str] = mapped_column(
        String(32), default=CampaignStage.MARKET_SENSING.value, nullable=False
    )
    brand_name: Mapped[str] = mapped_column(String(128), nullable=False)
    product_name: Mapped[str] = mapped_column(String(128), nullable=False)
    campaign_objective: Mapped[str] = mapped_column(Text, nullable=False)
    budget_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(16), default="USD", nullable=False)
    channels: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    deliverables: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    revision_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )
