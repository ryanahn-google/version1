# Terraform vs Architecture Documentation Checklist

This checklist provides a structured matrix of GCP resource types and configuration attributes to inspect when cross-referencing Terraform configurations against architectural and technical design documentation (TDD, ADR, RFC, README).

---

## 1. Compute: Cloud Run (`google_cloud_run_v2_service`)

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **CPU Limit** | `template.containers.resources.limits.cpu` | Capacity Sizing / Performance | Starter pack default is often `1`, while design doc calls for `2` or more. |
| **Memory Limit** | `template.containers.resources.limits.memory` | Capacity Sizing / Performance | Units format (`4Gi` in HCL vs `4 GiB` in markdown text). |
| **Request Concurrency** | `template.max_instance_request_concurrency` | Capacity Sizing / Concurrency | Default in starter packs is often `8` or `80`; verify matching design target. |
| **Min Instances** | `template.scaling.min_instance_count` | Cost Model / Scale-to-zero | Design specifying scale-to-zero requires `0`. A value of `1` incurs 24/7 compute charges. |
| **Max Instances** | `template.scaling.max_instance_count` | Cost Caps / DoW Prevention | Must match maximum scale ceiling in the design doc to prevent runaway costs. |
| **Ingress Setting** | `ingress` | Security & Privacy | `INGRESS_TRAFFIC_ALL` vs `INGRESS_TRAFFIC_INTERNAL_ONLY` / `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`. |
| **VPC Egress** | `template.vpc_access` | Security & Network Isolation | Often missing in initial Terraform; verify if Direct VPC Egress or Serverless VPC Connector is required. |
| **Service Account** | `template.service_account` | Security / IAM | Verify dedicated application SA (`sa-...`) is used, NOT the default Compute Engine SA. |
| **Environment Variables** | `template.containers.env` | Architecture / Consumed APIs | Ensure all required endpoints (`GOOGLE_CLOUD_LOCATION="global"`, connection names, bucket names) are passed. |
| **Volume Mounts** | `template.volumes` & `volume_mounts` | Data Model / Persistence | Unix socket mount `/cloudsql` must match Cloud SQL instance connection name. |

---

## 2. Relational Database: Cloud SQL (`google_sql_database_instance`)

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **Database Engine & Version** | `database_version` | Data Model / Persistent Stores | e.g. `POSTGRES_15`, `MYSQL_8_0`. Ensure major version matches TDD. |
| **Machine Tier** | `settings.tier` | Cost Model / Sizing | e.g. `db-custom-1-3840` vs shared tier `db-f1-micro`. |
| **Region** | `region` | Location Pinning | Must match project primary region (e.g. `asia-northeast3`). |
| **Backup Configuration** | `settings.backup_configuration.enabled` | Reliability / Business Continuity | Often disabled in starter templates (`false`); production design may mandate `true`. |
| **Database Flags** | `settings.database_flags` | Security / Architecture | Verify required flags like `cloudsql.iam_authentication = "on"`. |
| **Deletion Protection** | `deletion_protection` | Operational Safety | Set to `true` for prod; verify if design notes teardown lifecycle. |
| **Secrets & Passwords** | `google_secret_manager_secret` | Security | DB user password must be generated via `random_password` and stored in Secret Manager. |

---

## 3. Object Storage: Cloud Storage (`google_storage_bucket`)

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **Bucket Inventory** | `resource "google_storage_bucket"` count | Data Model / Persistent Stores | Check that all distinct buckets in docs (e.g. `mvc-artifacts` and `telemetry-logs`) are declared. |
| **Bucket Naming** | `name` | Infrastructure Standards | Naming conventions with project ID prefix (`${var.project_id}-${var.project_name}-...`). |
| **Location / Region** | `location` | Location Pinning / Compliance | Regional (e.g. `asia-northeast3`) vs dual-region vs multi-region. |
| **Uniform Bucket Access** | `uniform_bucket_level_access` | Security & Compliance | Google Cloud security best practice mandates `uniform_bucket_level_access = true`. |
| **Lifecycle & Retention** | `lifecycle_rule` / `retention_policy` | Data Model / Compliance | If design doc commits to "30 days retention", an auto-delete or retention rule must be present. |
| **Versioning** | `versioning.enabled` | Data Protection | Check if design requires object versioning for audit trails. |

---

## 4. Networking & VPC Security

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **Direct VPC Egress** | `template.vpc_access.network_interfaces` | Security & Network Isolation | Subnet name, egress mode (`ALL_TRAFFIC` vs `PRIVATE_RANGES_ONLY`). |
| **Serverless VPC Connector** | `google_vpc_access_connector` | Network Architecture | Alternative to direct egress; check IP range CIDR `/28`. |
| **Authorized Networks** | Cloud SQL `ip_configuration` | Security | Public IP should have no open CIDRs (`0.0.0.0/0`); prefer private IP (`private_network`). |

---

## 5. Security & IAM

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **Least Privilege Roles** | `var.app_sa_roles` / IAM bindings | Security & Privacy | Roles must match consumed APIs: `roles/aiplatform.user`, `roles/cloudsql.client`, `roles/storage.objectAdmin`, etc. |
| **Default SA Privileges** | `default_compute_sa` bindings | Security Posture | Avoid granting broad permissions (e.g. `roles/editor` or `roles/owner`) to default compute service account. |
| **Secret Access** | Secret Manager IAM | Security | Cloud Run SA must have `roles/secretmanager.secretAccessor` for DB credentials. |

---

## 6. Location Pinning & API Dependencies

| Configuration Attribute | Terraform HCL Field | Doc Section / Topic | Typical Gotchas |
| :--- | :--- | :--- | :--- |
| **Infra Region** | `var.region` | Location Pinning | e.g. `asia-northeast3` (Seoul). |
| **Model API Endpoint** | `GOOGLE_CLOUD_LOCATION` env var | ADR / Model Selection | Pinned to `global` for foundation models (e.g. Gemini 3.5 / Imagen 3) to prevent regional 404s. |
| **Enabled Services** | `google_project_service.services` | Architecture / Consumed APIs | Ensure `aiplatform.googleapis.com`, `run.googleapis.com`, `sqladmin.googleapis.com`, `secretmanager.googleapis.com`, `storage.googleapis.com` are enabled. |
