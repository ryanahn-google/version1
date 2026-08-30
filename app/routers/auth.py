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

"""Authentication and user session management routes."""

from datetime import UTC

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)

from app.orchestrator.security import (
    SecurityManager,
    get_current_user,
    get_security_manager,
)
from app.orchestrator.session_repo import (
    SessionRepository,
    UserModel,
    get_session_repo,
)
from app.schemas.auth import (
    DevLoginRequest,
    GoogleAuthRequest,
    LogoutResponse,
    UserProfileResponse,
)
from app.schemas.errors import ErrorResponse
from app.settings import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/google",
    response_model=UserProfileResponse,
    responses={401: {"model": ErrorResponse}},
)
async def login_with_google(
    payload: GoogleAuthRequest,
    response: Response,
    request: Request,
    security: SecurityManager = Depends(get_security_manager),
    repo: SessionRepository = Depends(get_session_repo),
) -> UserProfileResponse:
    """Verify Google OIDC ID token, auto-register/login user, and issue session cookie."""
    settings = get_settings()
    profile = security.verify_google_credential(payload.credential)
    user = await repo.create_or_update_google_user(
        google_sub=profile["sub"],
        email=profile["email"],
        name=profile["name"],
        picture=profile.get("picture"),
    )
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    token = await repo.create_auth_session(
        user_id=user.user_id,
        expires_days=settings.session_expire_days,
        ip_address=ip,
        user_agent=ua,
    )

    is_secure = settings.env == "production"
    response.set_cookie(
        key=security.session_cookie_name,
        value=token,
        max_age=settings.session_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@router.post(
    "/dev-login",
    response_model=UserProfileResponse,
    responses={403: {"model": ErrorResponse}},
)
async def dev_login(
    response: Response,
    request: Request,
    payload: DevLoginRequest | None = None,
    security: SecurityManager = Depends(get_security_manager),
    repo: SessionRepository = Depends(get_session_repo),
) -> UserProfileResponse:
    """Local development mock login establishing valid session cookie."""
    settings = get_settings()
    if settings.env.lower() in ("staging", "production", "prod"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Developer quick login is disabled in staging and production"
                " environments."
            ),
        )
    email = (payload and payload.email) or "dev-marketer@gmail.com"
    name = (payload and payload.name) or "Dev Marketer"
    user = await repo.create_or_update_google_user(
        google_sub=f"mock-sub-{email}",
        email=email,
        name=name,
        picture="https://lh3.googleusercontent.com/a/default-user",
    )
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    token = await repo.create_auth_session(
        user_id=user.user_id,
        expires_days=settings.session_expire_days,
        ip_address=ip,
        user_agent=ua,
    )

    is_secure = settings.env == "production"
    response.set_cookie(
        key=security.session_cookie_name,
        value=token,
        max_age=settings.session_expire_days * 86400,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    responses={401: {"model": ErrorResponse}},
)
async def get_current_user_profile(
    user: UserModel = Depends(get_current_user),
) -> UserProfileResponse:
    """Return currently authenticated user profile."""
    created_at = (
        user.created_at.replace(tzinfo=UTC)
        if user.created_at.tzinfo is None
        else user.created_at
    )
    return UserProfileResponse(
        userId=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        tenantId=user.tenant_id,
        createdAt=created_at,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
)
async def logout(
    request: Request,
    response: Response,
    repo: SessionRepository = Depends(get_session_repo),
    security: SecurityManager = Depends(get_security_manager),
) -> LogoutResponse:
    """Invalidate current session token in Cloud SQL and clear browser cookie."""
    token = request.cookies.get(security.session_cookie_name)
    if token:
        await repo.delete_auth_session(token)
    response.delete_cookie(key=security.session_cookie_name, path="/")
    return LogoutResponse(status="logged_out")
