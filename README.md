# Marketing Value Creator (MVC)

> Enterprise Multi-Agent Campaign Planning Platform on Google Cloud Run & Agent Platform Agent Runtime

![CI/CD Tests](https://img.shields.io/badge/Tests-119%20Passed%20(100%25)-emerald?logo=pytest)
![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)
![React](https://img.shields.io/badge/React-19%20SPA-61DAFB?logo=react)
![Framework](https://img.shields.io/badge/Framework-Google%20ADK%20%2B%20FastAPI-4285F4?logo=google)
![Foundation Models](https://img.shields.io/badge/Models-Gemini%203.1%20Pro%20%7C%203.5%20Flash%20Lite%20%7C%20Nano%20Banana%202-purple?logo=google-gemini)
![Region](https://img.shields.io/badge/Region-asia--northeast3%20(Seoul)%20%2F%20global-orange?logo=google-cloud)
[![Architecture](https://img.shields.io/badge/Architecture-Interactive%20HTML%20Viewer-cyan)](docs/architecture.html)

Marketing Value Creator (MVC) is an enterprise generative AI campaign planning platform developed for **Nova Electronics Corp**. It transforms a complex 4-to-6-week cross-agency marketing campaign workflow into an intuitive, real-time interactive simulation taking under 15 seconds of compute ($0.0455/run, 54.5% below budget target), backed by strict corporate brand guardrails, deterministic 100.0% budget conservation, and Human-in-the-Loop (HITL) governance.

---

## 🏛️ System Architecture

MVC is built using the **Google Agent Development Kit (ADK)** and **FastAPI**, orchestrating 4 specialized sub-agents via direct Agent-to-Agent (A2A) protocol:

```
[Marketer / React 19 SPA] ──(Google OAuth 2.0 OIDC)──► [Cloud Run: version1 (Orchestrator)]
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    ▼                                         ▼                                         ▼
      [Agent Platform Agent Runtime]                [Cloud SQL PostgreSQL 15]                 [Google Cloud Storage]
      • P1: Market Sensing (Flash Lite)             • orchestrator_sessions                   • capstone-{env}-version1-artifacts
      • P2: Strategy & Brief (Flash Lite)           • users & user_sessions                   • capstone-{env}-version1-logs
      • P3: Creative Content (Nano Banana 2 Lite    • ADK sessions & events                   (DRS V4 Signed URL 307 Redirect)
            + 3.5 Flash Lite)                       (via Auth Proxy Unix Socket /cloudsql/)   (users/{user_id}/campaigns/{session_id}/)
      • P4: Performance (Flash Lite)                (Zero Public IP exposure)                 (30-day lifecycle retention)
      (A2A Protocol & SPIFFE Agent Identity)
                    │                                         │                                         │
                    └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                              ▼
                                              [Security & Observability Tier]
                                              • Google Cloud Model Armor: version1-guardrails (us multi-region)
                                                (Prompt Injection/Jailbreak, Malicious URI, RAI, SDP/PII Fail-Closed)
                                              • Google BigQuery: version1_telemetry (completions table via Logging Sinks)
                                              • Google Cloud Trace & Cloud Logging (traceId W3C propagation)
```

> 📊 **Interactive Architecture Dashboard**: Explore the live, responsive C4 diagrams, sequence flows, and component specs in [docs/architecture.html](docs/architecture.html) or via the `/architecture` route.

### Core Architecture Components:
- **Cloud Run Orchestrator (`version1`)**: Hosts the FastAPI backend and compiled React Single Page Application (SPA) under a **Single-Origin (Zero-CORS)** topology in `asia-northeast3` (Seoul) with 2 vCPU, 4 GiB RAM, `concurrency = 80`, and Direct VPC Egress (`asia-northeast3-subnet` `10.10.0.0/24`).
- **Zero-Trust VPC Firewall Perimeter**: `version1-vpc` enforces default-deny ingress (`0.0.0.0/0`, priority 65000) for zero external inbound exposure, default-deny egress (`0.0.0.0/0`, priority 65000), and whitelist egress strictly for Google APIs (TCP 443), Cloud SQL Auth Proxy mTLS (TCP 3307), and DNS (TCP/UDP 53).
- **Agent Platform Agent Runtime Sub-Agents**: 4 independent serverless Reasoning Engine deployments in `asia-northeast3` communicating with Cloud Run via Direct A2A with SPIFFE-based Agent Identity (`--agent-identity`) and dedicated Subagent SA (`version1-subagent`, bound to least-privilege `roles/storage.objectAdmin`).
- **Foundation Models & Location Pinning**:
  - Root Orchestrator & LLM-as-a-Judge: **Gemini 3.1 Pro** (instantiated in ADK as `gemini-3.1-pro-preview`, exposed in `/meta` as `gemini-3.1-pro`) pinned to Agent Platform `location="global"`.
  - Text Sub-Agents (P1, P2, P4): **Gemini 3.5 Flash Lite** (`gemini-3.5-flash-lite`, `location="global"`) for sub-3-second turn latency and strict JSON schema adherence.
  - Creative Visual Sub-Agent (P3): 2-step generation pipeline — Step 3a text copy via `gemini-3.5-flash-lite` (global); Step 3b visual rendering via **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`, `location="global"`) for studio-grade 16:9 photographic marketing visual synthesis.
- **Session & State Persistence**: **Cloud SQL (PostgreSQL 15)** mounted over Cloud SQL Auth Proxy Unix domain sockets (`/cloudsql/`), storing multi-stage campaign deliverables in `orchestrator_sessions` and OIDC sessions in `user_sessions`, guaranteeing state survival across Cloud Run scale-to-zero events.
- **Domain-Restricted Sharing (DRS) Asset Delivery**: Cloud Run issues dynamic 1-hour GCS V4 Signed URLs via an authenticated redirect proxy (`GET /api/v1/campaigns/{sessionId}/visual`), issuing an `HTTP 307 Temporary Redirect` with `Cache-Control: public, max-age=3600` to stream directly from `storage.googleapis.com` with **0 bytes Cloud Run memory buffering** and **0 bytes egress**.
- **Enterprise Security & Guardrails**: Google Cloud Model Armor template `version1-guardrails` in **`us` multi-region** actively enforcing prompt injection/jailbreak (`LOW_AND_ABOVE`), malicious URI, Responsible AI (`MEDIUM_AND_ABOVE`), and Sensitive Data Protection (`INSPECT_AND_BLOCK`), backed by Google OAuth 2.0 OIDC token validation.
- **Enterprise Resilience, Fallback & Retry Engine**:
  - **Centralized HTTP Exponential Backoff & Jitter**: Built on `google.genai.types.HttpRetryOptions` (`app/retry_policy.py`), applying 3 attempts with exponential backoff and randomized jitter (`attempts=3, initial_delay=1.0s, max_delay=10.0s, exp_base=2.0, jitter=1.0`) across Root Orchestrator, all 4 Subagents, and the A2A client on transient status codes (`408, 429, 500, 502, 503, 504`).
  - **Multi-Tier Model Fallback Strategy (`FallbackGemini`)**: Transparent automated failover from `gemini-3.1-pro-preview` to `gemini-2.5-pro` (Orchestrator) and `gemini-3.5-flash-lite` to `gemini-2.5-flash` (Subagents), ensuring zero service interruption during regional model quota saturation.
  - **Asynchronous Non-Blocking Creative Generation**: [P3] Nano Banana 2 Lite runs asynchronously (`client.aio.models.generate_content`) with a 2-attempt retry loop (`timeout=25.0s`, jittered backoff) and non-blocking GCS upload (`asyncio.to_thread`).
  - **Database Transient Fault Retry (`@db_retry`)**: Native async decorator in `app/orchestrator/session_repo.py` protecting all 8 database query methods (3 attempts, initial 0.5s, factor 2.0, max 5.0s, jitter 0.5s) to absorb Cloud SQL Auth Proxy socket resets and transient lock contention.

---

## 🤖 Specialized Sub-Agents

| Agent | Stage | Model & Location | Output Deliverable | Key Responsibility |
| :--- | :---: | :--- | :--- | :--- |
| **[P1] Market Sensing** | Stage 1 | Gemini 3.5 Flash Lite (`global`) | `MarketSensingDeliverable` (JSON) | Consumer trend extraction, competitor benchmarking, sentiment scoring, Google Search grounding |
| **[P2] Strategy & Brief** | Stage 2 | Gemini 3.5 Flash Lite (`global`) | `CampaignBriefDeliverable` (JSON) | Target personas, core value proposition, channel messaging mix & tone of voice |
| **[P3] Creative Content** | Stage 3 | Flash Lite (Copy) + Nano Banana 2 Lite (`global`) | `CreativeContentDeliverable` (JSON) + PNG/JPEG Binary | 2-step synthesis: ad headline & copy, 16:9 studio photographic prompt, visual rendering |
| **[P4] Performance Insights** | Stage 4 | Gemini 3.5 Flash Lite (`global`) | `PerformanceInsightsDeliverable` (JSON) | Multi-channel budget allocation (100.0% budget conservation), simulated ROAS, CTR & CPC forecasts |

---

## 🎨 Frontend: MVC Design System

The frontend is an enterprise React 19 SPA built with TypeScript and Tailwind CSS:
- **MVC Brand Palette**: Deep Navy sidebar (`#0A1128`), clean dashboard surface, status-driven accent signals, and responsive Dark/Light mode.
- **5-Stage Workspace Stepper**: Linear progress tracking through `Market Sensing` ➔ `Strategy & Brief` ➔ `Creative Content` ➔ `Performance Insights` ➔ `Media Execution` ➔ `Campaign Complete`.
- **Deterministic Unary REST Synchronization**: Atomic REST transactions (`apiClient.createCampaign`, `apiClient.approveStage`, `apiClient.rollbackStage`) returning `CampaignSessionResponse` (deprecated `stream: false` property), with synthetic client-side activity logging synthesized via `useCampaignStream.ts`.
- **Human-in-the-Loop (HITL) Review Gate**: Marketers review intermediate JSON deliverables and visual concepts, with one-click approval (`action='approve'`), text revision feedback loops (`action='revise'`, which automatically purges in-memory draft images in Stage 3), and single-step rollback (`POST /api/v1/campaigns/{sessionId}/rollback`, $N \to N-1$).
- **Per-User Session History**: Left panel tabbed campaign session history with isolated per-user state and instant session restoration.
- **Contract-First Zero-Drift**: 100% synchronized with `api/openapi.yaml` via `openapi-typescript` (`make generate-api`).
- **Single-Origin Deployment**: Pre-compiled Vite bundle mounted at `/static` and served directly by FastAPI at `/` and `/mvc` under zero-CORS configuration.

---

## 🌐 Multi-Project GCP Topology

| Project ID | Role | Deployed Cloud Resources |
| :--- | :--- | :--- |
| **`capstone-cicd`** | CI/CD Runner Hub | Cloud Build 2nd Gen GitHub connection (`git-version1`), Artifact Registry (`version1-repo`), Build Runner SA |
| **`capstone-staging-506811`** | Staging Environment | Custom VPC (`version1-vpc`), Subnet (`10.10.0.0/24`), Zero-Trust Firewall (Default Deny + 443/3307/53 Whitelist), Cloud NAT, Cloud Run (`version1`), Cloud SQL (`version1-db-staging`), Agent Platform Agent Runtime (P1~P4), Cloud Run DB migration job (`version1-db-migrate`), GCS (`version1-artifacts`, `version1-logs`), BigQuery (`version1_telemetry`) |
| **`capstone-prod-506811`** | Production Environment | Physically isolated production replica, protected by native manual approval gate (`approval_config { approval_required = true }`) |

* **Live Staging Application**: `https://version1-797135441724.asia-northeast3.run.app/mvc`
* **Live Architecture Dashboard**: `https://version1-797135441724.asia-northeast3.run.app/architecture`
* **Liveness Probe**: `https://version1-797135441724.asia-northeast3.run.app/healthz`

---

## 🚀 Automated CI/CD & Promotion Pipeline

The deployment pipeline is fully automated across environments using Google Cloud Build 2nd Gen:

```
[Developer] ──► git push origin main
                     │
                     ▼
             [1. Cloud Build: cd-version1]
               • Multi-stage Docker build (Node.js 24 + Python 3.13)
               • Push image to Artifact Registry in capstone-cicd
               • Deploy subagents P1-P4 to Agent Platform Agent Runtime (scripts/deploy_subagents.sh)
               • Execute database migrations via Cloud Run Job (version1-db-migrate --wait)
               • Deploy revision to Staging Cloud Run (agents-cli deploy)
               • Headless Locust load test (30s) against /api/v1/campaigns (0 errors)
               • Pre-production Agent Platform Quality Gate (scripts/eval_gate.py)
                 - Evaluates 9 Golden Scenarios (4 flagship, 3 edge, 2 guardrail probes)
                 - P0 Blocker: 100% schema & budget conservation, 0 failures
                 - P1 Blocker: LLM Judge score >= 4.0/5.0, regression <= 0.2
               • Upload HTML & CSV test reports to GCS logs bucket
               • Trigger Production deployment trigger
                     │
                     ▼
             [2. Cloud Build: deploy-version1]
               ⏸️ PENDING (Cloud Build Native Approval Gate)
                     │
                     ▼ (Release Operator inspects reports & clicks "Approve" in Console)
             [3. Release to Production]
               • Deploys verified container image to capstone-prod-506811
```

### Pull Request Quality Gate (`pr-version1`)
Every Pull Request to `main` runs `.cloudbuild/pr_checks.yaml`:
- `uv sync --locked` (deterministic dependency lock)
- `alembic upgrade head && alembic check` (Cloud SQL schema validation)
- `npm ci && npm run build` (React 19 SPA bundle integrity)
- `uv run pytest tests/unit` (102 unit tests, 100% pass)
- `uv run pytest tests/integration` (17 integration tests, 100% pass)
- `pytest tests/eval/test_golden_campaigns.py -k test_golden_dataset_syntax`
- `uv run ruff check .` & `uv run codespell`

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

# 3. Run full quality gate (Lint, format-check, typecheck, 119 tests)
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
| `make test-unit` | Run 102 deterministic unit tests (`tests/unit`) |
| `make test-integration` | Run 17 end-to-end integration tests (`tests/integration`) |
| `make test` | Run complete test suite (**119 tests**, 100% passing) |
| `make quality` | Composite quality gate (`check-lock`, `format-check`, `lint`, `typecheck`, `test`) |
| `make lint` | Run `ruff check .` and `codespell` |
| `make format` | Auto-format code with `ruff format .` |
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
-- 1. Inspect campaign workflow deliverables & state (orchestrator_sessions)
SELECT session_id, user_id, current_stage, status, brand_name, product_name, created_at 
FROM orchestrator_sessions 
ORDER BY created_at DESC LIMIT 5;

-- 2. Inspect active authenticated user sessions
SELECT session_token, user_id, ip_address, expires_at, last_accessed_at 
FROM user_sessions 
ORDER BY last_accessed_at DESC LIMIT 5;

-- 3. Inspect registered users and roles
SELECT user_id, google_sub, email, name, role, tenant_id, created_at 
FROM users 
ORDER BY created_at DESC LIMIT 5;
```

---

## 📚 Architecture Decision Records (ADRs)

All architectural choices adhere to the FDE standard and are indexed in [`docs/adr/README.md`](docs/adr/README.md):

| ADR | Title | Status | Date | Note |
| :---: | :--- | :---: | :---: | :--- |
| [ADR-0001](docs/adr/0001-ai-multi-agent-pattern.md) | Multi-Agent Campaign DAG Orchestration via A2A over Agent Runtime and Cloud Run | **Accepted** | 2026-08-26 | 4 Reasoning Engines + Central Orchestrator |
| [ADR-0002](docs/adr/0002-model-selection-and-location-pinning.md) | Hybrid Model Selection and Agent Platform Global Endpoint Pinning | **Accepted** | 2026-08-27 | Pro + Flash Lite + Nano Banana 2 Lite |
| [ADR-0003](docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md) | Dual-Mode A2A Client and Hybrid Session Persistence | **Accepted** | 2026-08-27 | Cloud SQL (PostgreSQL 15) & SQLite Fallback |
| [ADR-0004](docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md) | Multi-Project CI/CD Pipeline with Cloud Build Native Approval Gate | **Accepted** | 2026-08-28 | Runner Hub, Staging, and Production Isolation |
| [ADR-0005](docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md) | Direct VPC Egress and Cloud SQL Auth Proxy Architecture | **Accepted** | 2026-08-28 | Zero Public IP, /cloudsql/ Unix Socket & Zero-Trust Firewall |
| [ADR-0006](docs/adr/0006-hybrid-generated-asset-storage.md) | Hybrid Generated Visual Asset Storage (Local Fallback vs Google Cloud Storage) | **Accepted** | 2026-08-29 | DraftImageStore vs Committed GCS Lifecycle |
| [ADR-0007](docs/adr/0007-domain-restricted-sharing-and-asset-streaming-proxy.md) | Domain-Restricted Sharing (DRS) Compliance and Authenticated Asset Streaming Proxy | **Accepted** | 2026-08-29 | V4 Signed URL 307 Redirect (0-byte Egress) |
| [ADR-0008](docs/adr/0008-agent-platform-eval-and-deployment-quality-gate.md) | Agent Platform Hybrid Evaluation and Two-Stage Deployment Quality Gate | **Accepted** | 2026-08-31 | 9 Golden Scenarios & Automated Blocker Gate |

---

## 📄 Documentation Index

- **[Interactive Architecture Viewer (docs/architecture.html)](docs/architecture.html)**: Interactive visual dashboard featuring C4 Level 1 & 2 diagrams, sequence flows, HITL state machine, DRS proxy sequence, and CI/CD pipeline (served at `/architecture`).
- **[Technical Design Document (TDD)](docs/design/TDD.md)**: Authoritative 20-section technical specification covering system architecture, schemas, SRE, and FinOps.
- **[Customer Scoping Document](docs/design/SCOPING.md)**: 19-question scoping questionnaire, C4 Level 1 context, RACI, and signed scope-freeze one-pager.
- **[Frontend Technical Design](docs/design/FRONTEND.md)**: Single-Origin topology, 3-panel command center, deterministic Unary REST synchronization, and TypeScript codegen.
- **[AI Evaluation Plan](docs/EVAL.md)**: Master 9-scenario golden evaluation dataset, Quality Flywheel, and Gemini 3.1 Pro LLM-as-a-Judge calibration rubrics.
- **[Engagement Tracking (ENGAGEMENT.md)](docs/ENGAGEMENT.md)**: FDE engagement phase router, completed milestones, and architecture directives.
- **[API Contract (OpenAPI 3.1)](api/openapi.yaml)**: Single source of truth for 19 REST endpoints with standardized camelCase `{sessionId}` path parameters.
- **Operational Runbooks**:
  - [30-Day Model Swap Runbook](docs/runbooks/model-swap.md)
  - [Incident Response Runbook](docs/runbooks/incident-response.md)
