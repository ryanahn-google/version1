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

"""Unit tests for centralized retry policy configuration."""

from app.retry_policy import get_default_http_retry_options


def test_default_http_retry_options_configuration():
    """Verify default HTTP retry options are properly configured with backoff and jitter."""
    opts = get_default_http_retry_options()
    assert opts.attempts == 3
    assert opts.initial_delay == 1.0
    assert opts.max_delay == 10.0
    assert opts.exp_base == 2.0
    assert opts.jitter == 1.0
    assert opts.http_status_codes == [408, 429, 500, 502, 503, 504]
