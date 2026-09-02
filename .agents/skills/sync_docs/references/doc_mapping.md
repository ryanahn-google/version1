# Subsystem-to-Documentation Mapping Reference

This document provides a comprehensive mapping matrix between code paths in the repository and the corresponding architectural, design, and operational documentation.

---

## 1. Primary Mapping Matrix

| Subsystem Path | Impacted Documentation Files | Target Sections / Context | Required Content Updates |
| :--- | :--- | :--- | :--- |
| `app/routers/` | `api/openapi.yaml`<br>`docs/design/TDD.md`<br>`frontend/src/types/` | TDD Section 10 (`Consumed & Exposed APIs`), OpenAPI paths | HTTP methods, path params (`{sessionId}`), request schemas, response codes (200, 307, 400, 404, 500), query parameters. |
| `app/schemas/` | `api/openapi.yaml`<br>`docs/design/TDD.md`<br>`frontend/src/types/` | TDD Section 8 & 10, Deliverables specification | Pydantic v2 fields, field descriptions, validation constraints, and TypeScript interface parity. |
| `app/models/`<br>`alembic/versions/`<br>`app/session_repo.py` | `docs/design/TDD.md`<br>`docs/adr/0003-*.md` | TDD Section 9 (`Data Model & Persistence`) | Table schemas, columns, constraints, UUID types, JSON serializers (`ensure_ascii=False`), connection pool tuning, and migration steps. |
| `app/agents/`<br>`scripts/deploy_subagents.sh` | `docs/design/TDD.md`<br>`docs/adr/0001-*.md`<br>`docs/adr/0002-*.md`<br>`docs/EVAL.md` | TDD Section 2 (`Model Topology`), Section 8 (`Agents`) | Foundation model names (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite-image`), location pinning (`global`), service accounts, and tool definitions. |
| `app/orchestrator/`<br>`app/campaign_runner.py` | `docs/design/TDD.md`<br>`docs/adr/0003-*.md` | TDD Section 4 (`Sequential DAG & HITL Review`) | 5-stage lifecycle states, review actions (`approve`, `revise`), rollback transitions ($N \to N-1$), and error handling. |
| `app/storage_service.py` | `docs/design/TDD.md`<br>`docs/adr/0006-*.md`<br>`docs/adr/0007-*.md` | TDD Section 9 & 11, GCS architecture | Multi-tenant path partitioning (`users/{user_id}/campaigns/{sessionId}/...`), 307 redirect to V4 Signed URLs, and in-memory draft visual store. |
| `app/security.py`<br>`model_armor.tf` | `docs/design/TDD.md`<br>`docs/runbooks/incident-response.md`<br>`docs/adr/0005-*.md` | TDD Section 11 (`Security & Privacy`), Runbooks | Google OAuth OIDC verification, Model Armor template configurations, fail-closed sanitization, and alert thresholds. |
| `deployment/terraform/` | `docs/design/TDD.md`<br>`docs/adr/0004-*.md`<br>`docs/adr/0005-*.md` | TDD Section 7 (`System Topology`), Section 14 (`Sizing`) | Compute CPU/RAM limits, concurrency, min/max instances, VPC subnet CIDR, firewall rules, and Cloud SQL machine tier. |
| `.cloudbuild/` | `docs/design/TDD.md`<br>`docs/adr/0004-*.md`<br>`docs/EVAL.md` | TDD Section 12 (`CI/CD Pipeline`), Quality Gates | Gate 1 PR checks, Gate 2 staging deployment, Locust load test, pre-prod eval gate, and production approval gate. |
| `frontend/src/` | `docs/design/FRONTEND.md`<br>`docs/design/TDD.md`<br>`README.md` | TDD Section 8, FRONTEND.md design system | MaValC 1.0 UI layout, 5-stage stepper, inline deliverable editors, modal states, bilingual KO/EN localization, and PDF export. |
| `eval/`<br>`tests/eval/` | `docs/EVAL.md`<br>`docs/adr/0008-*.md` | EVAL.md Quality Flywheel & Gate Thresholds | 9 golden scenarios, evaluation metrics, LLM-as-judge prompt calibration (`gemini-3.1-pro`), and P0/P1 blocker criteria. |
| `app/settings.py` | `docs/design/TDD.md`<br>`README.md`<br>`docs/runbooks/model-swap.md` | Configuration & Environment variables | Pydantic `BaseSettings` fields, `.env.example` keys, default values, and operational flags. |

---

## 2. In-Depth Sync Checklists by Document

### `docs/design/TDD.md`
- **Section 2 (Model Topology & Location Pinning)**: Verify model names (`gemini-3.1-pro`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite-image`) and `location="global"` pins.
- **Section 4 (DAG & HITL Lifecycle)**: Verify stage enum names (`MARKET_SENSING`, `STRATEGY_BRIEF`, `CREATIVE_CONTENT`, `PERFORMANCE_INSIGHTS`, `MEDIA_EXECUTION`, `COMPLETED`), actions, and rollback behavior.
- **Section 8 (Detailed Component Design)**: Verify module paths, class names, and responsibilities.
- **Section 9 (Data Model & Persistent Stores)**: Verify SQL table columns, GCS bucket names, retention policies, and index definitions.
- **Section 10 (Consumed & Exposed APIs)**: Check route table against `app/routers/` and `api/openapi.yaml`.
- **Section 11 (Security, Guardrails, & Isolation)**: Verify auth mechanism, Model Armor settings, and VPC egress rules.
- **Section 14 (Performance & Capacity Sizing)**: Verify CPU, memory, concurrency, and auto-scaling bounds.

### `api/openapi.yaml`
- Ensure every endpoint exposed by FastAPI routers is documented with accurate path parameters (e.g. `{sessionId}`), request bodies, and response schemas.
- Ensure HTTP error responses (400, 401, 403, 404, 422, 500) match Pydantic error models.

### `docs/adr/` (Architecture Decision Records)
- When introducing or altering a major architectural pattern:
  - Create a new ADR (e.g., `docs/adr/0010-....md`) or update existing ADR revisit conditions.
  - Follow the standard ADR structure: Title, Status, Context, Decision, Consequences, Compliance, and Revisit Triggers.
  - Update `docs/adr/README.md` index table.

### `docs/EVAL.md`
- Ensure golden scenario counts (e.g. 9 scenarios: 4 flagship, 3 edge, 2 guardrail) match `eval/datasets/`.
- Verify eval thresholds (100% schema conformance, 100.0% budget conservation, average judge score $\ge 4.0 / 5.0$).

### `README.md`
- Keep quick-start commands, prerequisites (`uv tool install google-agents-cli`), test instructions, and architecture summaries aligned with current implementation.
