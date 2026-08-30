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

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    desc,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.schemas.campaign import (
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy declarative models."""


def utcnow() -> datetime:
    """Return timezone-naive UTC datetime."""
    return datetime.now(UTC).replace(tzinfo=None)


class UserModel(Base):
    """SQLAlchemy model mapping users table."""

    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    google_sub: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    picture: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="MARKETER", nullable=False)
    tenant_id: Mapped[str] = mapped_column(
        String(64), default="default", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False
    )


class UserSessionModel(Base):
    """SQLAlchemy model mapping user_sessions table for cookie auth."""

    __tablename__ = "user_sessions"

    session_token: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(256), nullable=True)


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


def _get_database_url() -> str:
    """Build database connection URL: Cloud SQL PostgreSQL if configured, else SQLite."""
    from app.app_utils.services import get_database_url
    from app.settings import get_settings

    if url := get_database_url():
        return url

    return get_settings().get_sqlite_url()


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
            try:
                async with self.engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                self._initialized = True
            except Exception as exc:
                import logging

                logging.getLogger(__name__).warning(
                    "Database initialization delayed or failed: %s", exc
                )

    async def create_or_update_google_user(
        self,
        google_sub: str,
        email: str,
        name: str,
        picture: str | None = None,
        tenant_id: str = "default",
    ) -> UserModel:
        """Create or update user authenticated via Google OAuth2."""
        clean_sub = (google_sub or "")[:128]
        clean_email = (email or "")[:255]
        clean_name = (name or "")[:128]
        await self.init_db()
        now = utcnow()
        async with self.session_factory() as session:
            stmt = select(UserModel).where(
                (UserModel.google_sub == clean_sub) | (UserModel.email == clean_email)
            )
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                user.google_sub = clean_sub
                user.name = clean_name
                if picture:
                    user.picture = picture
                user.last_login_at = now
                user.updated_at = now
            else:
                user = UserModel(
                    user_id=str(uuid.uuid4()),
                    google_sub=clean_sub,
                    email=clean_email,
                    name=clean_name,
                    picture=picture,
                    role="MARKETER",
                    tenant_id=tenant_id,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                    last_login_at=now,
                )
                session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    async def create_auth_session(
        self,
        user_id: str,
        expires_days: int = 7,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> str:
        """Generate and persist a secure session token in Cloud SQL."""
        await self.init_db()
        token = secrets.token_urlsafe(64)
        now = utcnow()
        user_session = UserSessionModel(
            session_token=token,
            user_id=user_id,
            expires_at=now + timedelta(days=expires_days),
            created_at=now,
            last_accessed_at=now,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        async with self.session_factory() as session:
            session.add(user_session)
            await session.commit()
        return token

    async def get_user_by_session_token(self, token: str) -> UserModel | None:
        """Validate session token, apply sliding-window refresh, and return user."""
        if not token or len(token) > 128:
            return None
        await self.init_db()
        now = utcnow()
        async with self.session_factory() as session:
            stmt = (
                select(UserSessionModel, UserModel)
                .join(UserModel, UserSessionModel.user_id == UserModel.user_id)
                .where(
                    UserSessionModel.session_token == token,
                    UserSessionModel.expires_at > now,
                    UserModel.is_active.is_(True),
                )
            )
            result = await session.execute(stmt)
            row = result.first()
            if not row:
                return None

            user_session, user = row
            # Sliding window: extend expiration and update last accessed time
            user_session.last_accessed_at = now
            user_session.expires_at = now + timedelta(days=7)
            await session.commit()
            return user

    async def delete_auth_session(self, token: str) -> None:
        """Invalidate single session token on logout."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(UserSessionModel).where(
                UserSessionModel.session_token == token
            )
            result = await session.execute(stmt)
            if user_session := result.scalar_one_or_none():
                await session.delete(user_session)
                await session.commit()

    async def list_user_campaigns(
        self, user_id: str, limit: int = 20
    ) -> list[CampaignSessionResponse]:
        """Fetch list of recent campaigns owned by specific user."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = (
                select(CampaignSessionModel)
                .where(
                    (CampaignSessionModel.user_id == user_id)
                    | (CampaignSessionModel.user_id.is_(None))
                )
                .order_by(desc(CampaignSessionModel.created_at))
                .limit(limit)
            )
            result = await session.execute(stmt)
            return [self._to_schema(m) for m in result.scalars().all()]

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
        user_id: str | None = None,
    ) -> CampaignSessionResponse:
        """Create and persist a new campaign session."""
        await self.init_db()
        now = utcnow()
        model = CampaignSessionModel(
            session_id=session_id,
            user_id=user_id,
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

    async def get_session(
        self, session_id: str, user_id: str | None = None
    ) -> CampaignSessionResponse | None:
        """Fetch an existing session by ID, optionally scoped to owner user."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(CampaignSessionModel).where(
                CampaignSessionModel.session_id == session_id
            )
            if user_id:
                stmt = stmt.where(
                    (CampaignSessionModel.user_id == user_id)
                    | (CampaignSessionModel.user_id.is_(None))
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
        user_id: str | None = None,
        budget_amount: float | None = None,
        currency: str | None = None,
    ) -> CampaignSessionResponse | None:
        """Update session status, current stage, deliverables, budget, and currency."""
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(CampaignSessionModel).where(
                CampaignSessionModel.session_id == session_id
            )
            if user_id:
                stmt = stmt.where(
                    (CampaignSessionModel.user_id == user_id)
                    | (CampaignSessionModel.user_id.is_(None))
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
            if budget_amount is not None:
                model.budget_amount = budget_amount
            if currency is not None:
                model.currency = currency
            if increment_revision:
                model.revision_count += 1
            model.updated_at = utcnow()

            await session.commit()
            await session.refresh(model)
            return self._to_schema(model)

    def _to_schema(self, model: CampaignSessionModel) -> CampaignSessionResponse:
        """Convert database model to Pydantic schema."""
        deliv_dict = model.deliverables or {}
        created_at = model.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        updated_at = model.updated_at
        if updated_at and updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=UTC)

        return CampaignSessionResponse(
            sessionId=model.session_id,
            userId=model.user_id,
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
            createdAt=created_at,
            updatedAt=updated_at,
        )


_global_repo: SessionRepository | None = None


def get_session_repo() -> SessionRepository:
    """Singleton getter for session repository."""
    global _global_repo
    if _global_repo is None:
        _global_repo = SessionRepository()
    return _global_repo
