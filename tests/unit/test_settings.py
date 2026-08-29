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

"""Unit tests for Pydantic BaseSettings environment variable encapsulation."""

import pytest

from app.app_utils.services import get_database_url
from app.orchestrator.a2a_client import A2ASubAgentClient
from app.orchestrator.security import SecurityManager
from app.orchestrator.session_repo import _get_database_url
from app.settings import (
    A2AClientSettings,
    ApplicationSettings,
    DatabaseSettings,
    GoogleCloudSettings,
    SecuritySettings,
    Settings,
    StorageSettings,
    SubAgentSettings,
    TelemetrySettings,
    get_settings,
    get_subagent_settings,
)


def test_default_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify default values in Settings instance."""
    monkeypatch.delenv("INTEGRATION_TEST", raising=False)
    settings = Settings()
    assert settings.app_url == "http://0.0.0.0:8000"
    assert settings.agent_version == "0.1.0"
    assert settings.env == "development"
    assert settings.db_user == "postgres"
    assert settings.db_name == "postgres"
    assert settings.local_db_path == "campaign_sessions.db"
    assert settings.google_genai_use_vertexai is True
    assert settings.integration_test is False


def test_integration_test_env_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify INTEGRATION_TEST environment variable overrides default."""
    monkeypatch.setenv("INTEGRATION_TEST", "TRUE")
    settings = Settings()
    assert settings.integration_test is True


def test_application_settings_custom() -> None:
    """Verify custom values for ApplicationSettings."""
    app_settings = ApplicationSettings(
        app_url="https://mvc.example.com",
        agent_version="1.2.0",
        integration_test=True,
    )
    assert app_settings.app_url == "https://mvc.example.com"
    assert app_settings.agent_version == "1.2.0"
    assert app_settings.integration_test is True


def test_security_settings() -> None:
    """Verify SecuritySettings initialization and defaults."""
    sec = SecuritySettings(
        env="production",
        google_oauth_client_id="client-12345.apps.googleusercontent.com",
        model_armor_template="projects/p/locations/l/templates/t",
        id_token="mock-bearer-token",
    )
    assert sec.env == "production"
    expected_id = "client-12345.apps.googleusercontent.com"
    assert sec.google_oauth_client_id == expected_id
    assert sec.model_armor_template == "projects/p/locations/l/templates/t"
    assert sec.id_token == "mock-bearer-token"


def test_a2a_client_settings() -> None:
    """Verify A2AClientSettings fields."""
    a2a = A2AClientSettings(
        a2a_p1_url="https://p1.internal",
        a2a_p2_url="https://p2.internal",
        a2a_p3_url="https://p3.internal",
        a2a_p4_url="https://p4.internal",
    )
    assert a2a.a2a_p1_url == "https://p1.internal"
    assert a2a.a2a_p2_url == "https://p2.internal"
    assert a2a.a2a_p3_url == "https://p3.internal"
    assert a2a.a2a_p4_url == "https://p4.internal"


def test_database_settings_sqlite_url() -> None:
    """Verify SQLite URL generation in DatabaseSettings."""
    db = DatabaseSettings(local_db_path="test_custom.db")
    assert db.get_sqlite_url() == "sqlite+aiosqlite:///test_custom.db"
    assert db.get_cloud_sql_url() is None


def test_database_settings_cloud_sql_url() -> None:
    """Verify Cloud SQL URL construction in DatabaseSettings."""
    db = DatabaseSettings(
        instance_connection_name="my-proj:asia-northeast3:my-instance",
        db_pass="secret@pass",
        db_user="svc_user",
        db_name="campaigns",
    )
    expected_url = (
        "postgresql+asyncpg://svc_user:secret%40pass@/campaigns"
        "?host=/cloudsql/my-proj%3Aasia-northeast3%3Amy-instance"
    )
    assert db.get_cloud_sql_url() == expected_url


def test_database_settings_direct_url_precedence() -> None:
    """Verify direct DATABASE_URL takes precedence over Cloud SQL config."""
    db_url = "postgresql+asyncpg://override_user:override_pwd@/override"
    db = DatabaseSettings(
        database_url=db_url,
        instance_connection_name="my-proj:asia-northeast3:my-instance",
        db_pass="secret",
    )
    assert db.get_cloud_sql_url() == db_url


def test_storage_settings_resolved_bucket() -> None:
    """Verify resolved_bucket fallback behavior."""
    empty_storage = StorageSettings()
    assert empty_storage.resolved_bucket is None

    logs_storage = StorageSettings(logs_bucket_name="logs-bucket")
    assert logs_storage.resolved_bucket == "logs-bucket"

    artifacts_storage = StorageSettings(
        artifacts_bucket_name="artifacts-bucket",
        logs_bucket_name="logs-bucket",
    )
    assert artifacts_storage.resolved_bucket == "artifacts-bucket"


def test_google_cloud_settings_aliases(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify GCP settings AliasChoices work for alternative env names."""
    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
    monkeypatch.delenv("GOOGLE_CLOUD_LOCATION", raising=False)
    monkeypatch.delenv("GOOGLE_CLOUD_AGENT_ENGINE_ID", raising=False)
    monkeypatch.setenv("PROJECT_ID", "alias-project-999")
    monkeypatch.setenv("CLOUD_ML_REGION", "us-central1")
    monkeypatch.setenv("AGENT_ENGINE_ID", "engine-456")

    gcp = GoogleCloudSettings()
    assert gcp.google_cloud_project == "alias-project-999"
    assert gcp.google_cloud_location == "us-central1"
    assert gcp.google_cloud_agent_engine_id == "engine-456"


def test_subagent_settings() -> None:
    """Verify SubAgentSettings defaults and getter."""
    sub_cfg = get_subagent_settings()
    assert isinstance(sub_cfg, SubAgentSettings)
    assert sub_cfg.app_url == "http://0.0.0.0:8000"
    assert sub_cfg.agent_version == "0.1.0"


def test_get_settings_singleton() -> None:
    """Verify get_settings returns cached Settings instance."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
    assert isinstance(s1, Settings)


def test_security_manager_with_injected_settings() -> None:
    """Verify SecurityManager accepts injected SecuritySettings."""
    custom_sec = SecuritySettings(
        env="staging",
        google_oauth_client_id="oauth-id-test",
        model_armor_template="template-xyz",
    )
    manager = SecurityManager(settings=custom_sec)
    assert manager.env == "staging"
    assert manager.oauth_client_id == "oauth-id-test"
    assert manager.model_armor_template == "template-xyz"


def test_a2a_subagent_client_with_injected_settings() -> None:
    """Verify A2ASubAgentClient accepts injected A2AClientSettings."""
    custom_a2a = A2AClientSettings(
        a2a_p1_url="http://p1.custom",
        a2a_p2_url="http://p2.custom",
        a2a_p3_url="http://p3.custom",
        a2a_p4_url="http://p4.custom",
    )
    client = A2ASubAgentClient(settings=custom_a2a)
    assert client.p1_url == "http://p1.custom"
    assert client.p2_url == "http://p2.custom"
    assert client.p3_url == "http://p3.custom"
    assert client.p4_url == "http://p4.custom"


def test_session_repo_get_database_url_fallback() -> None:
    """Verify session_repo _get_database_url uses SQLite when no Cloud SQL."""
    assert get_database_url() is None
    url = _get_database_url()
    assert url.startswith("sqlite+aiosqlite:///")


def test_telemetry_settings_defaults_and_custom() -> None:
    """Verify TelemetrySettings default values and custom overrides."""
    default_tel = TelemetrySettings()
    assert default_tel.otel_service_name is None
    assert default_tel.otel_instrumentation_genai_capture_message_content is False
    assert default_tel.adk_capture_message_content_in_spans is False
    assert default_tel.otel_semconv_stability_opt_in is None
    assert default_tel.otel_instrumentation_genai_upload_format is None
    assert default_tel.otel_instrumentation_genai_completion_hook is None
    assert default_tel.otel_instrumentation_genai_upload_base_path is None
    assert default_tel.otel_to_cloud is False

    custom_tel = TelemetrySettings(
        otel_service_name="mvc-orchestrator-test",
        otel_to_cloud=True,
        adk_capture_message_content_in_spans=True,
    )
    assert custom_tel.otel_service_name == "mvc-orchestrator-test"
    assert custom_tel.otel_to_cloud is True
    assert custom_tel.adk_capture_message_content_in_spans is True


def test_telemetry_settings_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify TelemetrySettings loads from environment variables."""
    monkeypatch.setenv("OTEL_SERVICE_NAME", "env-service")
    monkeypatch.setenv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true")
    monkeypatch.setenv("OTEL_TO_CLOUD", "true")
    monkeypatch.setenv("OTEL_SEMCONV_STABILITY_OPT_IN", "gen_ai")
    monkeypatch.setenv("OTEL_INSTRUMENTATION_GENAI_UPLOAD_BASE_PATH", "gs://b")

    tel = TelemetrySettings()
    assert tel.otel_service_name == "env-service"
    assert tel.otel_instrumentation_genai_capture_message_content is True
    assert tel.otel_to_cloud is True
    assert tel.otel_semconv_stability_opt_in == "gen_ai"
    assert tel.otel_instrumentation_genai_upload_base_path == "gs://b"


def test_telemetry_settings_no_content_env_var(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT handles NO_CONTENT."""
    monkeypatch.setenv(
        "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "NO_CONTENT"
    )
    tel = TelemetrySettings()
    assert tel.otel_instrumentation_genai_capture_message_content == "NO_CONTENT"


def test_database_settings_standalone_postgres() -> None:
    """Verify standalone PostgreSQL URL formatting with db_host and db_port."""
    db = DatabaseSettings(
        db_host="10.0.0.5",
        db_port=5433,
        db_user="app_user",
        db_pass="secret_pass",
        db_name="campaigns_db",
    )
    expected = "postgresql+asyncpg://app_user:secret_pass@10.0.0.5:5433/campaigns_db"
    assert db.get_cloud_sql_url() == expected


def test_database_settings_special_characters_encoding() -> None:
    """Verify percent-encoding of credentials with complex special characters."""
    db = DatabaseSettings(
        instance_connection_name="proj-123:asia-northeast3:instance-abc",
        db_user="user/special@corp",
        db_pass="p@ss:w/rd?#123",
        db_name="db/campaigns#1",
    )
    url = db.get_cloud_sql_url()
    assert url is not None
    assert "user%2Fspecial%40corp" in url
    assert "p%40ss%3Aw%2Frd%3F%23123" in url
    assert "db%2Fcampaigns%231" in url
    assert "proj-123%3Aasia-northeast3%3Ainstance-abc" in url


def test_google_cloud_certificate_and_enterprise_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify certificate flags and GOOGLE_GENAI_USE_ENTERPRISE alias."""
    monkeypatch.delenv("GOOGLE_GENAI_USE_VERTEXAI", raising=False)
    monkeypatch.setenv("GOOGLE_API_USE_CLIENT_CERTIFICATE", "true")
    monkeypatch.setenv("CLOUDSDK_CONTEXT_AWARE_USE_CLIENT_CERTIFICATE", "true")
    monkeypatch.setenv("GOOGLE_GENAI_USE_ENTERPRISE", "false")

    gcp = GoogleCloudSettings()
    assert gcp.google_api_use_client_certificate is True
    assert gcp.cloudsdk_context_aware_use_client_certificate is True
    assert gcp.google_genai_use_vertexai is False


def test_subagent_settings_telemetry() -> None:
    """Verify SubAgentSettings includes telemetry configuration."""
    sub_cfg = SubAgentSettings(
        app_url="http://subagent:8080",
        otel_service_name="market-sensing-agent",
        otel_to_cloud=True,
    )
    assert sub_cfg.app_url == "http://subagent:8080"
    assert sub_cfg.otel_service_name == "market-sensing-agent"
    assert sub_cfg.otel_to_cloud is True
