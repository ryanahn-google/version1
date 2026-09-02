# ENGAGEMENT.md — Nova Electronics Corp / Marketing Value Creator (MVC) v1.0

Entry mode:   build                       # build = greenfield, evaluate = audit/harden an inherited system
Customer bar: enterprise                  # enterprise standard bar
Stage:        During                      # customer-facing overlay only
Success statement (draft): Build Nova Electronics Corp's Marketing Value Creator (MVC) v1.0, an enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime that automates 4-to-6-week campaign planning into an interactive simulation taking minutes under strict corporate brand guardrails.
Last refreshed: 2026-09-01 by Ryan Ahn (FDE Lead)

| Phase | Skill | Status | Artifact |
| ----- | ----- | ------ | -------- |
| 0 — Orient | ai-fde-engagement | done | docs/ENGAGEMENT.md |
| 1 — Discover & scope | ai-fde-scoping | done | docs/design/SCOPING.md |
| 2 — Document & design | ai-fde-design-docs | done | docs/design/TDD.md, docs/adr/README.md, docs/adr/0001-0009, api/openapi.yaml |
| 3 — Architect & stand up the AI | ai-fde-architecture | done | app/agents/market_sensing/, app/agents/strategy_brief/, app/agents/creative_content/, app/agents/performance_insights/, docs/EVAL.md, app/agents/*/eval/datasets/golden-dataset.json |
| 3b — Shape the codebase | ai-fde-codebase | done | Makefile, api/openapi.yaml, app/schemas/, app/settings.py, tests/conftest.py, tests/unit/, tests/integration/ |
| 4 — Secure it | ai-fde-security | done | app/orchestrator/security.py, deployment/terraform/cicd/model_armor.tf (version1-guardrails), deployment/terraform/cicd/network.tf (Direct VPC Egress) |
| 5 — Make it reliable | ai-fde-reliability | done | tests/load_test/ (Locust automated load test gate), Cloud SQL session persistence, Cloud Trace & Cloud Logging |
| 6 — Optimize cost & perf | ai-fde-cost-performance | done | docs/design/TDD.md §13 (FinOps model: $0.0455/run), scale-to-zero Cloud Run & Agent Runtime |
| 7 — Ship it | ai-fde-delivery | done | Makefile (quality, ci), .cloudbuild/*.yaml, deployment/terraform/cicd/, Artifact Registry, live Staging deployment verified |
| 8 — Design for change | ai-fde-designing-for-change | done | docs/adr/0002 (Location pinning), docs/adr/0004 (Approval gate), docs/adr/0005 (Auth proxy), docs/adr/0008 (Direct A2A & Model Armor), docs/adr/0009 (Eval quality gate), docs/runbooks/model-swap.md, docs/runbooks/incident-response.md |

## Notes & Architecture Directives
1. **Consolidated Specification Architecture**: Per project architecture directives and operational decisions, standalone satellite specifications (`RELIABILITY.md`, `CHANGES.md`, `LINEAGE.md`, `FINOPS.md`) are consolidated directly into `docs/design/TDD.md` (§11 Security, §12 Reliability, §13 FinOps, §14 Performance, §15 Observability/Telemetry).
2. **Encryption & Managed Services**: CMEK is omitted in favor of Google-managed default encryption. BigQuery is utilized for telemetry logging sinks (`genai_telemetry`) via GCS external tables without complex streaming pipelines.

## Completed Implementation Milestones
1. **Contract-First & Data Modeling**:
   - `api/openapi.yaml` committed as the single source of truth for the API surface.
   - Pydantic v2 schemas implemented in `app/schemas/` (`deliverables.py`, `campaign.py`, `errors.py`).
   - Centralized environment configuration via Pydantic `BaseSettings` (`app/settings.py`).
2. **Sub-Agents Deployment Readiness (Agent Runtime)**:
   - Scaffolded 4 standalone sub-agent packages in `app/agents/` (`market_sensing`, `strategy_brief`, `creative_content`, `performance_insights`), each with its own `agent.py`, `agents-cli-manifest.yaml` (target: `agent_runtime`, `is_a2a: true`), and golden eval dataset ("Galaxy S27 Black Friday Global Campaign").
3. **FastAPI Cloud Run Orchestrator**:
   - Implemented `app/orchestrator/session_repo.py` with SQLAlchemy hybrid persistence (Cloud SQL PostgreSQL + SQLite fallback).
   - Implemented `app/orchestrator/a2a_client.py` with dual-mode remote/local execution.
   - Implemented `app/orchestrator/security.py` with Google OAuth 2.0 OIDC verification and Model Armor prompt injection protection.
   - Implemented `app/orchestrator/engine.py` multi-agent DAG engine with SSE streaming and HITL review gates (`approve` / `revise`).
4. **Developer Loop & Quality Gates (Makefile & Testing)**:
   - Root `Makefile` implementing unified developer and CI workflow (`make help`, `make install`, `make lint`, `make format`, `make test-unit`, `make test-integration`, `make quality`, `make sim`, `make eval`, `make deploy`, `make ci`).
   - Strict linting and formatting enforced with zero errors across the entire codebase (`ruff check`, `ruff format --check`, `codespell`).
   - Pytest test suite fully green: **119 passed, 0 failed** across all unit and integration test suites (102 unit tests + 17 integration tests), with deterministic mock LLM support for local test environments (`tests/conftest.py`).
5. **Production-Grade Terraform Infrastructure (`deployment/terraform/cicd/`)**:
   - Deployed 3-Project topology: `capstone-cicd` (Hub), `capstone-staging-506811` (Staging), and `capstone-prod-506811` (Prod).
   - Custom VPC (`version1-vpc`), Subnet (`asia-northeast3-subnet`, `10.10.0.0/24`), Cloud Router, and Cloud NAT configured in `asia-northeast3` with Direct VPC Egress for Cloud Run.
   - Cloud SQL PostgreSQL 15 instances (`version1-db-staging`, `version1-db-prod`) with Cloud SQL Auth Proxy volume mount over IAM + mTLS Unix domain sockets.
   - Direct A2A over Agent Platform Agent Runtime provisioned for all 4 subagents per environment with automated A2A URL environment variable injection (superseding Agent Gateway due to regional 501 Unimplemented on asia-northeast3).
   - Google Model Armor templates (`version1-guardrails`) deployed in multi-region `us` and BigQuery Telemetry logging sinks deployed.
6. **Automated End-to-End CI/CD Pipeline (`.cloudbuild/`)**:
   - Cloud Build 2nd Gen GitHub Connection (`git-version1`) hooked into `ryanahn-google/version1`.
   - `pr-version1`: Automated PR testing gate (`pr_checks.yaml`).
   - `cd-version1`: Push to `main` triggers Docker build (Python 3.13), pushes to Artifact Registry, deploys to Staging Cloud Run (`version1`), executes automated 30s Locust load test, uploads reports to GCS, executes automated pre-production evaluation quality gate (`scripts/eval_gate.py`), and triggers Production deployment.
   - `deploy-version1`: Enters Cloud Build Native Approval Gate (`approval_config { approval_required = true }`) awaiting manual sign-off before releasing to Production.
   - Live Staging Cloud Run verified running healthy at `https://version1-797135441724.asia-northeast3.run.app`.
7. **Documentation-Code Alignment Audit & Verification (2026-09-01)**:
   - Complete line-by-line cross-audit across all architecture decision records (`docs/adr/0001-0009`), evaluation specifications (`docs/EVAL.md`), operational runbooks (`docs/runbooks/`), and core design documents against canonical production code.
   - 100% remediation of documentation drift: aligned ADR-0008 status and implementation details (Direct A2A with Orchestrator Model Armor), added ADR-0009, updated golden dataset scenario counts (9 scenarios: 4 flagship, 3 edge, 2 guardrail), Model Armor multi-region `us` location, ADK eval CLI commands (`eval generate` / `eval grade`), and Cloud Build staging quality gates.
   - Comprehensive audit deliverable cataloged in `docs/docs_code_alignment_audit.md`.
8. **Enterprise Resilience, Fallback & Retry Engine (2026-09-02)**:
   - Built and verified centralized HTTP Exponential Backoff & Jitter retry options (`app/retry_policy.py`) across Orchestrator and all subagents.
   - Implemented Multi-Tier Model Fallback strategy via `FallbackGemini` composite `BaseLlm` (`app/models_fallback.py`) for automated, zero-downtime model failover.
   - Implemented asynchronous non-blocking visual generation with 2-attempt retry loop in [P3] Creative Content Agent.
   - Implemented `@db_retry` decorator in `SessionRepository` to absorb transient Cloud SQL Auth Proxy socket resets and locks.
   - Passed 100% unit (112 tests) and integration (17 tests) test suites with 0 regressions.
