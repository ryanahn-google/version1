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

"""SQLAlchemy-based hybrid session repository for Campaign state management."""

import os
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.schemas.campaign import (
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
)

Base = declarative_base()


def utcnow():
    return datetime.now(UTC)


class CampaignSessionModel(Base):
    """SQLAlchemy model mapping orchestrator_sessions table."""

    __tablename__ = "orchestrator_sessions"

    session_id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), default="default", nullable=False)
    status = Column(
        String(32), default=CampaignStatus.INITIALIZING.value, nullable=False
    )
    current_stage = Column(
        String(32), default=CampaignStage.MARKET_SENSING.value, nullable=False
    )
    brand_name = Column(String(128), nullable=False)
    product_name = Column(String(128), nullable=False)
    campaign_objective = Column(Text, nullable=False)
    budget_amount = Column(Float, nullable=False)
    currency = Column(String(16), default="USD", nullable=False)
    channels = Column(JSON, default=list, nullable=False)
    deliverables = Column(JSON, default=dict, nullable=False)
    revision_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


def _get_database_url() -> str:
    """Build database connection URL: Cloud SQL PostgreSQL if configured, else SQLite."""
    if db_url := os.environ.get("DATABASE_URL"):
        return db_url

    instance_connection_name = os.environ.get("INSTANCE_CONNECTION_NAME")
    db_pass = os.environ.get("DB_PASS")
    if instance_connection_name and db_pass:
        db_user = os.environ.get("DB_USER", "postgres")
        db_name = os.environ.get("DB_NAME", "postgres")
        encoded_user = quote(db_user, safe="")
        encoded_pass = quote(db_pass, safe="")
        encoded_instance = instance_connection_name.replace(":", "%3A")
        return (
            f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
            f"/{db_name}?host=/cloudsql/{encoded_instance}"
        )

    # Local development SQLite
    db_path = os.environ.get("LOCAL_DB_PATH", "campaign_sessions.db")
    return f"sqlite+aiosqlite:///{db_path}"


class SessionRepository:
    """Async repository for managing campaign sessions with hybrid persistence."""

    def __init__(self, db_url: str | None = None) -> None:
        self.db_url = db_url or _get_database_url()
        self.engine = create_async_engine(self.db_url, echo=False)
        self.session_factory = async_sessionmaker(
            self.engine, expire_on_commit=False, class_=AsyncSession
        )
        self._initialized = False

    async def init_db(self) -> None:
        """Create tables if they do not exist."""
        if not self._initialized:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            self._initialized = True

    async def create_session(
        self,
        session_id: str,
        brand_name: str,
        product_name: str,
        campaign_objective: str,
        budget_amount: float,
        currency: str = "USD",
        channels: list[str] | None = None,
        tenant_id: str = "default",
    ) -> CampaignSessionResponse:
        """Create and persist a new campaign session."""
        await self.init_db()
        now = utcnow()
        model = CampaignSessionModel(
            session_id=session_id,
            tenant_id=tenant_id,
            status=CampaignStatus.INITIALIZING.value,
            current_stage=CampaignStage.MARKET_SENSING.value,
            brand_name=brand_name,
            product_name=product_name,
            campaign_objective=campaign_objective,
            budget_amount=budget_amount,
            currency=currency,
            channels=channels or [],
            deliverables={},
            revision_count=0,
            created_at=now,
            updated_at=now,
        )
        async with self.session_factory() as session:
            session.add(model)
            await session.commit()
            await session.refresh(model)
        return self._to_schema(model)

    async def get_session(self, session_id: str) -> CampaignSessionResponse | None:
        """Fetch an existing session by ID."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(CampaignSessionModel).where(
                CampaignSessionModel.session_id == session_id
            )
            result = await session.execute(stmt)
            model = result.scalar_one_or_none()
            if not model:
                return None
            return self._to_schema(model)

    async def update_session(
        self,
        session_id: str,
        status: CampaignStatus | None = None,
        current_stage: CampaignStage | None = None,
        deliverables: dict[str, Any] | None = None,
        increment_revision: bool = False,
    ) -> CampaignSessionResponse | None:
        """Update session status, current stage, and deliverables."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(CampaignSessionModel).where(
                CampaignSessionModel.session_id == session_id
            )
            result = await session.execute(stmt)
            model = result.scalar_one_or_none()
            if not model:
                return None

            if status:
                model.status = status.value
            if current_stage:
                model.current_stage = current_stage.value
            if deliverables is not None:
                updated_deliv = dict(model.deliverables or {})
                updated_deliv.update(deliverables)
                model.deliverables = updated_deliv
            if increment_revision:
                model.revision_count += 1
            model.updated_at = utcnow()

            await session.commit()
            await session.refresh(model)
            return self._to_schema(model)

    def _to_schema(self, model: CampaignSessionModel) -> CampaignSessionResponse:
        """Convert database model to Pydantic schema."""
        deliv_dict = model.deliverables or {}
        return CampaignSessionResponse(
            sessionId=model.session_id,
            tenantId=model.tenant_id,
            status=CampaignStatus(model.status),
            currentStage=CampaignStage(model.current_stage),
            brandName=model.brand_name,
            productName=model.product_name,
            campaignObjective=model.campaign_objective,
            budgetAmount=model.budget_amount,
            currency=model.currency,
            channels=model.channels or [],
            deliverables=CampaignDeliverables(
                marketSensing=deliv_dict.get("marketSensing"),
                campaignBrief=deliv_dict.get("campaignBrief"),
                creativeContent=deliv_dict.get("creativeContent"),
                performanceInsights=deliv_dict.get("performanceInsights"),
            ),
            revisionCount=model.revision_count,
            createdAt=model.created_at,
            updatedAt=model.updated_at,
        )


_global_repo: SessionRepository | None = None


def get_session_repo() -> SessionRepository:
    """Singleton getter for session repository."""
    global _global_repo
    if _global_repo is None:
        _global_repo = SessionRepository()
    return _global_repo
