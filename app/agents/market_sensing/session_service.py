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

"""Session service factory for Agent Platform Agent Runtime subagents.

Initializes VertexAiSessionService if running on Agent Runtime (Reasoning Engine),
otherwise gracefully falls back to InMemorySessionService for local testing.
"""

from __future__ import annotations

import json
import logging
import os
import re

try:
    from app.settings import get_settings
except ImportError:
    from settings import get_settings

logger = logging.getLogger(__name__)


def get_agent_engine_id() -> str | None:
    """Resolves the Reasoning Engine ID from environment or metadata."""
    cfg = get_settings()
    if eid := cfg.google_cloud_agent_engine_id:
        return eid

    # Agent Engine injects APP_URL containing the reasoning engine resource path
    if app_url := cfg.app_url:
        m = re.search(r"reasoningEngines/(?P<id>\d+)", app_url)
        if m:
            return m.group("id")

    # Fallback to deployment_metadata.json if present
    meta_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "deployment_metadata.json"
    )
    if os.path.exists(meta_path):
        try:
            with open(meta_path, encoding="utf-8") as f:
                data = json.load(f)
            m = re.search(
                r"reasoningEngines/(?P<id>\d+)", data.get("remote_agent_runtime_id", "")
            )
            if m:
                return m.group("id")
        except Exception:
            pass

    return None


def get_subagent_session_service():
    """Returns VertexAiSessionService if engine ID is set, else InMemory."""
    cfg = get_settings()
    engine_id = get_agent_engine_id()
    project = cfg.google_cloud_project
    location = cfg.google_cloud_location or "asia-northeast3"
    if location == "global":
        location = "asia-northeast3"

    if engine_id and project:
        try:
            from google.adk.sessions.vertex_ai_session_service import (
                VertexAiSessionService,
            )

            logger.info(
                "Using VertexAiSessionService for engine %s in %s/%s",
                engine_id,
                project,
                location,
            )
            return VertexAiSessionService(
                project=project,
                location=location,
                agent_engine_id=engine_id,
            )
        except Exception as exc:
            logger.warning(
                "Could not initialize VertexAiSessionService (%s). Falling back to InMemorySessionService.",
                exc,
            )

    from google.adk.sessions.in_memory_session_service import InMemorySessionService

    return InMemorySessionService()
