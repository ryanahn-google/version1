# Project: Nova Electronics Corp MVC — Dead Code & Redundancy Audit

## Architecture
Nova Electronics Corp Marketing Value Creator (MVC) v1.0.
The system is composed of:
- Cloud Orchestrator (FastAPI on Cloud Run in `asia-northeast3` serving REST API and React 19 Vite SPA).
- Direct A2A Client (`app/orchestrator/a2a_client.py`) connecting to 4 specialized subagents.
- 4 Specialized Subagents deployed to Agent Platform Agent Runtime:
  - `[P1] Market Sensing Agent` (`app/agents/market_sensing/`)
  - `[P2] Strategy & Brief Agent` (`app/agents/campaign_brief/`)
  - `[P3] Creative Content Agent` (`app/agents/creative_content/`)
  - `[P4] Performance & Insights Agent` (`app/agents/performance_insights/`)
- Relational Persistence: Cloud SQL (PostgreSQL 15) with Alembic migrations and SQLite local fallback.
- Structured Schemas: Pydantic v2 schemas in `app/schemas/` and standalone copies in `app/agents/*/`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | App/ Inventory & Static Scan | Inventory 100% of Python files under `app/` and run static reference checks | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Dead Code & Unused Symbol Audit | Identify unused functions, classes, routes, imports, variables, dead branches | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Architectural Redundancy Analysis | Analyze orchestrator vs subagent code duplication, assessing decoupling vs bloat | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Verification Across Tests & OpenAPI | Validate findings against 120 tests and `api/openapi.yaml` contract | M2 | ORIGINAL_REQUEST §R1, R3 |
| 5 | Deliverable Compilation (DEAD_CODE_AUDIT.md) | Synthesize comprehensive audit report with exact line numbers, proofs, risk levels | M3 | ORIGINAL_REQUEST §R3 |
| 6 | Review, Adversarial Challenge & Forensic Audit | Independent review and forensic integrity audit verification of the report | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Codebase Survey & Static Dead Code Identification | Audit `app/orchestrator/`, `app/routers/`, `app/agents/`, `app/models/`, `app/schemas/`, `app/app_utils/` | none | DONE |
| 2 | M2: Architectural Redundancy & Cross-Reference Verification | Compare schemas, utilities, models; cross-reference tests and OpenAPI contract | M1 | DONE |
| 3 | M3: Deliverable Synthesis (DEAD_CODE_AUDIT.md) | Generate comprehensive `DEAD_CODE_AUDIT.md` in workspace root | M2 | DONE |
| 4 | M4: Multi-Agent Review & Forensic Verification | Reviewers, Challengers, and Forensic Auditor verify report completeness and veracity | M3 | DONE |

## Code Layout
- `app/main.py`: FastAPI application entrypoint
- `app/settings.py`: Pydantic BaseSettings configuration
- `app/orchestrator/`: Cloud orchestrator, DAG execution engine, session management, A2A client
- `app/routers/`: FastAPI REST API endpoints
- `app/agents/`: Standalone subagent definitions, tools, schemas for Agent Runtime
- `app/models/`: SQLAlchemy ORM models
- `app/schemas/`: Pydantic v2 schemas for API contracts and deliverables
- `app/app_utils/`: Application utility functions and helpers
- `api/openapi.yaml`: Canonical OpenAPI 3.1.0 contract
- `tests/`: Unit, integration, and eval test suites (120+ tests)
- `DEAD_CODE_AUDIT.md`: Final deliverable in project root
