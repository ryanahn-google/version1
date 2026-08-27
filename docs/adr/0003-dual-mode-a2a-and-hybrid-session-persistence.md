# ADR-0003: Dual-Mode A2A Client and Hybrid Session Persistence

- **Status**: Accepted
- **Date**: 2026-08-27
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](docs/design/TDD.md)

## Context
The Orchestrator coordinates 4 sub-agents deployed to Agent Runtime and needs to persist multi-turn HITL campaign sessions across Cloud Run scale-to-zero events.
Developers also require a rapid local development and test loop (`pytest`, local FastAPI server) without mandatory reliance on 4 concurrently running cloud or local processes.

## Decision
1. **Dual-Mode A2A Client**:
   - In cloud/remote deployment, the Orchestrator connects to sub-agents via standard A2A JSON-RPC over HTTP using URLs from environment variables (`A2A_P1_URL`, etc.).
   - In local development or automated CI testing, when URLs are not configured, the client transparently routes to in-process sub-agent modules or a local runner, ensuring instant test execution.
2. **Hybrid SQLAlchemy Session Persistence**:
   - In production on Cloud Run, sessions are persisted to Cloud SQL (PostgreSQL 15) using `asyncpg`.
   - In local development and unit tests, the repository falls back to local SQLite (`sqlite+aiosqlite`) or in-memory storage, preserving complete API compatibility.

## Alternatives considered
### Alternative A: Strict Remote-Only A2A Client and PostgreSQL
- *Why it lost*: Severely degraded developer ergonomics and broke CI pipelines that do not have active GCP credentials or Cloud SQL proxies.

## Consequences
### Positive
- One-command local dev loop (`uv run pytest`) works out of the box.
- Cloud Run production service survives scale-to-zero during long human review pauses.
