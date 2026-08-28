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

# Get project information to access the project number
data "google_project" "project" {
  for_each = local.deploy_project_ids

  project_id = local.deploy_project_ids[each.key]
}

# Generate a random password for the database user
resource "random_password" "db_password" {
  for_each = local.deploy_project_ids

  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Cloud SQL Instance
resource "google_sql_database_instance" "session_db" {
  for_each = local.deploy_project_ids

  project          = local.deploy_project_ids[each.key]
  name             = "${var.project_name}-db-${each.key}"
  database_version = "POSTGRES_15"
  region           = var.region
  deletion_protection = false # For easier teardown in starter packs

  settings {
    tier = "db-custom-1-3840"

    backup_configuration {
      enabled = true
      start_time = "03:00"
    }

    # Enable IAM authentication
    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }

  depends_on = [google_project_service.deploy_project_services]
}

# Cloud SQL Database
resource "google_sql_database" "database" {
  for_each = local.deploy_project_ids

  project  = local.deploy_project_ids[each.key]
  name     = "${var.project_name}" # Use project name for DB to avoid conflict with default 'postgres'
  instance = google_sql_database_instance.session_db[each.key].name
}

# Cloud SQL User
resource "google_sql_user" "db_user" {
  for_each = local.deploy_project_ids

  project  = local.deploy_project_ids[each.key]
  name     = "${var.project_name}" # Use project name for user to avoid conflict with default 'postgres'
  instance = google_sql_database_instance.session_db[each.key].name
  password = random_password.db_password[each.key].result
}

# Store the password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  for_each = local.deploy_project_ids

  project   = local.deploy_project_ids[each.key]
  secret_id = "${var.project_name}-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.deploy_project_services]
}

resource "google_secret_manager_secret_version" "db_password" {
  for_each = local.deploy_project_ids

  secret      = google_secret_manager_secret.db_password[each.key].id
  secret_data = random_password.db_password[each.key].result
}

# Vertex AI Reasoning Engine Sub-Agents (P1-P4) on Agent Runtime
resource "google_vertex_ai_reasoning_engine" "subagents" {
  for_each = {
    for pair in setproduct(keys(local.deploy_project_ids), local.subagent_names) :
    "${pair[0]}_${pair[1]}" => {
      env_key    = pair[0]
      project_id = local.deploy_project_ids[pair[0]]
      agent_name = pair[1]
    }
  }

  display_name = each.value.agent_name
  description  = "${each.value.agent_name} subagent on Agent Runtime"
  region       = var.region
  project      = each.value.project_id

  spec {
    agent_framework = "google-adk"
    service_account = google_service_account.app_sa[each.value.env_key].email

    deployment_spec {
      min_instances         = 0
      max_instances         = 5
      container_concurrency = 8

      resource_limits = {
        cpu    = "1"
        memory = "4Gi"
      }

      env {
        name  = "LOGS_BUCKET_NAME"
        value = google_storage_bucket.logs_data_bucket[each.value.project_id].name
      }

      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = "global"
      }

      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "True"
      }

      env {
        name  = "OTEL_SERVICE_NAME"
        value = "${var.project_name}-${each.value.agent_name}"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"
        value = "NO_CONTENT"
      }

      env {
        name  = "ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS"
        value = "false"
      }

      env {
        name  = "OTEL_SEMCONV_STABILITY_OPT_IN"
        value = "gen_ai_latest_experimental"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_UPLOAD_FORMAT"
        value = "jsonl"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_COMPLETION_HOOK"
        value = "upload"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_UPLOAD_BASE_PATH"
        value = "gs://${google_storage_bucket.logs_data_bucket[each.value.project_id].name}/completions"
      }
    }

    source_code_spec {
      inline_source {
        source_archive = local.dummy_source_b64
      }
      image_spec {}
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].container_spec,
      spec[0].source_code_spec,
      spec[0].deployment_spec,
    ]
  }

  depends_on = [google_project_service.deploy_project_services]
}

resource "google_cloud_run_v2_service" "app" {
  for_each = local.deploy_project_ids

  name                = var.project_name
  location            = var.region
  project             = each.value
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"
  labels = {
    "created-by"                  = "adk"
  }

  template {
    containers {
      # Placeholder, will be replaced by the CI/CD pipeline
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      env {
        name  = "APP_URL"
        value = "https://${var.project_name}-${data.google_project.project[each.key].number}.${var.region}.run.app"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = each.value
      }

      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = "global"
      }

      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "True"
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
        cpu_idle = false
      }
      # Mount the volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      # Environment variables
      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.session_db[each.key].connection_name
      }

      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password[each.key].secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DB_NAME"
        value = "${var.project_name}"
      }

      env {
        name  = "DB_USER"
        value = "${var.project_name}"
      }

      env {
        name  = "LOGS_BUCKET_NAME"
        value = google_storage_bucket.logs_data_bucket[each.value].name
      }

      env {
        name  = "ARTIFACTS_BUCKET_NAME"
        value = google_storage_bucket.artifacts_bucket[each.value].name
      }

      env {
        name  = "MODEL_ARMOR_TEMPLATE"
        value = google_model_armor_template.mvc_guardrails[each.key].name
      }

      env {
        name  = "OTEL_SERVICE_NAME"
        value = "v1"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"
        value = "NO_CONTENT"
      }

      env {
        name  = "ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS"
        value = "false"
      }

      env {
        name  = "OTEL_SEMCONV_STABILITY_OPT_IN"
        value = "gen_ai_latest_experimental"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_UPLOAD_FORMAT"
        value = "jsonl"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_COMPLETION_HOOK"
        value = "upload"
      }

      env {
        name  = "OTEL_INSTRUMENTATION_GENAI_UPLOAD_BASE_PATH"
        value = "gs://${google_storage_bucket.logs_data_bucket[each.value].name}/completions"
      }

      env {
        name  = "A2A_P1_URL"
        value = "https://${var.region}-aiplatform.googleapis.com/reasoningEngines/v1/projects/${data.google_project.project[each.key].number}/locations/${var.region}/reasoningEngines/${google_vertex_ai_reasoning_engine.subagents["${each.key}_market_sensing"].name}/api/a2a/market_sensing"
      }

      env {
        name  = "A2A_P2_URL"
        value = "https://${var.region}-aiplatform.googleapis.com/reasoningEngines/v1/projects/${data.google_project.project[each.key].number}/locations/${var.region}/reasoningEngines/${google_vertex_ai_reasoning_engine.subagents["${each.key}_strategy_brief"].name}/api/a2a/strategy_brief"
      }

      env {
        name  = "A2A_P3_URL"
        value = "https://${var.region}-aiplatform.googleapis.com/reasoningEngines/v1/projects/${data.google_project.project[each.key].number}/locations/${var.region}/reasoningEngines/${google_vertex_ai_reasoning_engine.subagents["${each.key}_creative_content"].name}/api/a2a/creative_content"
      }

      env {
        name  = "A2A_P4_URL"
        value = "https://${var.region}-aiplatform.googleapis.com/reasoningEngines/v1/projects/${data.google_project.project[each.key].number}/locations/${var.region}/reasoningEngines/${google_vertex_ai_reasoning_engine.subagents["${each.key}_performance_insights"].name}/api/a2a/performance_insights"
      }
    }

    service_account                = google_service_account.app_sa[each.key].email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    session_affinity = true

    vpc_access {
      network_interfaces {
        network    = google_compute_network.custom_vpc[each.key].name
        subnetwork = google_compute_subnetwork.custom_subnet[each.key].name
      }
      egress = "ALL_TRAFFIC"
    }
    # Cloud SQL volume
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.session_db[each.key].connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # This lifecycle block prevents Terraform from overwriting the container image when it's
  # updated by Cloud Run deployments outside of Terraform (e.g., via CI/CD pipelines)
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  # Make dependencies conditional to avoid errors.
  depends_on = [
    google_project_service.deploy_project_services,
    google_sql_user.db_user,
    google_secret_manager_secret_version.db_password,
    google_vertex_ai_reasoning_engine.subagents,
  ]
}
