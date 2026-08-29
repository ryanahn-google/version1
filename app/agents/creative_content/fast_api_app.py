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

"""FastAPI A2A application for creative_content sub-agent."""

import contextlib
import os
from collections.abc import AsyncIterator

from a2a.server.tasks import InMemoryTaskStore
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

try:
    from .a2a_utils import attach_a2a_routes
    from .agent import app as adk_app
    from .agent import creative_content_agent as sub_agent
except ImportError:
    from a2a_utils import attach_a2a_routes
    from agent import app as adk_app
    from agent import creative_content_agent as sub_agent

try:
    from .session_service import get_subagent_session_service
except ImportError:
    from session_service import get_subagent_session_service

try:
    from .reasoning_engine_adapter import attach_reasoning_engine_routes
except ImportError:
    from reasoning_engine_adapter import attach_reasoning_engine_routes

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager initializing A2A runner and endpoints."""
    session_service = get_subagent_session_service()

    runner = Runner(
        app=adk_app,
        session_service=session_service,
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name

    await attach_a2a_routes(
        app,
        agent=sub_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=False,
    otel_to_cloud=False,
    lifespan=lifespan,
)


@app.get("/healthz", tags=["System"])
async def health_check():
    """Liveness health check endpoint."""
    return {"status": "healthy", "agent": adk_app.name}


attach_reasoning_engine_routes(app, adk_app=adk_app)
