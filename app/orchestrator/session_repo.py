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

import json
import secrets
import uuid
from datetime import UTC, timedelta
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.models import (
    Base,
    CampaignSessionModel,
    UserModel,
    UserSessionModel,
    utcnow,
)
from app.schemas.campaign import (
    CampaignDeliverables,
    CampaignSessionResponse,
    CampaignStage,
    CampaignStatus,
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
        engine_kwargs: dict[str, Any] = {"echo": False}
        if "sqlite" not in self.db_url:
            engine_kwargs.update(
                {
                    "pool_size": 5,
                    "max_overflow": 5,
                    "pool_timeout": 30.0,
                    "pool_recycle": 1800,
                    "pool_pre_ping": True,
                }
            )
        self.engine = create_async_engine(
            self.db_url,
            json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False),
            **engine_kwargs,
        )
        self.session_factory = async_sessionmaker(
            self.engine, expire_on_commit=False, class_=AsyncSession
        )
        self._initialized = False

    async def init_db(self) -> None:
        """Ensure database readiness. For SQLite, create tables if absent."""
        if not self._initialized:
            if "sqlite" in self.db_url:
                try:
                    async with self.engine.begin() as conn:
                        await conn.run_sync(Base.metadata.create_all)
                    self._initialized = True
                except Exception as exc:
                    import logging

                    logging.getLogger(__name__).warning(
                        "Database initialization delayed or failed: %s", exc
                    )
            else:
                self._initialized = True

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
        self,
        session_id: str | None = None,
        user_id: str | None = None,
        **kwargs: Any,
    ) -> CampaignSessionResponse | None:
        """Fetch an existing session by ID, optionally scoped to owner user."""
        target_id = session_id or kwargs.get("sessionId")
        if not target_id:
            return None
        await self.init_db()
        async with self.session_factory() as session:
            stmt = select(CampaignSessionModel).where(
                CampaignSessionModel.session_id == target_id
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


__all__ = [
    "Base",
    "CampaignSessionModel",
    "SessionRepository",
    "UserModel",
    "UserSessionModel",
    "get_session_repo",
    "utcnow",
]
