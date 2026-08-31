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

locals {
  # Note: Google Cloud's server-side API endpoint for agentGateways currently returns
  # "501: unimplemented" in public/production control plane regions.
  # The configuration is preserved here ready to be toggled once GA/Preview rollout completes.
  enable_agent_gateway = false
}

# 1. Agent Gateway in CLIENT_TO_AGENT (Ingress) mode
resource "google_network_services_agent_gateway" "subagent_gateway" {
  provider = google-beta
  for_each = local.enable_agent_gateway ? local.deploy_project_ids : {}

  name      = "${var.project_name}-gateway"
  location  = var.region
  project   = each.value
  protocols = ["MCP"]

  google_managed {
    governed_access_path = "CLIENT_TO_AGENT"
  }

  depends_on = [
    resource.google_project_service.deploy_project_services
  ]
}

# 2. Service Extensions Authz Extension binding to regional Model Armor REP
resource "google_network_services_authz_extension" "modar_authz_ext" {
  provider = google-beta
  for_each = local.deploy_project_ids

  name     = "${var.project_name}-svc-ext-authz-modar"
  location = var.region
  project  = each.value
  service  = "modelarmor.${var.region}.rep.googleapis.com"

  metadata = {
    model_armor_settings = jsonencode([
      {
        request_template_id  = google_model_armor_template.mvc_guardrails[each.key].name
        response_template_id = google_model_armor_template.mvc_guardrails[each.key].name
      }
    ])
  }

  fail_open = false
  timeout   = "5s"

  depends_on = [
    google_model_armor_template.mvc_guardrails,
    resource.google_project_service.deploy_project_services
  ]
}

# 3. Network Security Authz Policy applying Model Armor inspection inline to the Agent Gateway
resource "google_network_security_authz_policy" "modar_authz_policy" {
  provider = google-beta
  for_each = local.enable_agent_gateway ? local.deploy_project_ids : {}

  name     = "${var.project_name}-authz-policy-modar"
  location = var.region
  project  = each.value

  target {
    resources = [
      google_network_services_agent_gateway.subagent_gateway[each.key].id
    ]
  }

  policy_profile = "CONTENT_AUTHZ"
  action         = "CUSTOM"

  custom_provider {
    authz_extension {
      resources = [
        google_network_services_authz_extension.modar_authz_ext[each.key].id
      ]
    }
  }

  depends_on = [
    google_network_services_agent_gateway.subagent_gateway,
    google_network_services_authz_extension.modar_authz_ext
  ]
}
