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

"""Application settings and environment variable encapsulation.

Centralizes OS environment variable loading and validation using Pydantic
BaseSettings according to the project guidelines in AGENTS.md.
"""

from functools import lru_cache
from typing import Any
from urllib.parse import quote

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    """Base settings configuration enabling .env loading and ignoring extra."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


class ApplicationSettings(BaseAppSettings):
    """Core application and service identity settings."""

    app_url: str = Field(
        default="http://0.0.0.0:8000",
        validation_alias=AliasChoices("APP_URL", "app_url"),
        description="Base URL for the serving application or agent endpoint.",
    )
    agent_version: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("AGENT_VERSION", "agent_version"),
        description="Semantic version of the agent.",
    )
    integration_test: bool = Field(
        default=False,
        validation_alias=AliasChoices("INTEGRATION_TEST", "integration_test"),
        description="Whether running in integration test mode.",
    )
    user_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("USER_ID", "user_id"),
        description="Default or fallback user ID for operations.",
    )
    k_service: str | None = Field(
        default=None,
        validation_alias=AliasChoices("K_SERVICE", "k_service"),
        description="Google Cloud Run service name if deployed on Cloud Run.",
    )

    @property
    def is_cloud_run(self) -> bool:
        """Whether the application is running in Google Cloud Run."""
        return bool(self.k_service)


class SecuritySettings(BaseAppSettings):
    """Security guardrails, OAuth, and Model Armor configuration."""

    env: str = Field(
        default="development",
        validation_alias=AliasChoices("ENV", "env"),
        description="Deployment environment (development, staging, prod).",
    )

    @property
    def is_production(self) -> bool:
        """Return True if running in a production environment."""
        return self.env.strip().lower() in ("prod", "production")

    google_oauth_client_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "GOOGLE_OAUTH_CLIENT_ID", "google_oauth_client_id"
        ),
        description="Google OAuth 2.0 client ID for OIDC verification.",
    )
    model_armor_template: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MODEL_ARMOR_TEMPLATE", "model_armor_template"),
        description="Google Cloud Model Armor template resource name.",
    )
    id_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("_ID_TOKEN", "ID_TOKEN", "id_token"),
        description="Optional OIDC ID token for authenticated testing.",
    )
    session_cookie_name: str = Field(
        default="mvc_session",
        validation_alias=AliasChoices("SESSION_COOKIE_NAME", "session_cookie_name"),
        description="Cookie name for browser session authentication.",
    )
    session_expire_days: int = Field(
        default=7,
        validation_alias=AliasChoices("SESSION_EXPIRE_DAYS", "session_expire_days"),
        description="Session cookie expiration duration in days.",
    )


class A2AClientSettings(BaseAppSettings):
    """A2A ingress URLs for remote sub-agents [P1-P4]."""

    a2a_p1_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("A2A_P1_URL", "a2a_p1_url"),
        description="A2A JSON-RPC URL for Market Sensing Agent [P1].",
    )
    a2a_p2_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("A2A_P2_URL", "a2a_p2_url"),
        description="A2A JSON-RPC URL for Strategy & Brief Agent [P2].",
    )
    a2a_p3_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("A2A_P3_URL", "a2a_p3_url"),
        description="A2A JSON-RPC URL for Creative Content Agent [P3].",
    )
    a2a_p4_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("A2A_P4_URL", "a2a_p4_url"),
        description="A2A JSON-RPC URL for Performance & Insights Agent [P4].",
    )


class DatabaseSettings(BaseAppSettings):
    """Database and campaign session persistence settings."""

    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
        description="Direct database connection URL for PostgreSQL.",
    )
    instance_connection_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "INSTANCE_CONNECTION_NAME", "instance_connection_name"
        ),
        description="Cloud SQL instance connection name.",
    )
    db_pass: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_PASS", "db_pass"),
        description="Database password for Cloud SQL or PostgreSQL.",
    )
    db_user: str = Field(
        default="postgres",
        validation_alias=AliasChoices("DB_USER", "db_user"),
        description="Database username for Cloud SQL or PostgreSQL.",
    )
    db_name: str = Field(
        default="postgres",
        validation_alias=AliasChoices("DB_NAME", "db_name"),
        description="Database name for Cloud SQL or PostgreSQL.",
    )
    db_host: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DB_HOST", "db_host"),
        description="Database host for standalone PostgreSQL.",
    )
    db_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("DB_PORT", "db_port"),
        description="Database port for standalone PostgreSQL.",
    )
    local_db_path: str = Field(
        default="campaign_sessions.db",
        validation_alias=AliasChoices("LOCAL_DB_PATH", "local_db_path"),
        description="Local SQLite database file path.",
    )

    def get_cloud_sql_url(self) -> str | None:
        """Construct PostgreSQL asyncpg URL for Cloud SQL or remote DB.

        Returns:
            Formatted connection URL string or None if unconfigured.
        """
        if self.database_url:
            return self.database_url
        if self.instance_connection_name and self.db_pass:
            user = quote(self.db_user, safe="")
            pwd = quote(self.db_pass, safe="")
            inst = quote(self.instance_connection_name, safe="")
            db = quote(self.db_name, safe="")
            return f"postgresql+asyncpg://{user}:{pwd}@/{db}?host=/cloudsql/{inst}"
        if self.db_host and self.db_pass:
            user = quote(self.db_user, safe="")
            pwd = quote(self.db_pass, safe="")
            db = quote(self.db_name, safe="")
            return (
                f"postgresql+asyncpg://{user}:{pwd}@{self.db_host}:{self.db_port}/{db}"
            )
        return None

    def get_sqlite_url(self) -> str:
        """Construct SQLite connection URL for local development.

        Returns:
            Formatted sqlite+aiosqlite URL string.
        """
        return f"sqlite+aiosqlite:///{self.local_db_path}"


class StorageSettings(BaseAppSettings):
    """Artifact and deliverable storage settings."""

    artifacts_bucket_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ARTIFACTS_BUCKET_NAME", "artifacts_bucket_name"),
        description="GCS bucket for campaign deliverables and visual assets.",
    )
    logs_bucket_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LOGS_BUCKET_NAME", "logs_bucket_name"),
        description="Fallback GCS bucket for logs and artifacts.",
    )

    @property
    def resolved_bucket(self) -> str | None:
        """Resolve effective bucket name from primary or fallback log bucket."""
        return self.artifacts_bucket_name or self.logs_bucket_name


class GoogleCloudSettings(BaseAppSettings):
    """Google Cloud Platform and Agent Platform environment configuration."""

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
        description="Agent Platform Agent Engine / Reasoning Engine ID.",
    )
    google_genai_use_enterprise: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "GOOGLE_GENAI_USE_ENTERPRISE",
            "GOOGLE_GENAI_USE_VERTEXAI",
            "google_genai_use_enterprise",
            "google_genai_use_vertexai",
        ),
        description=("Whether to use Google GenAI Enterprise / Agent Platform mode."),
    )

    @property
    def google_genai_use_vertexai(self) -> bool:
        """Backward-compatible alias for google_genai_use_enterprise."""
        return self.google_genai_use_enterprise

    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "gemini_api_key"),
        description="Fallback Google AI Studio API key.",
    )
    google_api_use_client_certificate: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "GOOGLE_API_USE_CLIENT_CERTIFICATE",
            "google_api_use_client_certificate",
        ),
        description="Whether to use client certificate for Google APIs.",
    )
    cloudsdk_context_aware_use_client_certificate: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "CLOUDSDK_CONTEXT_AWARE_USE_CLIENT_CERTIFICATE",
            "cloudsdk_context_aware_use_client_certificate",
        ),
        description="Whether to use client certificate for Cloud SDK context.",
    )
    orchestrator_model: str = Field(
        default="gemini-3.1-pro-preview",
        validation_alias=AliasChoices("ORCHESTRATOR_MODEL", "orchestrator_model"),
        description="Primary foundation model for Root Orchestrator.",
    )
    orchestrator_fallback_model: str = Field(
        default="gemini-2.5-pro",
        validation_alias=AliasChoices(
            "ORCHESTRATOR_FALLBACK_MODEL", "orchestrator_fallback_model"
        ),
        description="Fallback foundation model for Root Orchestrator.",
    )
    sub_agent_model: str = Field(
        default="gemini-3.5-flash-lite",
        validation_alias=AliasChoices("SUB_AGENT_MODEL", "sub_agent_model"),
        description=("Agent Platform foundation model for structured sub-agents."),
    )
    sub_agent_fallback_model: str = Field(
        default="gemini-2.5-flash",
        validation_alias=AliasChoices(
            "SUB_AGENT_FALLBACK_MODEL", "sub_agent_fallback_model"
        ),
        description="Fallback foundation model for structured sub-agents.",
    )
    image_model: str = Field(
        default="gemini-3.1-flash-lite-image",
        validation_alias=AliasChoices(
            "IMAGE_MODEL",
            "NANO_BANANA_MODEL",
            "image_model",
            "nano_banana_model",
        ),
        description=(
            "Agent Platform Nano Banana model for marketing visual generation."
        ),
    )
    service_account_email: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SERVICE_ACCOUNT_EMAIL", "service_account_email"),
        description="Google Cloud service account email for signing URLs and GCP auth.",
    )


class TelemetrySettings(BaseAppSettings):
    """Telemetry, Cloud Logging, and OpenTelemetry / Cloud Trace configuration."""

    otel_service_name: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OTEL_SERVICE_NAME", "otel_service_name"),
        description="OpenTelemetry service name for distributed tracing.",
    )
    otel_instrumentation_genai_capture_message_content: str | bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT",
            "otel_instrumentation_genai_capture_message_content",
        ),
        description="Capture message payload in OpenTelemetry GenAI spans.",
    )
    adk_capture_message_content_in_spans: str | bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS",
            "adk_capture_message_content_in_spans",
        ),
        description="Capture full GenAI message content in ADK spans.",
    )

    @field_validator(
        "otel_instrumentation_genai_capture_message_content",
        "adk_capture_message_content_in_spans",
        mode="before",
    )
    @classmethod
    def _parse_bool_or_str(cls, v: Any) -> bool | str:
        """Parse boolean-like strings while preserving literal config strings."""
        if isinstance(v, str):
            if v.lower() in ("true", "1", "yes", "on"):
                return True
            if v.lower() in ("false", "0", "no", "off"):
                return False
            return v
        return bool(v)

    otel_semconv_stability_opt_in: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "OTEL_SEMCONV_STABILITY_OPT_IN",
            "otel_semconv_stability_opt_in",
        ),
        description="Opt-in flag for OpenTelemetry semantic conventions.",
    )
    otel_instrumentation_genai_upload_format: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "OTEL_INSTRUMENTATION_GENAI_UPLOAD_FORMAT",
            "otel_instrumentation_genai_upload_format",
        ),
        description="Format for uploading telemetry traces to Cloud Storage.",
    )
    otel_instrumentation_genai_completion_hook: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "OTEL_INSTRUMENTATION_GENAI_COMPLETION_HOOK",
            "otel_instrumentation_genai_completion_hook",
        ),
        description="Hook module for trace completion callback.",
    )
    otel_instrumentation_genai_upload_base_path: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "OTEL_INSTRUMENTATION_GENAI_UPLOAD_BASE_PATH",
            "otel_instrumentation_genai_upload_base_path",
        ),
        description="GCS base path for telemetry trace uploads.",
    )
    otel_to_cloud: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "OTEL_TO_CLOUD",
            "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY",
            "otel_to_cloud",
            "google_cloud_agent_engine_enable_telemetry",
        ),
        description="Whether to export telemetry traces to Google Cloud Trace.",
    )


class SubAgentSettings(
    ApplicationSettings,
    SecuritySettings,
    StorageSettings,
    GoogleCloudSettings,
    TelemetrySettings,
):
    """Sub-agent configuration for standalone or embedded execution."""


class Settings(
    ApplicationSettings,
    SecuritySettings,
    A2AClientSettings,
    DatabaseSettings,
    StorageSettings,
    GoogleCloudSettings,
    TelemetrySettings,
):
    """Central unified settings class for the entire application."""


@lru_cache
def get_settings() -> Settings:
    """Obtain cached singleton application settings.

    Returns:
        The validated Settings instance.
    """
    return Settings()


def get_subagent_settings() -> SubAgentSettings:
    """Obtain sub-agent settings.

    Returns:
        The validated SubAgentSettings instance.
    """
    return SubAgentSettings()


__all__ = [
    "A2AClientSettings",
    "ApplicationSettings",
    "BaseAppSettings",
    "DatabaseSettings",
    "GoogleCloudSettings",
    "SecuritySettings",
    "Settings",
    "StorageSettings",
    "SubAgentSettings",
    "TelemetrySettings",
    "get_settings",
    "get_subagent_settings",
]
