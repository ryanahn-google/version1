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

"""Unit tests for SessionRepository transient error retry decorator."""

import pytest
from sqlalchemy.exc import OperationalError

from app.orchestrator.session_repo import db_retry


@pytest.mark.asyncio
async def test_db_retry_succeeds_after_transient_error():
    """Verify that db_retry retries on OperationalError and succeeds on second attempt."""
    call_count = 0

    @db_retry(max_attempts=3, initial_delay=0.01, jitter=0.01)
    async def flaky_db_query():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise OperationalError(
                "SSL connection has been closed unexpectedly", {}, None
            )
        return "query_success"

    result = await flaky_db_query()
    assert result == "query_success"
    assert call_count == 2


@pytest.mark.asyncio
async def test_db_retry_exhaustion_raises():
    """Verify that db_retry re-raises OperationalError when max_attempts is reached."""
    call_count = 0

    @db_retry(max_attempts=3, initial_delay=0.01, jitter=0.01)
    async def failing_db_query():
        nonlocal call_count
        call_count += 1
        raise OperationalError("Cloud SQL connection timed out", {}, None)

    with pytest.raises(OperationalError, match="Cloud SQL connection timed out"):
        await failing_db_query()

    assert call_count == 3


@pytest.mark.asyncio
async def test_db_retry_non_retryable_exception_raises_immediately():
    """Verify that non-transient exceptions (e.g. ValueError) are not retried."""
    call_count = 0

    @db_retry(max_attempts=3, initial_delay=0.01, jitter=0.01)
    async def invalid_query():
        nonlocal call_count
        call_count += 1
        raise ValueError("Invalid query parameter format")

    with pytest.raises(ValueError, match="Invalid query parameter format"):
        await invalid_query()

    assert call_count == 1
