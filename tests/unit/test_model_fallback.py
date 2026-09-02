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

"""Unit tests for FallbackGemini composite LLM."""

from collections.abc import AsyncGenerator

import pytest
from google.adk.models import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

from app.models_fallback import FallbackGemini


class _MockTestLlm(BaseLlm):
    """Mock LLM for testing fallback transitions."""

    should_fail: bool = False
    fail_exception: Exception | None = None

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        if self.should_fail:
            raise (self.fail_exception or RuntimeError(f"{self.model} failed"))
        content = types.Content(
            role="model",
            parts=[types.Part.from_text(text=f"Response from {self.model}")],
        )
        yield LlmResponse(content=content, partial=False)


@pytest.mark.asyncio
async def test_fallback_gemini_primary_success():
    """Verify that FallbackGemini returns primary model response when primary succeeds."""
    primary = _MockTestLlm(model="gemini-3.1-pro-preview", should_fail=False)
    fallback = _MockTestLlm(model="gemini-2.5-pro", should_fail=False)

    composite = FallbackGemini(primary=primary, fallback=fallback)
    assert composite.model == "gemini-3.1-pro-preview"

    req = LlmRequest(
        contents=[
            types.Content(role="user", parts=[types.Part.from_text(text="Hello")])
        ]
    )
    responses = [resp async for resp in composite.generate_content_async(req)]

    assert len(responses) == 1
    assert responses[0].content.parts[0].text == "Response from gemini-3.1-pro-preview"


@pytest.mark.asyncio
async def test_fallback_gemini_fails_over_to_secondary():
    """Verify that FallbackGemini falls over to secondary model when primary fails."""
    primary = _MockTestLlm(
        model="gemini-3.1-pro-preview",
        should_fail=True,
        fail_exception=ConnectionError("503 Service Unavailable"),
    )
    fallback = _MockTestLlm(model="gemini-2.5-pro", should_fail=False)

    composite = FallbackGemini(primary=primary, fallback=fallback)

    req = LlmRequest(
        contents=[
            types.Content(role="user", parts=[types.Part.from_text(text="Hello")])
        ]
    )
    responses = [resp async for resp in composite.generate_content_async(req)]

    assert len(responses) == 1
    assert responses[0].content.parts[0].text == "Response from gemini-2.5-pro"


@pytest.mark.asyncio
async def test_fallback_gemini_raises_when_both_fail():
    """Verify that FallbackGemini raises exception if both primary and fallback fail."""
    primary = _MockTestLlm(model="gemini-3.1-pro-preview", should_fail=True)
    fallback = _MockTestLlm(
        model="gemini-2.5-pro",
        should_fail=True,
        fail_exception=RuntimeError("Secondary also unavailable"),
    )

    composite = FallbackGemini(primary=primary, fallback=fallback)

    req = LlmRequest(
        contents=[
            types.Content(role="user", parts=[types.Part.from_text(text="Hello")])
        ]
    )
    with pytest.raises(RuntimeError, match="Secondary also unavailable"):
        _ = [resp async for resp in composite.generate_content_async(req)]
