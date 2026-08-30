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

"""FastAPI Orchestrator backend for Marketing Value Creator (MVC)."""

import contextlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.orchestrator.session_repo import get_session_repo
from app.routers import (
    auth_router,
    campaigns_router,
    system_router,
    visuals_router,
)
from app.settings import get_settings

logger = logging.getLogger(__name__)

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "dist"


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager initializing database and ADK runner."""
    from app.agent import app as adk_app
    from app.agent import root_agent

    repo = get_session_repo()
    await repo.init_db()

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name

    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


def _create_app() -> FastAPI:
    """Initialize FastAPI app, passing docs_url=None and redoc_url=None in production."""
    settings = get_settings()
    if settings.is_production:
        _orig_init = FastAPI.__init__

        def _prod_init(self, *args, **kwargs):
            kwargs["docs_url"] = None
            kwargs["redoc_url"] = None
            return _orig_init(self, *args, **kwargs)

        FastAPI.__init__ = _prod_init
        try:
            return get_fast_api_app(
                agents_dir=str(BASE_DIR),
                web=False,
                allow_origins=["*"],
                artifact_service_uri=services.ARTIFACT_SERVICE_URI,
                session_service_uri=services.SESSION_SERVICE_URI,
                otel_to_cloud=settings.otel_to_cloud,
                lifespan=lifespan,
            )
        finally:
            FastAPI.__init__ = _orig_init

    return get_fast_api_app(
        agents_dir=str(BASE_DIR),
        web=False,
        allow_origins=["*"],
        artifact_service_uri=services.ARTIFACT_SERVICE_URI,
        session_service_uri=services.SESSION_SERVICE_URI,
        otel_to_cloud=settings.otel_to_cloud,
        lifespan=lifespan,
    )


app: FastAPI = _create_app()
app.title = "Marketing Value Creator (MVC) API"
app.description = (
    "Enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime"
)
app.version = "1.0.0"

# Register modular API routers
app.include_router(system_router)
app.include_router(auth_router)
app.include_router(campaigns_router)
app.include_router(visuals_router)

# Static files mount for compiled React SPA
if STATIC_DIR.is_dir():
    app.mount(
        "/static",
        StaticFiles(directory=str(STATIC_DIR), html=True),
        name="static",
    )

__all__ = [
    "app",
    "get_session_repo",
    "lifespan",
]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
