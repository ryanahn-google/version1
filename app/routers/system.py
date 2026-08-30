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

"""System, health check, and frontend entrypoint routes."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Response
from fastapi.responses import FileResponse

from app.settings import get_settings

router = APIRouter(tags=["System"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "dist"
INDEX_HTML = STATIC_DIR / "index.html"


@router.get("/healthz", tags=["System"])
async def health_check() -> dict[str, str]:
    """Liveness check endpoint."""
    return {
        "status": "healthy",
        "service": "mvc-orchestrator",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/meta", tags=["System"])
async def get_metadata() -> dict[str, Any]:
    """Service metadata and foundation model configuration."""
    settings = get_settings()
    return {
        "name": "Marketing Value Creator (MVC)",
        "version": "1.0.0",
        "region": "asia-northeast3",
        "models": {
            "orchestrator": "gemini-3.1-pro",
            "sub_agents": "gemini-3.5-flash-lite",
            "creative_image": "gemini-3.1-flash-lite-image",
        },
        "auth": {
            "googleClientId": settings.google_oauth_client_id,
        },
    }


@router.get("/mvc", include_in_schema=False)
async def serve_mvc() -> Response:
    """Serve compiled React SPA at /mvc entrypoint."""
    if INDEX_HTML.is_file():
        return FileResponse(str(INDEX_HTML))
    return Response(
        content=(
            '{"status": "healthy", "service": "mvc-orchestrator", '
            '"detail": "Frontend bundle not compiled."}'
        ),
        media_type="application/json",
    )
