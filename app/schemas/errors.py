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

"""Standardized error envelope schemas."""

from typing import Any

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Unified API error envelope."""

    error: str = Field(..., description="Short error code identifier")
    message: str = Field(..., description="Human-readable error explanation")
    traceId: str = Field(..., description="Distributed tracing identifier")
    detail: dict[str, Any] | None = Field(
        default=None, description="Detailed diagnostic information"
    )
