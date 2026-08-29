# Marketing Value Creator (MVC) v1.0

> Enterprise Multi-Agent Campaign Planning Platform on Google Cloud Run & Vertex AI Agent Runtime

Marketing Value Creator (MVC) is an enterprise generative AI campaign planning platform developed for Nova Electronics Corp. It automates 4-to-6-week cross-agency marketing campaign workflows into an interactive simulation taking under 15 seconds of compute, backed by strict brand safety guardrails and deterministic budget math.

---

## 🏛️ System Architecture

MVC is built using the **Google Agent Development Kit (ADK)** and **FastAPI**, orchestrating 4 specialized sub-agents via direct Agent-to-Agent (A2A) protocol:

```
[Marketer / Web UI] ──(OAuth 2.0 OIDC)──► [Cloud Run: version1 (Orchestrator)]
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
    [Vertex AI Agent Runtime]          [Cloud SQL PostgreSQL 15]        [Google Cloud Storage]
    • P1: Market Sensing (Flash Lite)  • orchestrator_sessions          • {project_id}-version1-artifacts
    • P2: Strategy & Brief (Flash Lite)• ADK sessions & events          • {project_id}-version1-logs
    • P3: Creative Content (Nano Banana 2 Lite) (via Auth Proxy Unix Socket) (30-day lifecycle retention)
    • P4: Performance Insights (Flash Lite)
```

- **Cloud Run Orchestrator (`version1`)**: Hosts the FastAPI backend and React SPA in `asia-northeast3` (Seoul) with 2 vCPU, 4 GiB RAM, `concurrency = 80`, and Direct VPC Egress.
- **Vertex AI Agent Runtime Sub-Agents**: 4 independent serverless Reasoning Engine deployments (`min_instances = 0`, `max_instances = 5`, `cpu = 1`, `memory = 4Gi`).
- **Cloud SQL PostgreSQL 15**: Multi-turn conversation sessions (`sessions`, `events`) and campaign workflow deliverables (`orchestrator_sessions`) connected via Cloud SQL Auth Proxy Unix sockets.
- **Model Armor Guardrails**: Inbound user prompts inspected in real time via regional template `version1-guardrails` in `asia-northeast3`.

---

## 🌐 Multi-Project GCP Topology

| Project ID | Role | Deployed Resources |
| :--- | :--- | :--- |
| **`capstone-cicd`** | CI/CD Runner Hub | Cloud Build 2nd Gen GitHub connection (`git-version1`), Artifact Registry (`version1-repo`), Build Runner SA |
| **`capstone-staging-506811`** | Staging Environment | Custom VPC (`version1-vpc`), Cloud NAT, Cloud Run (`version1`), Cloud SQL, Vertex AI Agent Runtime, GCS Buckets |
| **`capstone-prod-506811`** | Production Environment | Identical isolated production infrastructure, protected by a manual approval gate |

* **Live Staging Endpoint**: `https://version1-797135441724.asia-northeast3.run.app`

---

## 🚀 CI/CD Pipeline & Promotion Workflow

The CI/CD pipeline is 100% automated using Google Cloud Build and Terraform:

```
[Developer] ──► git push origin main
                     │
                     ▼
             [1. Cloud Build: cd-version1]
               • Docker image build (Python 3.13) & Artifact Registry push
               • Auto-deploy to Staging Cloud Run (`version1`)
               • Headless Locust load test (30s) against /sessions and /run_sse
               • Upload HTML/CSV performance reports to GCS
               • Trigger Production deployment pipeline
                     │
                     ▼
             [2. Cloud Build: deploy-version1]
               ⏸️ PENDING (Cloud Build Native Approval Gate)
                     │
                     ▼ (Authorized operator clicks "Approve" in GCP Console)
             [3. Release to Production]
               • Deploys verified container image to capstone-prod-506811
```

### Pull Request Checks
Opening a Pull Request against `main` triggers `pr-version1` (`.cloudbuild/pr_checks.yaml`), which executes:
- `pytest tests/unit`
- `pytest tests/integration`
- Code linting & formatting checks

---

## 🗄️ Connecting to Cloud SQL

### Basic Connection Metadata (Staging)
- **GCP Project**: `capstone-staging-506811`
- **Instance**: `capstone-staging-506811:asia-northeast3:version1-db-staging`
- **Database**: `version1`
- **User**: `version1`
- **Password**: Retrieve from Secret Manager:
  ```bash
  gcloud secrets versions access latest --secret="version1-db-password" --project=capstone-staging-506811
  ```

### Method 1: Cloud SQL Studio (Web Console - Recommended)
1. Navigate to **[Cloud SQL Instances](https://console.cloud.google.com/sql/instances?project=capstone-staging-506811)**.
2. Select **`version1-db-staging`** ➔ Click **Cloud SQL Studio** in the left menu.
3. Authenticate with:
   - Database: **`version1`** *(Note: default is `postgres`; you must change it to `version1`)*
   - User: **`version1`**
   - Password: (Retrieved from Secret Manager)

### Method 2: Cloud SQL Auth Proxy (GUI Tools / DBeaver / psql)
```bash
# 1. Download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# 2. Run proxy
./cloud-sql-proxy capstone-staging-506811:asia-northeast3:version1-db-staging --port 5432

# 3. Connect via psql
psql "host=127.0.0.1 port=5432 dbname=version1 user=version1 sslmode=disable"
```

### Useful SQL Queries
```sql
-- Check active ADK conversation sessions
SELECT id, app_name, user_id, update_time FROM sessions ORDER BY update_time DESC LIMIT 5;

-- Check actual model responses and chat events
SELECT id, session_id, event_data->>'author' AS author, event_data->'content' AS content, timestamp 
FROM events ORDER BY timestamp DESC LIMIT 5;

-- Check campaign planning orchestrator sessions & deliverables
SELECT session_id, current_stage, status, brand_name, product_name, created_at 
FROM orchestrator_sessions ORDER BY created_at DESC;
```

---

## 🛠️ Local Development & Testing

```bash
# 1. Install dependencies
uv sync

# 2. Run unit tests
uv run pytest tests/unit

# 3. Run integration tests
uv run pytest tests/integration/test_mvc_campaign_e2e.py

# 4. Run local FastAPI server
uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8080 --reload
```

---

## 📚 Architecture Decision Records (ADRs)

| ADR | Title | Status |
| :--- | :--- | :--- |
| [ADR-0001](docs/adr/0001-ai-multi-agent-pattern.md) | Multi-Agent Campaign DAG Orchestration via A2A over Agent Runtime and Cloud Run | Accepted |
| [ADR-0002](docs/adr/0002-model-selection-and-location-pinning.md) | Hybrid Model Selection and Vertex AI Global Endpoint Pinning | Accepted |
| [ADR-0003](docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md) | Dual-Mode A2A Client and Hybrid Session Persistence | Accepted |
| [ADR-0004](docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md) | Multi-Project CI/CD Pipeline with Cloud Build Native Approval Gate | Accepted |
| [ADR-0005](docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md) | Direct VPC Egress and Cloud SQL Auth Proxy Architecture | Accepted |

---

## 📄 Key Documentation

- [Technical Design Document (TDD)](docs/design/TDD.md)
- [Customer Scoping Document](docs/design/SCOPING.md)
- [Engagement Tracking](docs/ENGAGEMENT.md)
- [API Contract (OpenAPI 3.1)](api/openapi.yaml)
