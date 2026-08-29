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

"""In-memory draft image store for Marketing Value Creator (MVC).

Holds draft marketing visuals in memory prior to Human-in-the-Loop (HITL) approval.
Upon approval, commits the draft image to Google Cloud Storage (GCS).
Upon revision, purges the draft image from memory so a fresh asset can be generated.
"""

from __future__ import annotations

import logging
import threading
import uuid

logger = logging.getLogger(__name__)


def normalize_session_id(session_id: str) -> str:
    """Normalize session identifiers by stripping stage suffixes."""
    clean_id = session_id or "default"
    for suffix in (
        "-p3-rev",
        "-p3",
        "-p2-rev",
        "-p2",
        "-p1-rev",
        "-p1",
        "-p4-rev",
        "-p4",
    ):
        if clean_id.endswith(suffix):
            clean_id = clean_id[: -len(suffix)]
    return clean_id


class DraftImageStore:
    """Thread-safe in-memory store for uncommitted campaign draft marketing visuals."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[bytes, str]] = {}
        self._lock = threading.Lock()

    def save_draft(
        self,
        session_id: str,
        image_bytes: bytes,
        mime_type: str = "image/png",
    ) -> str:
        """Store image bytes in memory and return the draft endpoint URL."""
        clean_id = normalize_session_id(session_id)
        with self._lock:
            self._cache[clean_id] = (image_bytes, mime_type)
        version_tag = uuid.uuid4().hex[:6]
        draft_url = f"/api/v1/campaigns/{clean_id}/draft-image?v={version_tag}"
        logger.info(
            "Stored draft image in memory for session '%s' (%d bytes). Draft URL: %s",
            clean_id,
            len(image_bytes),
            draft_url,
        )
        return draft_url

    def get_draft(self, session_id: str) -> tuple[bytes, str] | None:
        """Retrieve draft image bytes and mime type from memory."""
        clean_id = normalize_session_id(session_id)
        with self._lock:
            return self._cache.get(clean_id)

    def delete_draft(self, session_id: str) -> bool:
        """Purge draft image from memory (e.g. on revision or session abort)."""
        clean_id = normalize_session_id(session_id)
        with self._lock:
            existed = self._cache.pop(clean_id, None) is not None
        if existed:
            logger.info("Purged draft image from memory for session '%s'.", clean_id)
        return existed

    def has_draft(self, session_id: str) -> bool:
        """Check whether a draft image is currently cached in memory."""
        clean_id = normalize_session_id(session_id)
        with self._lock:
            return clean_id in self._cache

    def commit_draft_to_gcs(self, session_id: str) -> str | None:
        """Commit draft image from memory to GCS upon HITL approval.

        Returns the permanent public HTTPS GCS URL, or None if no draft existed.
        """
        clean_id = normalize_session_id(session_id)
        with self._lock:
            draft = self._cache.pop(clean_id, None)

        if not draft:
            logger.warning(
                "No draft image found in memory to commit for session '%s'.", clean_id
            )
            return None

        image_bytes, _ = draft
        try:
            from app.agents.creative_content.storage_service import (
                save_visual_marketing_asset,
            )
        except ImportError:
            try:
                from storage_service import (  # type: ignore[no-redef]
                    save_visual_marketing_asset,
                )
            except ImportError:
                from .storage_service import (  # type: ignore[no-redef]
                    save_visual_marketing_asset,
                )

        gcs_url = save_visual_marketing_asset(image_bytes, session_id=clean_id)
        logger.info(
            "Successfully committed draft image to GCS for session '%s': %s",
            clean_id,
            gcs_url,
        )
        return gcs_url


_GLOBAL_DRAFT_STORE = DraftImageStore()


def get_draft_image_store() -> DraftImageStore:
    """Return the global DraftImageStore singleton."""
    return _GLOBAL_DRAFT_STORE
