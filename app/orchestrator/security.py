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

"""Authentication and Model Armor security guardrail middleware."""

import logging
import re
from typing import Any

import google.auth
import httpx
from fastapi import Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.orchestrator.session_repo import (
    SessionRepository,
    UserModel,
    get_session_repo,
)
from app.settings import SecuritySettings, get_settings

logger = logging.getLogger(__name__)

# Heuristic prompt injection patterns for local/fallback Model Armor inspection
SUSPICIOUS_PROMPT_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?prior\s+prompts",
    r"reveal\s+(the\s+)?system\s+prompt",
    r"you\s+are\s+now\s+dan\b",
    r"bypass\s+all\s+safety",
]


class SecurityManager:
    """Manages Google OAuth OIDC and Model Armor prompt sanitization."""

    def __init__(self, settings: SecuritySettings | None = None) -> None:
        cfg = settings or get_settings()
        self.env = cfg.env
        self.oauth_client_id = cfg.google_oauth_client_id
        self.session_cookie_name = cfg.session_cookie_name
        self.model_armor_template = cfg.model_armor_template
        self._credentials = None

    def _get_auth_headers(self) -> dict[str, str]:
        """Obtain authorization headers via Application Default Credentials."""
        if self._credentials is None:
            self._credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        req = google_requests.Request()
        self._credentials.refresh(req)
        return {
            "Authorization": f"Bearer {self._credentials.token}",
            "Content-Type": "application/json",
        }

    async def _call_model_armor_api(self, text: str) -> None:
        """Calls Google Cloud Model Armor sanitizeUserPrompt API."""
        template = self.model_armor_template
        if not template:
            return

        parts = template.split("/")
        loc = parts[3] if len(parts) >= 4 and parts[2] == "locations" else ""
        endpoint = (
            f"https://modelarmor.{loc}.rep.googleapis.com/v1"
            if loc and loc != "global"
            else "https://modelarmor.googleapis.com/v1"
        )
        url = f"{endpoint}/{template}:sanitizeUserPrompt"
        payload = {"userPromptData": {"text": text}}
        headers = self._get_auth_headers()

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                body = resp.json()
                result = body.get("sanitizationResult", {})
                action_taken = (
                    result.get("actionTaken") or result.get("filterMatchState") or ""
                )
                if action_taken.upper() in (
                    "BLOCK",
                    "MATCH_FOUND",
                    "BLOCKED",
                ):
                    logger.warning("Model Armor blocked input prompt: %s", action_taken)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "Prompt blocked: Model Armor policy violation "
                            f"({action_taken})."
                        ),
                    )
        except httpx.HTTPStatusError as http_err:
            logger.error("Model Armor service error: %s", http_err)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Prompt blocked: Model Armor security service "
                    "inspection failed (fail-closed)."
                ),
            ) from http_err
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Model Armor request failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Prompt blocked: Model Armor security service "
                    "unavailable (fail-closed)."
                ),
            ) from exc

    def verify_google_credential(self, credential: str) -> dict[str, Any]:
        """Verify Google OIDC ID token and return user profile dict."""
        try:
            req = google_requests.Request()
            verify_kwargs: dict[str, Any] = {}
            if self.oauth_client_id:
                verify_kwargs["audience"] = self.oauth_client_id

            id_info = id_token.verify_oauth2_token(credential, req, **verify_kwargs)
            email = id_info.get("email")
            if not email:
                raise ValueError("Token missing verified email claim.")

            return {
                "sub": id_info.get("sub"),
                "email": email,
                "name": id_info.get("name") or email.split("@")[0],
                "picture": id_info.get("picture"),
            }
        except Exception as exc:
            logger.warning("Google ID token verification failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google OAuth ID token.",
            ) from exc

    async def inspect_prompt_safety(self, text: str) -> None:
        """Inspect prompt for prompt injection via local heuristics & Armor."""
        if not text:
            return

        # 1. Local heuristic pattern pre-check (always active, <1ms)
        lower_text = text.lower()
        for pattern in SUSPICIOUS_PROMPT_PATTERNS:
            if re.search(pattern, lower_text):
                logger.warning(
                    "Prompt rejected by Model Armor guardrails: matched %s",
                    pattern,
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Prompt blocked: Potential prompt injection detected "
                        "by Model Armor inspection."
                    ),
                )

        # 2. Remote Model Armor inspection (when template configured)
        if self.model_armor_template:
            await self._call_model_armor_api(text)


_security_manager = SecurityManager()


def get_security_manager() -> SecurityManager:
    """Dependency injection for security manager."""
    return _security_manager


async def get_current_user(
    request: Request,
    repo: SessionRepository = Depends(get_session_repo),
    security: SecurityManager = Depends(get_security_manager),
) -> UserModel:
    """Extract session token from cookie/header and return active user."""
    token = request.cookies.get(security.session_cookie_name)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ", 1)[1].strip()

    if token:
        user = await repo.get_user_by_session_token(token)
        if user:
            return user

    # Development / local testing mock user fallback if token provided
    if security.env != "production" and token:
        mock_sub = f"mock-sub-{token}"
        email = "dev-marketer@nova.com" if "dev" in token else f"{token}@nova.com"
        return await repo.create_or_update_google_user(
            google_sub=mock_sub,
            email=email,
            name="Dev Marketer",
            picture="https://lh3.googleusercontent.com/a/default-user",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=("Not authenticated. Valid session cookie or Bearer token required."),
    )
