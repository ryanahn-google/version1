# ADR-0003: Dual-Mode A2A Client and Hybrid Session Persistence

- **Status**: Accepted
- **Date**: 2026-08-27
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](../design/TDD.md)

## Context
The Orchestrator coordinates 4 sub-agents deployed to Agent Runtime and needs to persist multi-turn HITL campaign sessions across Cloud Run scale-to-zero events.
Developers also require a rapid local development and test loop (`pytest`, local FastAPI server) without mandatory reliance on 4 concurrently running cloud or local processes.

## Decision
1. **Dual-Mode A2A Client**:
   - In cloud/remote deployment, the Orchestrator connects to sub-agents via standard A2A JSON-RPC over HTTP using URLs from environment variables (`A2A_P1_URL`, etc.).
   - In local development or automated CI testing, when URLs are not configured, the client transparently routes to in-process sub-agent modules or a local runner, ensuring instant test execution.
2. **Hybrid SQLAlchemy Session Persistence**:
   - In production on Cloud Run, sessions are persisted to Cloud SQL (PostgreSQL 15) using `asyncpg` over Cloud SQL Auth Proxy Unix domain sockets.
   - In local development and unit tests, the repository falls back to local SQLite (`sqlite+aiosqlite`) or in-memory storage, preserving complete API compatibility.
3. **Database Transient Fault Retry Policy (`@db_retry`)**:
   - All 8 database query methods in `SessionRepository` (`app/orchestrator/session_repo.py`) are decorated with `@db_retry`.
   - Traps transient `OperationalError` and `DBAPIError` (e.g. Cloud SQL Auth Proxy socket resets, connection pool timeouts, transient PostgreSQL locks).
   - Configured with bounded exponential backoff and jitter (`attempts=3, initial_delay=0.5s, backoff_factor=2.0, max_delay=5.0s, jitter=0.5s`), preventing cascading 500 errors during proxy maintenance.
4. **Resilient A2A Protocol Invocation with HTTP Backoff & Jitter**:
   - Both remote HTTP JSON-RPC and local fallback execution in `A2ASubAgentClient` enforce `HttpRetryOptions` with exponential backoff and jitter, ensuring network blips between Cloud Run and Agent Runtime do not fail the campaign DAG.

## Alternatives considered
### Alternative A: Strict Remote-Only A2A Client and PostgreSQL
Require live A2A remote endpoints and active Cloud SQL connection for all local test runs.
- *Why it lost*: Severely degraded developer velocity, created network flakiness in CI pipelines, and prohibited offline development without active GCP credentials.

### Alternative B: Standalone Redis / Memorystore Cache Tier
Deploy Cloud Memorystore (Redis) as the session persistence tier.
- *Why it lost*: Incurred continuous baseline idle costs ($35+/mo) incompatible with scale-to-zero FinOps goals, and required complex secondary relational syncing to query historical campaign deliverables.

## Consequences
### Positive
- One-command local dev loop (`uv run pytest`) executes in seconds with zero cloud setup.
- Cloud Run production service survives scale-to-zero events during long human review pauses.
- Identical repository interface across SQLite and PostgreSQL prevents dual-implementation drift.

### Negative / accepted trade-offs
- SQLAlchemy schemas must adhere strictly to ANSI SQL / cross-dialect compatibility (e.g. JSON columns stored as text in SQLite and native JSONB in PostgreSQL).
- Local mocks must be actively maintained to reflect remote Agent Runtime A2A payload changes.

### Risks (and mitigations)
- Database schema drift between SQLite and PostgreSQL $\to$ Unit tests run on SQLite, CI load tests run on PostgreSQL in Cloud Run Staging.

## Conditions to revisit
- If concurrent active campaign planning sessions exceed 500 simultaneous write operations per second, consider adding a write-behind Redis buffer or Cloud Spanner.
- If A2A client transitions from HTTP JSON-RPC to gRPC streaming.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [ADR-0001](0001-ai-multi-agent-pattern.md)
- [ADR-0005](0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md)

## Changelog
- 2026-08-27: Initial proposal and acceptance.
- 2026-09-02: Added Database Transient Fault Retry (`@db_retry`) and Resilient A2A HTTP Backoff & Jitter policy.
