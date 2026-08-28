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

# Dedicated Custom VPC for Staging and Prod
resource "google_compute_network" "custom_vpc" {
  for_each = local.deploy_project_ids

  project                 = each.value
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  description             = "Dedicated custom VPC for ${var.project_name} (${each.key})"

  depends_on = [google_project_service.deploy_project_services]
}

# Dedicated Subnet with Private Google Access enabled
resource "google_compute_subnetwork" "custom_subnet" {
  for_each = local.deploy_project_ids

  project                  = each.value
  name                     = "asia-northeast3-subnet"
  ip_cidr_range            = "10.10.0.0/24"
  region                   = var.region
  network                  = google_compute_network.custom_vpc[each.key].id
  private_ip_google_access = true
  description              = "Dedicated subnet in ${var.region} with Private Google Access for Cloud Run, BigQuery, Vertex AI, and Cloud SQL"

  depends_on = [google_project_service.deploy_project_services]
}

# Cloud Router for Cloud NAT
resource "google_compute_router" "router" {
  for_each = local.deploy_project_ids

  project = each.value
  name    = "${var.project_name}-router-${each.key}"
  region  = var.region
  network = google_compute_network.custom_vpc[each.key].id

  depends_on = [google_project_service.deploy_project_services]
}

# Cloud NAT for outbound internet egress
resource "google_compute_router_nat" "nat" {
  for_each = local.deploy_project_ids

  project                            = each.value
  name                               = "${var.project_name}-nat-${each.key}"
  router                             = google_compute_router.router[each.key].name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }

  depends_on = [google_project_service.deploy_project_services]
}

