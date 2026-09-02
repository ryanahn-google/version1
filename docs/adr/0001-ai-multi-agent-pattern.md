# ADR-0001: Multi-Agent Campaign DAG Orchestration via A2A over Agent Runtime and Cloud Run

- **Status**: Accepted
- **Date**: 2026-08-27
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](../design/TDD.md)

## Context
Marketing Value Creator (MVC) requires a multi-stage campaign planning pipeline (Market Sensing -> Strategy & Brief -> Creative Content -> Performance & Insights) with Human-in-the-Loop (HITL) review gates.
The sub-tasks require specialized domain prompts, different foundation models (Gemini 3.5 Flash Lite vs Nano Banana 2 Lite), and strict boundary separation.
Additionally, enterprise governance requires A2A (Agent-to-Agent) interoperability, auditability, and independent lifecycle management.

## Decision
We will decouple the system into:
1. **Four Independent Sub-Agents ([P1]~[P4])**: Implemented as modular Google ADK agents and deployed to Google Cloud Agent Runtime via `agents-cli`. Each agent exposes standard A2A JSON-RPC endpoints and is configured via `agents-cli-manifest.yaml` (`app/agents/*/agents-cli-manifest.yaml`, target: `agent_runtime`, `is_a2a: true`).
2. **Centralized FastAPI Orchestrator on Cloud Run**: Serves the React SPA, enforces Google OAuth 2.0 and Model Armor sanitization, and orchestrates the sub-agents via standard A2A protocol client calls with HITL pause/approval states.

## Alternatives considered
### Alternative A: Monolithic Single-Container In-Process Agents
Embed all sub-agents inside the same FastAPI process without separate Agent Runtime deployments.
- *Why it was attractive*: Zero network overhead, simpler local debugging.
- *Why it lost*: Violates enterprise governance separation, lacks independent scaling/deployment on Agent Runtime, and does not test genuine A2A Agent Runtime capabilities required by the capstone rubric.

### Alternative B: Direct LLM Function Calling Chain without Agents
Chain direct Gemini API calls with function calling inside FastAPI.
- *Why it lost*: High prompt degradation, no standardized agent card discovery, lack of modular evaluation for individual domain tasks.

## Consequences
### Positive
- Strict domain isolation and modular golden dataset evaluation for each sub-agent.
- Full A2A protocol compliance and Agent Registry integration.
- Independent scaling and resource allocation on Agent Runtime.

### Negative / accepted trade-offs
- Network serialization and latency between Cloud Run Orchestrator and Agent Runtime sub-agents.
- Need for robust retry policies and circuit breaking over A2A JSON-RPC.
- Model Armor template (`version1-guardrails` in `deployment/terraform/cicd/model_armor.tf`) actively enforces prompt injection and jailbreak filters (`LOW_AND_ABOVE`), malicious URI filtering, Responsible AI (RAI) filters, and Sensitive Data Protection (SDP/PII) basic enforcement; defense-in-depth is maintained across both infrastructure inspection and application-layer Pydantic validation schemas.
- Root orchestrator telemetry retains service name "v1" (`OTEL_SERVICE_NAME = "v1"`) matching pre-deployed Cloud Logging sinks (`service_name="v1"`), while subagents use "version1-{agent_name}".

### Risks (and mitigations)
- Remote A2A endpoint availability -> Implement exponential backoff retries and structured error envelopes.
- Local dev loop complexity -> Provide local A2A mock/stub or multi-agent local runner configuration.

## Conditions to revisit
- If Agent Runtime network latency P95 exceeds 2.0s per turn, evaluate VPC Service Controls / Direct VPC peering or local agent co-location.
- If A2A specification undergoes breaking protocol changes.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [docs/design/SCOPING.md](../design/SCOPING.md)
- Google Agent Development Kit (ADK) A2A Communication Specification

## Changelog
- 2026-08-27: Initial proposal and acceptance.
