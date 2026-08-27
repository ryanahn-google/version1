# ENGAGEMENT.md — Nova Electronics Corp / Marketing Value Creator (MVC) v1.0

Entry mode:   build                       # build = greenfield, evaluate = audit/harden an inherited system
Customer bar: enterprise                  # enterprise standard bar
Stage:        During                      # customer-facing overlay only
Success statement (draft): Build Nova Electronics Corp's Marketing Value Creator (MVC) v1.0, an enterprise multi-agent campaign planning platform on Cloud Run and Agent Runtime that automates 4-to-6-week campaign planning into an interactive simulation taking minutes under strict corporate brand guardrails.
Last refreshed: 2026-08-27 by Ryan Ahn (FDE Lead)

| Phase | Skill | Status | Artifact |
| ----- | ----- | ------ | -------- |
| 0 — Orient | ai-fde-engagement | done | docs/ENGAGEMENT.md |
| 1 — Discover & scope | ai-fde-scoping | done | docs/design/SCOPING.md |
| 2 — Document & design | ai-fde-design-docs | done | docs/design/TDD.md, docs/adr/README.md, docs/adr/0001-ai-multi-agent-pattern.md, docs/adr/0002-model-selection-and-location-pinning.md, docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md, api/openapi.yaml |
| 3 — Architect & stand up the AI | ai-fde-architecture | done | agents/market_sensing/, agents/strategy_brief/, agents/creative_content/, agents/performance_insights/, agents/*/eval/datasets/golden-dataset.json |
| 3b — Shape the codebase | ai-fde-codebase | done | api/openapi.yaml, src/schemas/, app/orchestrator/, tests/integration/test_mvc_campaign_e2e.py |
| 4 — Secure it | ai-fde-security | partial | app/orchestrator/security.py (Google OAuth 2.0 OIDC + Model Armor prompt injection guardrails) |
| 5 — Make it reliable | ai-fde-reliability | — | docs/RELIABILITY.md, docs/alerts/, docs/runbooks/ |
| 6 — Optimize cost & perf | ai-fde-cost-performance | partial | docs/design/TDD.md §13 (FinOps model: $0.0455/run) |
| 7 — Ship it | ai-fde-delivery | — | cloudbuild.yaml, deployment/terraform/, docs/design/LINEAGE.md |
| 8 — Design for change | ai-fde-designing-for-change | — | docs/design/CHANGES.md, docs/runbooks/model-swap.md |

## Completed Implementation Milestones
1. **Contract-First & Data Modeling**:
   - `api/openapi.yaml` committed as the single source of truth for the API surface.
   - Pydantic v2 schemas implemented in `src/schemas/` (`deliverables.py`, `campaign.py`, `errors.py`).
2. **Sub-Agents Deployment Readiness (Agent Runtime)**:
   - Scaffolded 4 standalone sub-agent packages in `agents/` (`market_sensing`, `strategy_brief`, `creative_content`, `performance_insights`), each with its own `agent.py`, `agents-cli-manifest.yaml` (target: `agent_runtime`), and golden eval dataset ("Galaxy S27 Black Friday Global Campaign").
3. **FastAPI Cloud Run Orchestrator**:
   - Implemented `app/orchestrator/session_repo.py` with SQLAlchemy hybrid persistence (Cloud SQL PostgreSQL + SQLite fallback).
   - Implemented `app/orchestrator/a2a_client.py` with dual-mode remote/local execution.
   - Implemented `app/orchestrator/security.py` with Google OAuth 2.0 OIDC verification and Model Armor prompt injection protection.
   - Implemented `app/orchestrator/engine.py` multi-agent DAG engine with SSE streaming and HITL review gates (`approve` / `revise`).
4. **Verification & Quality**:
   - End-to-end integration test `tests/integration/test_mvc_campaign_e2e.py` covering health checks, Model Armor rejection, full 4-stage golden DAG execution, and human revision gates passing with 100% success.
   - Zero linter or formatting errors across all modified and created files (`ruff check` & `ruff format`).
