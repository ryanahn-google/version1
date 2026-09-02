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

"""Composite LLM with automatic failover support for Agent Platform."""

import logging
from collections.abc import AsyncGenerator

from google.adk.models import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse

logger = logging.getLogger(__name__)


class FallbackGemini(BaseLlm):
    """Composite LLM that executes a primary model and fails over to secondary.

    Attributes:
        primary: Primary BaseLlm instance (e.g. Gemini 3.1 Pro Preview).
        fallback: Fallback BaseLlm instance (e.g. Gemini 2.5 Pro).
    """

    primary: BaseLlm
    fallback: BaseLlm

    def __init__(self, primary: BaseLlm, fallback: BaseLlm, **kwargs: object) -> None:
        """Initialize FallbackGemini with primary and secondary models.

        Args:
            primary: Primary LLM instance.
            fallback: Secondary fallback LLM instance.
            **kwargs: Extra model fields.
        """
        super().__init__(
            model=primary.model,
            primary=primary,
            fallback=fallback,
            **kwargs,
        )

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        """Generate content attempting primary first, then fallback on error.

        Args:
            llm_request: The LLM request to execute.
            stream: Whether to stream the response.

        Yields:
            LlmResponse chunks or final response.
        """
        try:
            async for resp in self.primary.generate_content_async(
                llm_request, stream=stream
            ):
                yield resp
        except Exception as exc:
            logger.warning(
                "Primary model '%s' execution failed: %s. Initiating fallback "
                "to secondary model '%s'...",
                self.primary.model,
                exc,
                self.fallback.model,
            )
            async for resp in self.fallback.generate_content_async(
                llm_request, stream=stream
            ):
                yield resp
