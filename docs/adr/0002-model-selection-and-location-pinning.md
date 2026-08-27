# ADR-0002: Hybrid Model Selection and Vertex AI Global Endpoint Pinning

- **Status**: Accepted
- **Date**: 2026-08-27
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](docs/design/TDD.md)

## Context
MVC requires balancing high-level orchestration reasoning, sub-agent structured task throughput, image generation quality, and latency/cost SLOs.
GCP resources are regionally deployed in `asia-northeast3` (Seoul) for data residency and network locality, but latest generative models have specific endpoint availability.

## Decision
1. **Root Orchestrator & Eval**: Pinned to `gemini-3.1-pro` for complex intent classification, state transitions, and LLM-as-a-Judge evaluation.
2. **Text Sub-Agents (P1, P2, P4)**: Pinned to `gemini-3.5-flash-lite` for high throughput, strict JSON schema conformance, low latency (<3.0s turn), and cost efficiency ($0.003-$0.004 per turn).
3. **Creative Visual Sub-Agent (P3)**: Pinned to `imagen-3.0-generate-002` + `gemini-3.5-flash-lite` for prompt translation and high-resolution campaign asset generation.
4. **Location Pinning**: Vertex AI model API calls are explicitly directed to `location="global"` endpoint to avoid regional 404/quota errors, while Cloud Run and Agent Runtime infrastructure remain in `asia-northeast3`.

## Alternatives considered
### Alternative A: Uniform Gemini 3.1 Pro Across All Agents
- *Why it lost*: Sub-agent latency exceeded P95 <3.0s budget and inflated unit cost per run by ~3x without tangible benefit for structured JSON generation.

### Alternative B: Open-Source Models on GKE / Vertex AI Endpoints
- *Why it lost*: High infrastructure management overhead, cold starts, and higher idle cost during low QPS.

## Consequences
### Positive
- Predictable unit economics ($0.0455 per campaign execution).
- P95 latency guarantees met across all agent turns.
- Elimination of regional model endpoint 404 errors.

### Conditions to revisit
- If Vertex AI releases regional endpoints for Gemini 3.5 / Imagen 3 in `asia-northeast3`.
