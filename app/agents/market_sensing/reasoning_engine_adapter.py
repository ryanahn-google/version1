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

"""Reasoning Engine HTTP contract adapter for Vertex AI Agent Runtime."""

import inspect
import json
from typing import Any

from fastapi import FastAPI, HTTPException, Request, encoders, responses

try:
    from .session_service import get_subagent_session_service
except ImportError:
    from session_service import get_subagent_session_service
from vertexai.agent_engines.templates.adk import AdkApp


def _no_op_instrumentor(project_id: str) -> None:
    return None


def attach_reasoning_engine_routes(app: FastAPI, adk_app: Any) -> None:
    """Register /api/reasoning_engine and /api/stream_reasoning_engine routes."""
    runtime: AdkApp | None = None
    streaming_methods: set[str] = set()
    sync_methods: set[str] = set()

    def get_runtime() -> AdkApp:
        nonlocal runtime, streaming_methods, sync_methods
        if runtime is None:
            runtime = AdkApp(
                app=adk_app,
                session_service_builder=get_subagent_session_service,
                artifact_service_builder=None,
                instrumentor_builder=_no_op_instrumentor,
            )
            runtime.set_up()
            operations = runtime.register_operations()
            streaming_methods = set(operations.get("stream", [])) | set(
                operations.get("async_stream", [])
            )
            sync_methods = set(operations.get("", [])) | set(
                operations.get("async", [])
            )
        return runtime

    def resolve_method(class_method: str, *, streaming: bool):
        rt = get_runtime()
        allowed = streaming_methods if streaming else sync_methods
        if class_method not in allowed:
            raise HTTPException(
                status_code=404,
                detail=f"Unsupported reasoning_engine method: {class_method!r}",
            )
        return getattr(rt, class_method)

    @app.post("/api/stream_reasoning_engine")
    async def stream_query(request: Request) -> responses.StreamingResponse:
        body = await request.json()
        method = resolve_method(body["class_method"], streaming=True)

        async def generator():
            async for event in method(**(body.get("input") or {})):
                yield json.dumps(event) + "\n"

        return responses.StreamingResponse(
            content=generator(), media_type="application/json"
        )

    @app.post("/api/reasoning_engine")
    async def query(request: Request) -> responses.JSONResponse:
        body = await request.json()
        method = resolve_method(body["class_method"], streaming=False)
        kwargs = body.get("input") or {}
        output = (
            await method(**kwargs)
            if inspect.iscoroutinefunction(method)
            else method(**kwargs)
        )
        return responses.JSONResponse(
            content=encoders.jsonable_encoder({"output": output})
        )

    @app.get("/api/reasoning_engine")
    async def get_reasoning_engine():
        get_runtime()
        return {
            "status": "healthy",
            "app_name": adk_app.name,
            "sync_methods": list(sync_methods),
            "streaming_methods": list(streaming_methods),
        }
