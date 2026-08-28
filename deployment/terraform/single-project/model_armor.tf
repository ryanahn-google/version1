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

resource "google_model_armor_template" "mvc_guardrails" {
  location    = var.region
  template_id = "${var.project_name}-guardrails"
  project     = var.project_id

  filter_config {
    sdp_settings {
      basic_config {
        filter_enforcement = "ENABLED"
      }
    }
  }

  template_metadata {
    custom_prompt_safety_error_message       = "Prompt rejected by Model Armor inspection."
    custom_llm_response_safety_error_message = "Response rejected by Model Armor inspection."
  }

  depends_on = [resource.google_project_service.project_services]
}
