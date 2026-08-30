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

"""API Routers package for Marketing Value Creator (MVC)."""

from app.routers.auth import router as auth_router
from app.routers.campaigns import router as campaigns_router
from app.routers.system import router as system_router
from app.routers.visuals import router as visuals_router

__all__ = [
    "auth_router",
    "campaigns_router",
    "system_router",
    "visuals_router",
]
