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

"""Sub-agent settings configuration using Pydantic BaseSettings."""

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SubAgentSettings(BaseSettings):
    """Sub-agent configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_url: str = Field(
        default="http://0.0.0.0:8000",
        validation_alias=AliasChoices("APP_URL", "app_url"),
        description="Base URL for the sub-agent endpoint.",
    )
    agent_version: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("AGENT_VERSION", "agent_version"),
        description="Semantic version of the sub-agent.",
    )
    env: str = Field(
        default="development",
        validation_alias=AliasChoices("ENV", "env"),
        description="Deployment environment (development, staging, prod).",
    )
    integration_test: bool = Field(
        default=False,
        validation_alias=AliasChoices("INTEGRATION_TEST", "integration_test"),
        description="Whether running in integration test mode.",
    )
    user_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("USER_ID", "user_id"),
        description="Default or fallback user ID.",
    )
    k_service: str | None = Field(
        default=None,
        validation_alias=AliasChoices("K_SERVICE", "k_service"),
        description="Cloud Run service name.",
    )

    @property
    def is_cloud_run(self) -> bool:
        """Whether running inside Cloud Run."""
        return bool(self.k_service)

    artifacts_bucket_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ARTIFACTS_BUCKET_NAME", "artifacts_bucket_name"),
        description="GCS bucket for deliverables and assets.",
    )
    logs_bucket_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LOGS_BUCKET_NAME", "logs_bucket_name"),
        description="Fallback GCS bucket for logs and artifacts.",
    )

    @property
    def resolved_bucket(self) -> str | None:
        """Resolve effective bucket name."""
        return self.artifacts_bucket_name or self.logs_bucket_name

    google_cloud_project: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "GOOGLE_CLOUD_PROJECT",
            "PROJECT_ID",
            "google_cloud_project",
            "project_id",
        ),
        description="Google Cloud project ID.",
    )
    google_cloud_location: str = Field(
        default="asia-northeast3",
        validation_alias=AliasChoices(
            "GOOGLE_CLOUD_LOCATION",
            "CLOUD_ML_REGION",
            "google_cloud_location",
            "cloud_ml_region",
        ),
        description="Google Cloud resource region.",
    )
    google_cloud_agent_engine_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "GOOGLE_CLOUD_AGENT_ENGINE_ID",
            "AGENT_ENGINE_ID",
            "google_cloud_agent_engine_id",
            "agent_engine_id",
        ),
        description="Vertex AI Agent Engine / Reasoning Engine ID.",
    )
    sub_agent_model: str = Field(
        default="gemini-3.5-flash-lite",
        validation_alias=AliasChoices("SUB_AGENT_MODEL", "sub_agent_model"),
        description="Vertex AI foundation model for structured sub-agents.",
    )
    image_model: str = Field(
        default="gemini-3.1-flash-lite-image",
        validation_alias=AliasChoices(
            "IMAGE_MODEL",
            "NANO_BANANA_MODEL",
            "image_model",
            "nano_banana_model",
        ),
        description="Vertex AI Nano Banana model for marketing visual generation.",
    )
    service_account_email: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SERVICE_ACCOUNT_EMAIL", "service_account_email"),
        description="Service account email for signing URLs.",
    )
    otel_service_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OTEL_SERVICE_NAME", "otel_service_name"),
        description="OpenTelemetry service name for distributed tracing.",
    )
    otel_to_cloud: bool = Field(
        default=False,
        validation_alias=AliasChoices("OTEL_TO_CLOUD", "otel_to_cloud"),
        description="Whether to export telemetry traces to Google Cloud Trace.",
    )


class Settings(SubAgentSettings):
    """Sub-agent settings alias for backward compatibility."""


@lru_cache
def get_settings() -> Settings:
    """Return cached sub-agent settings."""
    return Settings()


def get_subagent_settings() -> SubAgentSettings:
    """Return sub-agent settings."""
    return SubAgentSettings()


__all__ = [
    "Settings",
    "SubAgentSettings",
    "get_settings",
    "get_subagent_settings",
]
