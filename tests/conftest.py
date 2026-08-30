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

"""Pytest global configuration ensuring tests run with deterministic test environment."""

import os

os.environ["INTEGRATION_TEST"] = "TRUE"

# Migrate legacy GOOGLE_GENAI_USE_VERTEXAI to GOOGLE_GENAI_USE_ENTERPRISE to eliminate SDK deprecation warning
if os.environ.get("GOOGLE_GENAI_USE_VERTEXAI"):
    os.environ["GOOGLE_GENAI_USE_ENTERPRISE"] = os.environ.pop(
        "GOOGLE_GENAI_USE_VERTEXAI"
    )
elif "GOOGLE_GENAI_USE_ENTERPRISE" not in os.environ:
    os.environ["GOOGLE_GENAI_USE_ENTERPRISE"] = "true"

from collections.abc import Iterator

import pytest

try:
    from app.settings import get_settings

    get_settings.cache_clear()
except ImportError:
    pass


@pytest.fixture(autouse=True)
def _reset_settings_cache() -> Iterator[None]:
    """Reset get_settings LRU cache before and after each test for test isolation."""
    try:
        from app.settings import get_settings

        get_settings.cache_clear()
    except ImportError:
        pass
    yield
    try:
        from app.settings import get_settings

        get_settings.cache_clear()
    except ImportError:
        pass
