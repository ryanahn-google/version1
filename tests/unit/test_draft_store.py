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

"""Unit tests for in-memory draft image store."""

from unittest.mock import patch

from app.orchestrator.draft_store import DraftImageStore, normalize_session_id


def test_normalize_session_id():
    """Verify session suffixes like -p3 and -p3-rev are cleanly stripped."""
    assert normalize_session_id("sess123") == "sess123"
    assert normalize_session_id("sess123-p3") == "sess123"
    assert normalize_session_id("sess123-p3-rev") == "sess123"
    assert normalize_session_id("sess123-p2") == "sess123"
    assert normalize_session_id("") == "default"


def test_draft_store_lifecycle():
    """Verify save, get, and delete operations in memory."""
    store = DraftImageStore()
    session_id = "test-session-001"
    fake_png = b"\x89PNG\r\n\x1a\nfake_image_data"

    # 1. Save draft
    url = store.save_draft(session_id, fake_png, mime_type="image/png")
    assert f"/api/v1/campaigns/{session_id}/draft-image?v=" in url
    assert store.has_draft(session_id)
    assert store.has_draft(f"{session_id}-p3")

    # 2. Get draft
    retrieved = store.get_draft(session_id)
    assert retrieved is not None
    bytes_out, mime_out = retrieved
    assert bytes_out == fake_png
    assert mime_out == "image/png"

    # Also retrievable via suffixed session_id
    retrieved_suffixed = store.get_draft(f"{session_id}-p3-rev")
    assert retrieved_suffixed == (fake_png, "image/png")

    # 3. Delete draft (simulating revise)
    assert store.delete_draft(session_id) is True
    assert store.has_draft(session_id) is False
    assert store.get_draft(session_id) is None
    assert store.delete_draft(session_id) is False


def test_draft_store_commit_to_gcs():
    """Verify committing draft uploads to GCS and clears memory."""
    store = DraftImageStore()
    session_id = "test-session-002"
    fake_png = b"committed_image_data"
    expected_gcs_url = (
        "https://storage.googleapis.com/bucket/campaigns/test-session-002/creative.png"
    )

    store.save_draft(f"{session_id}-p3", fake_png)
    assert store.has_draft(session_id)

    with patch(
        "app.agents.creative_content.storage_service.save_visual_marketing_asset",
        return_value=expected_gcs_url,
    ) as mock_save:
        gcs_url = store.commit_draft_to_gcs(session_id)

    assert gcs_url == expected_gcs_url
    mock_save.assert_called_once_with(fake_png, session_id=session_id, user_id=None)
    # Draft should be cleared from memory after commit
    assert store.has_draft(session_id) is False
    assert store.get_draft(session_id) is None


def test_draft_store_commit_empty():
    """Verify commit returns None when no draft image exists in memory."""
    store = DraftImageStore()
    assert store.commit_draft_to_gcs("non-existent-session") is None
