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

"""Pydantic v2 schemas for authentication, users, and session management."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class GoogleAuthRequest(BaseModel):
    """Payload containing Google OIDC credential (ID token)."""

    credential: str = Field(
        ...,
        description="Google OAuth 2.0 OIDC ID Token issued by Google Identity Services.",
        json_schema_extra={"example": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."},
    )


class DevLoginRequest(BaseModel):
    """Payload for local development mock login."""

    email: str = Field(
        default="dev-marketer@gmail.com",
        description="Mock user email for local dev testing.",
    )
    name: str = Field(
        default="Dev Marketer",
        description="Mock user display name.",
    )


class UserProfileResponse(BaseModel):
    """Authenticated user profile representation."""

    userId: str = Field(..., description="Unique user identifier (UUID v4)")
    email: str = Field(..., description="User's verified email address")
    name: str = Field(..., description="User's display name")
    picture: str | None = Field(
        default=None, description="URL of user's profile avatar"
    )
    role: str = Field(default="MARKETER", description="User role in the system")
    tenantId: str = Field(
        default="default", description="Tenant identifier for multi-tenancy"
    )
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="User account creation timestamp",
    )


class AuthStatusResponse(BaseModel):
    """Authentication status check response."""

    authenticated: bool = Field(..., description="Whether client has a valid session")
    user: UserProfileResponse | None = Field(
        default=None, description="Current user profile if authenticated"
    )


class LogoutResponse(BaseModel):
    """Logout confirmation response."""

    status: str = Field(default="logged_out")
