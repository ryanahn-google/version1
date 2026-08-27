# Sample Audit Report: Terraform vs Technical Design Document (TDD)

## Audit Metadata
- **Target Documentation**: `docs/design/TDD.md`, `docs/adr/0002-model-selection-and-location-pinning.md`
- **Terraform Target**: `deployment/terraform/single-project/`
- **Audit Timestamp**: 2026-08-27
- **Overall Status**: **ACTION REQUIRED (4 Mismatches, 2 Missing Declarations)**

---

## Executive Summary

Cross-referencing the Terraform codebase in `deployment/terraform/single-project/` against `docs/design/TDD.md` revealed critical infrastructure drift in compute sizing, network egress, storage retention policies, and missing artifact bucket declarations. While database engine version and regional locations align, compute and network isolation settings deviate from agreed SLO and security requirements.

---

## Detailed Findings Matrix

| Ref ID | Category | Resource / Component | Documented Spec (`TDD.md`) | Terraform Value | Severity | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **AUD-01** | Compute | Cloud Run CPU (`app`) | `2 vCPU` (Sec 14: Capacity Sizing) | `cpu = "1"` (`service.tf:116`) | **HIGH** | `MISMATCH` |
| **AUD-02** | Compute | Cloud Run Concurrency | `concurrency = 80` (Sec 14) | `max_instance_request_concurrency = 8` (`service.tf:194`) | **HIGH** | `MISMATCH` |
| **AUD-03** | Compute | Cloud Run Min Instances | `min_instances = 0` (Scale-to-zero, Sec 14) | `min_instance_count = 1` (`service.tf:197`) | **MEDIUM** | `MISMATCH` |
| **AUD-04** | Network | Direct VPC Egress | `asia-northeast3-subnet` (Sec 8.1, 11) | Not configured (`service.tf:80`) | **CRITICAL**| `MISSING_IN_TF` |
| **AUD-05** | Storage | Artifact Storage Bucket | `gs://mvc-artifacts-{project_id}` (Sec 9.1) | Missing (only logs bucket exists in `storage.tf`) | **HIGH** | `MISSING_IN_TF` |
| **AUD-06** | Storage | Bucket Retention Policy | `30 days retention` (Sec 9.1) | No lifecycle/retention rule (`storage.tf:21`) | **MEDIUM** | `MISMATCH` |
| **AUD-07** | Database| Cloud SQL Version | `POSTGRES_15` (Sec 9.1) | `database_version = "POSTGRES_15"` (`service.tf:26`) | - | `MATCH` |
| **AUD-08** | Database| Cloud SQL Tier | `db-custom-1-3840` | `tier = "db-custom-1-3840"` (`service.tf:31`) | - | `MATCH` |
| **AUD-09** | Location| Model Endpoint Location | `location="global"` (ADR-0002, TDD Sec 2) | `GOOGLE_CLOUD_LOCATION = "global"` (`service.tf:106`)| - | `MATCH` |
| **AUD-10** | Location| Infrastructure Region | `asia-northeast3` (TDD Sec 2, 7) | `var.region = "asia-northeast3"` (`variables.tf:29`) | - | `MATCH` |

---

## Actionable Remediation Plan

### 1. Reconcile Cloud Run Compute Sizing (`service.tf`)
Update `resources.limits.cpu`, `max_instance_request_concurrency`, and `min_instance_count`:

```hcl
# service.tf
resources {
  limits = {
    cpu    = "2"      # Updated from "1" to meet TDD Section 14
    memory = "4Gi"
  }
}

max_instance_request_concurrency = 80  # Updated from 8

scaling {
  min_instance_count = 0               # Updated from 1 to enable scale-to-zero
  max_instance_count = 10
}
```

### 2. Configure Direct VPC Egress (`service.tf`)
Add VPC access block to Cloud Run template:

```hcl
# service.tf
vpc_access {
  network_interfaces {
    network    = "default"
    subnetwork = "asia-northeast3-subnet"
  }
  egress = "ALL_TRAFFIC"
}
```

### 3. Provision Artifact Storage Bucket with 30-Day Retention (`storage.tf`)
Declare the missing artifact bucket:

```hcl
# storage.tf
resource "google_storage_bucket" "artifacts_bucket" {
  name                        = "${var.project_id}-${var.project_name}-artifacts"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 30 # Enforces TDD Section 9.1 30-day retention
    }
  }

  depends_on = [resource.google_project_service.services]
}
```
