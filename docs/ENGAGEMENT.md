# ENGAGEMENT.md — Nova Electronics Corp / Marketing Value Creator (MVC) v1.0

Entry mode:   build                       # build = greenfield, evaluate = audit/harden an inherited system
Customer bar: enterprise                  # enterprise standard bar
Stage:        During                      # customer-facing overlay only
Success statement (draft): Build Nova Electronics Corp's Marketing Value Creator (MVC) v1.0, an enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime that automates 4-to-6-week campaign planning into an interactive simulation taking minutes under strict corporate brand guardrails.
Last refreshed: 2026-08-28 by Ryan Ahn (FDE Lead)

| Phase | Skill | Status | Artifact |
| ----- | ----- | ------ | -------- |
| 0 — Orient | ai-fde-engagement | done | docs/ENGAGEMENT.md |
| 1 — Discover & scope | ai-fde-scoping | done | docs/design/SCOPING.md |
| 2 — Document & design | ai-fde-design-docs | done | docs/design/TDD.md, docs/adr/README.md, docs/adr/0001-0005, api/openapi.yaml |
| 3 — Architect & stand up the AI | ai-fde-architecture | done | agents/market_sensing/, agents/strategy_brief/, agents/creative_content/, agents/performance_insights/, agents/*/eval/datasets/golden-dataset.json |
| 3b — Shape the codebase | ai-fde-codebase | done | api/openapi.yaml, src/schemas/, app/orchestrator/, tests/integration/test_mvc_campaign_e2e.py |
| 4 — Secure it | ai-fde-security | done | app/orchestrator/security.py, deployment/terraform/cicd/model_armor.tf (version1-guardrails), deployment/terraform/cicd/network.tf (Direct VPC Egress) |
| 5 — Make it reliable | ai-fde-reliability | done | tests/load_test/ (Locust automated load test gate), Cloud SQL session persistence, Cloud Trace & Cloud Logging |
| 6 — Optimize cost & perf | ai-fde-cost-performance | done | docs/design/TDD.md §13 (FinOps model: $0.0455/run), scale-to-zero Cloud Run & Agent Runtime |
| 7 — Ship it | ai-fde-delivery | done | .cloudbuild/*.yaml, deployment/terraform/cicd/, Artifact Registry, live Staging deployment verified |
| 8 — Design for change | ai-fde-designing-for-change | partial | docs/adr/0002 (Location pinning), docs/adr/0004 (Approval gate), docs/adr/0005 (Auth proxy) |

## Completed Implementation Milestones
1. **Contract-First & Data Modeling**:
   - `api/openapi.yaml` committed as the single source of truth for the API surface.
   - Pydantic v2 schemas implemented in `src/schemas/` (`deliverables.py`, `campaign.py`, `errors.py`).
2. **Sub-Agents Deployment Readiness (Agent Runtime)**:
   - Scaffolded 4 standalone sub-agent packages in `app/agents/` (`market_sensing`, `strategy_brief`, `creative_content`, `performance_insights`), each with its own `agent.py`, `agents-cli-manifest.yaml` (target: `agent_runtime`, `is_a2a: true`), and golden eval dataset ("Galaxy S27 Black Friday Global Campaign").
3. **FastAPI Cloud Run Orchestrator**:
   - Implemented `app/orchestrator/session_repo.py` with SQLAlchemy hybrid persistence (Cloud SQL PostgreSQL + SQLite fallback).
   - Implemented `app/orchestrator/a2a_client.py` with dual-mode remote/local execution.
   - Implemented `app/orchestrator/security.py` with Google OAuth 2.0 OIDC verification and Model Armor prompt injection protection.
   - Implemented `app/orchestrator/engine.py` multi-agent DAG engine with SSE streaming and HITL review gates (`approve` / `revise`).
4. **Verification & Quality**:
   - End-to-end integration test `tests/integration/test_mvc_campaign_e2e.py` covering health checks, Model Armor rejection, full 4-stage golden DAG execution, and human revision gates passing with 100% success.
   - Zero linter or formatting errors across all modified and created files (`ruff check` & `ruff format`).
5. **Production-Grade Terraform Infrastructure (`deployment/terraform/cicd/`)**:
   - Deployed 3-Project topology: `capstone-cicd` (Hub), `capstone-staging-506811` (Staging), and `capstone-prod-506811` (Prod).
   - Custom VPC (`version1-vpc`), Subnet (`asia-northeast3-subnet`, `10.10.0.0/24`), Cloud Router, and Cloud NAT configured in `asia-northeast3` with Direct VPC Egress for Cloud Run.
   - Cloud SQL PostgreSQL 15 instances (`version1-db-staging`, `version1-db-prod`) with Cloud SQL Auth Proxy volume mount over IAM + mTLS Unix domain sockets.
   - Vertex AI Reasoning Engine instances provisioned for all 4 subagents per environment with automated A2A URL environment variable injection.
   - Google Model Armor templates (`version1-guardrails`) and BigQuery Telemetry logging sinks deployed.
6. **Automated End-to-End CI/CD Pipeline (`.cloudbuild/`)**:
   - Cloud Build 2nd Gen GitHub Connection (`git-version1`) hooked into `ryanahn-google/version1`.
   - `pr-version1`: Automated PR testing gate (`pr_checks.yaml`).
   - `cd-version1`: Push to `main` triggers Docker build (Python 3.13), pushes to Artifact Registry, deploys to Staging Cloud Run (`version1`), executes automated 30s Locust load test, uploads reports to GCS, and triggers Production deployment.
   - `deploy-version1`: Enters Cloud Build Native Approval Gate (`approval_config { approval_required = true }`) awaiting manual sign-off before releasing to Production.
   - Live Staging Cloud Run verified running healthy at `https://version1-797135441724.asia-northeast3.run.app`.
