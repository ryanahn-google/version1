# Agent Guidelines

## 1. Core Operating Directives (Mandatory)
1. **Actively use the `ponytail` skill throughout development**: Prioritize the simplest, most minimal working solution (YAGNI, standard library / native features first, shortest diff).
2. **Environment Configuration**: Manage all environment variables in a single `.env` file instead of `env.tfvars` when writing Terraform code. When reading OS environment variables in application code, use Pydantic `BaseSettings` within a dedicated `settings.py` file rather than direct `os.getenv` or `os.environ` calls.
3. **Agent Harness Directory**: Whenever Harness is needed, DO NOT create `_agents` directory and instead stick to `.agents` directory.
4. **Preserve `.env`**: DO NOT modify or overwrite the `.env` file.
5. **Package Management**: Use `uv` as package installer/manager for this project (`uv run ...`, `uv sync`).
6. **Agent Framework**: Use Google ADK (Agent Development Kit) for agent development.
7. **Proactive Skill & CLI Utilization**: Actively leverage the `google-agents-cli-*` skill suite (`google-agents-cli-workflow`, `google-agents-cli-adk-code`, `google-agents-cli-eval`, `google-agents-cli-deploy`, `google-agents-cli-observability`, `google-agents-cli-publish`, `google-agents-cli-scaffold`) throughout the entire development lifecycle.

## 2. Project Context & Architecture
- **System**: Nova Electronics Corp — Marketing Value Creator (MVC) v1.0.
- **Topology & GCP Projects** ([TDD §7](file:///usr/local/google/home/ryanahn/capstone/version1/docs/design/TDD.md#L74-L120), [ADR-0004](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md)):
  - Multi-Project layout:
    - CI/CD Runner / Hub: `capstone-cicd` (Cloud Build 2nd Gen, Artifact Registry `version1-repo`).
    - Staging: `capstone-staging-506811` (live Staging Cloud Run, Cloud SQL, GCS).
    - Production: `capstone-prod-506811` (production Cloud Run, Cloud SQL, GCS).
  - Orchestrator: FastAPI on Cloud Run (`asia-northeast3`, Seoul) serving both backend REST API and React 19 Vite SPA static assets under a single origin.
- **Model Topology & Location Pinning** ([ADR-0002](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0002-model-selection-and-location-pinning.md), [TDD §2](file:///usr/local/google/home/ryanahn/capstone/version1/docs/design/TDD.md#L17-L24)):
  - Agent Platform foundation model API endpoints explicitly pinned to `global` (`location="global"`).
  - **Orchestrator & Eval Model**: Gemini 3.1 Pro (`gemini-3.1-pro`, invoked in Agent Platform SDK binding as `gemini-3.1-pro-preview`).
  - **Text Subagents ([P1], [P2], [P4])**: Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`, `location="global"`).
  - **Creative Subagent ([P3])**: 2-step generation pipeline — Step 3a text copy synthesis via `gemini-3.5-flash-lite` (global); Step 3b visual rendering via **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`, `location="global"`). (Replaced deprecated Imagen).
- **Subagents & Orchestration Protocol** ([ADR-0001](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0001-ai-multi-agent-pattern.md), [ADR-0003](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md), [ADR-0008](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0008-agent-gateway-ingress-and-model-armor-guardrails.md)):
  - 4 specialized subagents deployed to Agent Platform Agent Runtime (Reasoning Engine) in `asia-northeast3`:
    - `[P1] Market Sensing Agent`: outputs structured JSON (`MarketSensingDeliverable`).
    - `[P2] Strategy & Brief Agent`: outputs structured JSON (`CampaignBriefDeliverable`).
    - `[P3] Creative Content Agent`: outputs structured JSON (`CreativeContentDeliverable`) and PNG/JPEG binary image.
    - `[P4] Performance & Insights Agent`: outputs structured JSON (`PerformanceInsightsDeliverable`) with 100.0% budget conservation.
  - Direct A2A (HTTP JSON-RPC with SPIFFE-based Agent Identity via `--agent-identity`) connecting Cloud Run Orchestrator directly to Agent Runtime (superseded Agent Gateway due to regional 501 Unimplemented on `asia-northeast3`).
  - Dual-mode A2A client (`app/orchestrator/a2a_client.py`): remote HTTP JSON-RPC in cloud vs in-process local execution in test/dev.
- **HITL Workflow & DAG Lifecycle** ([TDD §2, §4](file:///usr/local/google/home/ryanahn/capstone/version1/docs/design/TDD.md#L17-L50)):
  - 5-Stage sequential DAG: `MARKET_SENSING` $\to$ `STRATEGY_BRIEF` $\to$ `CREATIVE_CONTENT` $\to$ `PERFORMANCE_INSIGHTS` $\to$ `MEDIA_EXECUTION` $\to$ `COMPLETED`.
  - Review actions: `action=approve` (advances to next stage), `action=revise` (re-runs current stage with feedback; purges in-memory draft visual in Stage 3).
  - Rollback endpoint: `POST /api/v1/campaigns/{sessionId}/rollback` (deterministic single-step rollback $N \to N-1$).
- **State & Database Persistence** ([ADR-0003](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md), [ADR-0005](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md)):
  - Table: `orchestrator_sessions` in Google Cloud SQL (PostgreSQL 15) accessed via Cloud SQL Auth Proxy Unix domain sockets (`/cloudsql/...`).
  - Local/test persistence: SQLite (`sqlite+aiosqlite`) fallback for fast isolated execution.
- **Storage & Domain-Restricted Sharing (DRS)** ([ADR-0006](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0006-hybrid-generated-asset-storage.md), [ADR-0007](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0007-domain-restricted-sharing-and-asset-streaming-proxy.md)):
  - Buckets: `capstone-{staging,prod}-506811-version1-artifacts` (30-day lifecycle retention).
  - Multi-tenant directory partitioning: `users/{user_id}/campaigns/{session_id}/{filename}`.
  - 100% private GCS bucket strictly enforcing organization policy `constraints/iam.allowedPolicyMemberDomains` (no `allUsers` IAM bindings).
  - Serving: Authenticated streaming proxy (`GET /api/v1/campaigns/{sessionId}/visual`) returning HTTP 307 Temporary Redirect to GCS V4 Signed URL (1-hour validity, 0 Cloud Run memory/egress cost).
  - Pre-approval draft preview: `GET /api/v1/campaigns/{sessionId}/draft-image` (served from in-memory cache).
- **Security & Network Isolation** ([ADR-0005](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md), [ADR-0008](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0008-agent-gateway-ingress-and-model-armor-guardrails.md)):
  - Google OAuth 2.0 (OIDC ID token verification on Cloud Run API).
  - Google Cloud Model Armor: template `version1-guardrails` in multi-region `us` (`location = "us"`), fail-closed inspection on `/api/v1/campaigns` before DAG execution (Prompt Injection/Jailbreak `LOW_AND_ABOVE`, Malicious URI, RAI `MEDIUM_AND_ABOVE`, SDP `INSPECT_AND_BLOCK`).
  - Network: Direct VPC Egress (`version1-vpc`, subnet `asia-northeast3-subnet` `10.10.0.0/24`), Cloud NAT (`version1-nat`).

## 3. Engineering & Code Standards
- **Google Python Style Guide (`go/pyguide`)**:
  - Strict type annotations on all function signatures and complex types.
  - Google-style docstrings (`Args:`, `Returns:`, `Raises:`).
  - 80-character line length limit; clean grouped imports (stdlib, third-party, local).
  - Specific exception handling (avoid broad `except Exception:`).
- **Three-Surface Layering**:
  - Pure domain / helper logic -> Tool / Subagent wrapper -> API / Transport layer.
- **Contract-First & API Routing**:
  - Single source of truth for API contracts: `api/openapi.yaml`.
  - Standardized URL path parameter: `{sessionId}` (never `{id}`).
  - RESTful deterministic state polling and JSON payloads (`stream: false`, SSE deprecated).
  - Structured data validation via Pydantic v2 schemas in `app/schemas/` (`deliverables.py`, `campaign.py`, `errors.py`).
- **Configuration & Environment Management**:
  - Centralize OS environment variable loading and validation using Pydantic `BaseSettings` (`pydantic-settings`) in `app/settings.py`.
  - Prohibit direct `os.getenv` or `os.environ` calls across the codebase.

## 4. Evaluation, CI/CD Quality Gates & ADK Workflow
- **Two-Stage Quality Gate Pipeline** ([ADR-0004](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md), [ADR-0009](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/0009-agent-platform-eval-and-deployment-quality-gate.md), [docs/EVAL.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/EVAL.md)):
  - **Gate 1 (PR Checks - `.cloudbuild/pr_checks.yaml`)**:
    - `uv sync --locked`
    - `alembic upgrade head && alembic check` (DB schema validation)
    - `npm ci && npm run build` (React 19 Vite SPA)
    - `uv run pytest tests/unit` (102 tests)
    - `uv run pytest tests/integration` (17 tests)
    - `pytest tests/eval/test_golden_campaigns.py -k test_golden_dataset_syntax`
  - **Gate 2 (Pre-Prod Staging Gate - `.cloudbuild/staging.yaml`)**:
    - Deploy subagents to Agent Runtime (`scripts/deploy_subagents.sh`)
    - Execute Cloud Run DB migration job (`version1-db-migrate`)
    - Deploy Cloud Run Orchestrator (`agents-cli deploy`)
    - 30s Locust load test on `/api/v1/campaigns` (archived to `gs://${LOGS_BUCKET}/load-test-results/`)
    - Pre-production eval gate (`scripts/eval_gate.py`) against 9 golden scenarios (4 flagship, 3 edge, 2 guardrail) with reports archived to `gs://${LOGS_BUCKET}/eval-results/`.
    - **Blocking Criteria**:
      - **P0 (Blocker)**: 100% JSON schema conformance, 100.0% budget conservation, 0 failed scenarios.
      - **P1 (Blocker)**: Average LLM judge score $\ge 4.0 / 5.0$ (`gemini-3.1-pro`), max score regression $\le 0.2$ relative to baseline.
  - **Gate 3 (Production Approval Gate)**:
    - Cloud Build manual approval (`approval_config { approval_required = true }`) before release to production.
- **Evaluation Loop & Quality Flywheel (`google-agents-cli-eval`)**:
  - Subagent testing: `agents-cli eval generate --dataset eval/datasets/golden-dataset.json` followed by `agents-cli eval grade --config eval/eval_config.yaml`.
  - Regression checking: `agents-cli eval compare`.
  - Failure clustering: `agents-cli eval analyze`.
  - Prompt tuning: `agents-cli eval optimize`.
- **Infrastructure & Deployment (`google-agents-cli-deploy`, `google-agents-cli-scaffold`)**:
  - Scaffold and enhance project configurations: `agents-cli scaffold enhance`.
  - Manage infrastructure templates: `agents-cli infra cicd`.
  - Run all unit and integration tests prior to deployment: `uv run pytest tests/unit tests/integration`.
  - **Explicit Confirmation**: Never execute `agents-cli deploy` without explicit human confirmation.
- **Observability & Telemetry (`google-agents-cli-observability`)**:
  - Cloud Trace for latency / span diagnostics and Cloud Logging for prompt-response inspection.
  - BigQuery Agent Analytics (`version1_telemetry` completions table) for turn-level telemetry.
- **Publishing & Fleet Management (`google-agents-cli-publish`)**:
  - Register and manage agents in Agent Registry / Gemini Enterprise via `agents-cli publish gemini-enterprise`.

## 5. Canonical Documentation Context Pointers
When working on specific subsystems, consult the canonical documentation:
- **Technical Design**: [docs/design/TDD.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/design/TDD.md) — Comprehensive technical design document (system architecture, schemas, SRE, FinOps).
- **Architecture Decisions**: [docs/adr/README.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/adr/README.md) — ADRs 0001 through 0009.
- **Evaluation & Quality**: [docs/EVAL.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/EVAL.md) — Quality Flywheel, golden datasets, LLM judge calibration, and eval gate thresholds.
- **Engagement & Status**: [docs/ENGAGEMENT.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/ENGAGEMENT.md) — FDE engagement phases, completed milestones, and architecture directives.
- **Visual Architecture & Forensic Audit**: [docs/architecture.html](file:///usr/local/google/home/ryanahn/capstone/version1/docs/architecture.html) & [docs/architecture_alignment_audit.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/architecture_alignment_audit.md) — 12-dimension alignment scorecard and Mermaid diagrams.
- **API Contract**: [api/openapi.yaml](file:///usr/local/google/home/ryanahn/capstone/version1/api/openapi.yaml) — Canonical OpenAPI 3.1.0 specification.
- **Operational Runbooks**: [docs/runbooks/model-swap.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/runbooks/model-swap.md) and [docs/runbooks/incident-response.md](file:///usr/local/google/home/ryanahn/capstone/version1/docs/runbooks/incident-response.md).