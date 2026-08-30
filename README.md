# Marketing Value Creator (MVC)

> Enterprise Multi-Agent Campaign Planning Platform on Google Cloud Run & Vertex AI Agent Runtime

Marketing Value Creator (MVC) is an enterprise generative AI campaign planning platform developed for **Nova Electronics Corp**. It transforms a complex 4-to-6-week cross-agency marketing campaign workflow into an intuitive, real-time interactive simulation taking under 15 seconds of compute, backed by strict corporate brand guardrails, deterministic budget conservation, and Human-in-the-Loop (HITL) governance.

---

## 🏛️ System Architecture

MVC is built using the **Google Agent Development Kit (ADK)** and **FastAPI**, orchestrating 4 specialized sub-agents via direct Agent-to-Agent (A2A) protocol:

```
[Marketer / React 19 SPA] ──(OAuth 2.0 OIDC)──► [Cloud Run: version1 (Orchestrator)]
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         ▼                              ▼                              ▼
           [Vertex AI Agent Runtime]          [Cloud SQL PostgreSQL 15]        [Google Cloud Storage]
           • P1: Market Sensing (Flash Lite)  • campaign_sessions              • {project_id}-version1-artifacts
           • P2: Strategy & Brief (Flash Lite)• user_sessions                  • {project_id}-version1-logs
           • P3: Creative Content (Nano Banana• ADK sessions & events          (DRS-Compliant Authenticated Proxy)
           • P4: Performance (Flash Lite)     (via Auth Proxy Unix Socket)     (30-day lifecycle retention)
```

### Core Architecture Components:
- **Cloud Run Orchestrator (`version1`)**: Hosts the FastAPI backend and compiled React Single Page Application (SPA) under a **Single-Origin** topology in `asia-northeast3` (Seoul) with 2 vCPU, 4 GiB RAM, `concurrency = 80`, and Direct VPC Egress.
- **Vertex AI Agent Runtime Sub-Agents**: 4 independent serverless Reasoning Engine deployments (`min_instances = 0`, `max_instances = 5`, `cpu = 1`, `memory = 4Gi`).
- **Foundation Models**:
  - Root Orchestrator & LLM-as-a-Judge: **Gemini 3.1 Pro** (`gemini-3.1-pro`) at Vertex AI `location="global"`.
  - Text Sub-Agents (P1, P2, P4): **Gemini 3.5 Flash Lite** (`gemini-3.5-flash-lite`) for sub-3-second turn latency and strict JSON schema adherence.
  - Creative Visual Sub-Agent (P3): **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`) for studio-grade 16:9 photographic marketing visual synthesis.
- **Session & Deliverable Persistence**: **Cloud SQL (PostgreSQL 15)** mounted over Cloud SQL Auth Proxy Unix domain sockets (`/cloudsql/`), completely eliminating public database exposure.
- **Domain-Restricted Sharing (DRS) Asset Delivery**: Cloud Run issues dynamic 1-hour GCS V4 Signed URLs via an authenticated redirect proxy (`/api/v1/campaigns/{sessionId}/visual`), streaming images directly from `storage.googleapis.com` with **0 bytes Cloud Run memory buffering** and **0 bytes egress**.
- **Security & Guardrails**: Google Cloud Model Armor regional inspection (`version1-guardrails`) in `asia-northeast3` and Google OAuth 2.0 OIDC token verification.

---

## 🤖 Specialized Sub-Agents

| Agent | Stage | Model | Output Artifact | Key Responsibility |
| :--- | :---: | :--- | :--- | :--- |
| **[P1] Market Sensing** | Stage 1 | Gemini 3.5 Flash Lite | `market_sensing.json` | Consumer trend extraction, sentiment scoring, competitor benchmarking |
| **[P2] Strategy & Brief** | Stage 2 | Gemini 3.5 Flash Lite | `campaign_brief.json` | Target personas, core value proposition, channel messaging mix |
| **[P3] Creative Content** | Stage 3 | Nano Banana 2 Lite | High-Res PNG / Concept | Studio 16:9 photographic ad concept, headline copy, prompt metadata |
| **[P4] Performance Insights**| Stage 4 | Gemini 3.5 Flash Lite | `performance_insights.json` | Multi-channel budget allocation, simulated ROAS, CTR & CPC forecasts |

---

## 🎨 Frontend: MVC Design System

The frontend is an enterprise React 19 SPA built with TypeScript and Tailwind CSS:
- **MVC Brand Palette**: Deep Navy sidebar (`#0A1128`), clean light dashboard surface, and status-driven accent signals.
- **5-Stage Workspace Stepper**: Linear progress tracking through `Market Sensing` ➔ `Strategy & Brief` ➔ `Creative Content` ➔ `Performance Insights` ➔ `Campaign Complete`.
- **Real-Time Thought Stream**: Server-Sent Events (SSE) stream incremental agent thoughts and execution logs in real time.
- **Human-in-the-Loop (HITL) Gate**: Marketers review intermediate JSON deliverables and visual concepts, with one-click approval or text revision feedback loops.
- **Per-User Session History**: Left panel tabbed campaign session history with isolated per-user state and instant session restoration.
- **Contract-First Zero-Drift**: 100% synchronized with `api/openapi.yaml` via `openapi-typescript` (`make generate-api`).

---

## 🌐 Multi-Project GCP Topology

| Project ID | Role | Deployed Cloud Resources |
| :--- | :--- | :--- |
| **`capstone-cicd`** | CI/CD Runner Hub | Cloud Build 2nd Gen GitHub connection (`git-version1`), Artifact Registry (`version1-repo`), Build Runner SA |
| **`capstone-staging-506811`** | Staging Environment | Custom VPC (`version1-vpc`), Subnet, Cloud NAT, Cloud Run (`version1`), Cloud SQL (`version1-db-staging`), Agent Runtime, GCS |
| **`capstone-prod-506811`** | Production Environment | Physically isolated production replica, protected by native manual approval gate |

* **Live Staging Endpoint**: `https://version1-797135441724.asia-northeast3.run.app`

---

## 🚀 Automated CI/CD & Promotion Pipeline

The deployment pipeline is fully automated using Google Cloud Build 2nd Gen:

```
[Developer] ──► git push origin main
                     │
                     ▼
             [1. Cloud Build: cd-version1]
               • Multi-stage Docker build (Node.js 24 + Python 3.13)
               • Push image to Artifact Registry in capstone-cicd
               • Deploy revision to Staging Cloud Run (version1)
               • Headless Locust load test (30s) against /sessions & /run_sse
               • Upload HTML & CSV performance reports to GCS
               • Trigger Production deployment trigger
                     │
                     ▼
             [2. Cloud Build: deploy-version1]
               ⏸️ PENDING (Cloud Build Native Approval Gate)
                     │
                     ▼ (Release Operator clicks "Approve" in Cloud Build Console)
             [3. Release to Production]
               • Deploys verified container image to capstone-prod-506811
```

### Pull Request Quality Gate (`pr-version1`)
Every Pull Request to `main` runs `.cloudbuild/pr_checks.yaml`:
- `uv run pytest tests/unit tests/integration`
- `uv run ruff check .`
- `uv run codespell`

---

## 🛠️ Local Development Quickstart

### Prerequisites
- Python 3.13+
- `uv` (fast Python package manager)
- Node.js 24+ & npm (for frontend)

```bash
# 1. Clone repository
git clone https://github.com/ryanahn-google/version1.git
cd version1

# 2. Install all dependencies
make install
cd frontend && npm install && cd ..

# 3. Run full quality gate (Lint, format-check, typecheck, tests)
make quality

# 4. Run local full-stack server (FastAPI backend + React SPA at http://localhost:8000/mvc)
make dev

# 5. Alternatively, run with live hot-reload (Backend :8000 + Vite :5173)
make dev-live
```

---

## 🧪 Testing & Verification Commands

| Command | Purpose |
| :--- | :--- |
| `make test-unit` | Run fast, deterministic unit tests (`tests/unit`) |
| `make test-integration` | Run end-to-end integration tests (`tests/integration`) |
| `make test` | Run complete test suite (64 tests) |
| `make lint` | Run `ruff check` and `codespell` |
| `make format` | Auto-format code with `ruff format` |
| `make sim` | Run local CLI multi-agent campaign planning DAG simulation |
| `make generate-api` | Regenerate TypeScript schema types from `api/openapi.yaml` |

---

## 🗄️ Database & Cloud SQL Access

### Connection Details (Staging)
- **Instance**: `capstone-staging-506811:asia-northeast3:version1-db-staging`
- **Database**: `version1`
- **User**: `version1`
- **Password**: Retrieve securely from Secret Manager:
  ```bash
  gcloud secrets versions access latest --secret="version1-db-password" --project=capstone-staging-506811
  ```

### Useful SQL Inspection Queries
```sql
-- 1. Inspect campaign workflow deliverables & state
SELECT session_id, user_id, current_stage, status, brand_name, product_name, created_at 
FROM campaign_sessions 
ORDER BY created_at DESC LIMIT 5;

-- 2. Inspect active authenticated user sessions
SELECT session_token, user_id, ip_address, expires_at, last_accessed_at 
FROM user_sessions 
ORDER BY last_accessed_at DESC LIMIT 5;

-- 3. Inspect ADK turn events and agent messages
SELECT id, session_id, event_data->>'author' AS author, event_data->'content' AS content, timestamp 
FROM events 
ORDER BY timestamp DESC LIMIT 5;
```

---

## 📚 Architecture Decision Records (ADRs)

All architectural choices adhere to the FDE standard and are indexed in [`docs/adr/README.md`](docs/adr/README.md):

| ADR | Title | Status |
| :---: | :--- | :---: |
| [ADR-0001](docs/adr/0001-ai-multi-agent-pattern.md) | Multi-Agent Campaign DAG Orchestration via A2A over Agent Runtime and Cloud Run | **Accepted** |
| [ADR-0002](docs/adr/0002-model-selection-and-location-pinning.md) | Hybrid Model Selection and Vertex AI Global Endpoint Pinning | **Accepted** |
| [ADR-0003](docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md) | Dual-Mode A2A Client and Hybrid Session Persistence | **Accepted** |
| [ADR-0004](docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md) | Multi-Project CI/CD Pipeline with Cloud Build Native Approval Gate | **Accepted** |
| [ADR-0005](docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md) | Direct VPC Egress and Cloud SQL Auth Proxy Architecture | **Accepted** |
| [ADR-0006](docs/adr/0006-hybrid-generated-asset-storage.md) | Hybrid Generated Visual Asset Storage (Local Fallback vs Google Cloud Storage) | **Accepted** |
| [ADR-0007](docs/adr/0007-domain-restricted-sharing-and-asset-streaming-proxy.md) | Domain-Restricted Sharing (DRS) Compliance and Authenticated Asset Streaming Proxy | **Accepted** |

---

## 📄 Documentation Index

- **[Technical Design Document (TDD)](docs/design/TDD.md)**: Authoritative 20-section technical specification.
- **[Customer Scoping Document](docs/design/SCOPING.md)**: 19-question scoping questionnaire, C4 Level 1 context, RACI, and signed scope-freeze one-pager.
- **[Frontend Technical Design](docs/design/FRONTEND.md)**: Single-Origin topology, 3-panel command center, SSE event protocol, and TypeScript codegen.
- **[AI Evaluation Plan](docs/EVAL.md)**: Golden evaluation datasets, metrics, and Gemini 3.1 Pro LLM-as-a-Judge calibration rubrics.
- **[Engagement Tracking (ENGAGEMENT.md)](docs/ENGAGEMENT.md)**: FDE engagement phase router and milestone status.
- **[API Contract (OpenAPI 3.1)](api/openapi.yaml)**: Single source of truth for REST and SSE endpoints.
- **Operational Runbooks**:
  - [30-Day Model Swap Runbook](docs/runbooks/model-swap.md)
  - [Incident Response Runbook](docs/runbooks/incident-response.md)
