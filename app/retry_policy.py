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

"""Centralized HTTP retry policies and configurations for Agent Platform."""

from google.genai import types


def get_default_http_retry_options() -> types.HttpRetryOptions:
    """Returns standardized HttpRetryOptions with exponential backoff and jitter.

    Returns:
        HttpRetryOptions configured for 3 attempts, 1.0s initial delay,
        10.0s max delay, exponential base 2.0, full jitter (1.0), and retryable
        HTTP status codes (408, 429, 500, 502, 503, 504).
    """
    return types.HttpRetryOptions(
        attempts=3,
        initial_delay=1.0,
        max_delay=10.0,
        exp_base=2.0,
        jitter=1.0,
        http_status_codes=[408, 429, 500, 502, 503, 504],
    )
