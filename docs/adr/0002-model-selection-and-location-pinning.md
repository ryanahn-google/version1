# ADR-0002: Hybrid Model Selection and Agent Platform Global Endpoint Pinning

- **Status**: Accepted
- **Date**: 2026-08-27
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](../design/TDD.md)

## Context
MVC requires balancing high-level orchestration reasoning, sub-agent structured task throughput, image generation quality, and latency/cost SLOs.
GCP resources are regionally deployed in `asia-northeast3` (Seoul) for data residency and network locality, but latest generative models have specific endpoint availability.

## Decision
1. **Root Orchestrator & Eval**: Pinned to `gemini-3.1-pro-preview` / `gemini-3.1-pro` (configured as `gemini-3.1-pro-preview` in `app/agent.py:27` and `tests/eval/e2e_campaign_evaluator.py:48`, exposed as `gemini-3.1-pro` in system metadata) for complex intent classification, state transitions, and LLM-as-a-Judge evaluation.
2. **Text Sub-Agents (P1, P2, P4)**: Pinned to `gemini-3.5-flash-lite` for high throughput, strict JSON schema conformance, low latency (<3.0s turn), and cost efficiency ($0.003-$0.004 per turn).
3. **Creative Visual Sub-Agent (P3)**: Executes a self-contained 2-step sequential generation pipeline entirely within the `creative_content` subagent: Step 3a uses `gemini-3.5-flash-lite` to translate strategy briefs into ad copy and studio-grade 16:9 photographic prompts; Step 3b calls **Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`)** via native Gemini `generate_content` at `location="global"` to synthesize the high-resolution image asset and persist it to hybrid storage. (Replaced deprecated Imagen models scheduled for August 17, 2026 shutdown).
4. **Location Pinning**: Agent Platform model API calls are explicitly directed to `location="global"` endpoint to avoid regional 404/quota errors, while Cloud Run and Agent Runtime infrastructure remain in `asia-northeast3`.
5. **Multi-Tier Model Fallback Strategy (`FallbackGemini`)**:
   - **Root Orchestrator**: Primary model `gemini-3.1-pro-preview`, with transparent failover to secondary fallback `gemini-2.5-pro` wrapped in composite `BaseLlm` (`app/models_fallback.py`).
   - **Subagents ([P1], [P2], [P4])**: Primary model `gemini-3.5-flash-lite`, with transparent failover to secondary fallback `gemini-2.5-flash` in local agent execution (`app/orchestrator/a2a_client.py`).
   - Guarantees high availability during regional model quota spikes, rate limits (429), or 503 backend service interruptions.
6. **Centralized HTTP Retry Policy with Exponential Backoff & Jitter**:
   - Integrated `get_default_http_retry_options()` (`app/retry_policy.py`) across Root Orchestrator and all 4 subagents using `google.genai.types.HttpRetryOptions`.
   - Settings: `attempts=3, initial_delay=1.0s, max_delay=10.0s, exp_base=2.0, jitter=1.0`, targeting transient status codes `[408, 429, 500, 502, 503, 504]`.
7. **Asynchronous Non-Blocking Creative Visual Retry Loop**:
   - [P3] Creative visual generation (`synthesize_nano_banana_image`) executes via non-blocking `client.aio.models.generate_content` with a 2-attempt retry loop (`attempts=2, timeout=25.0s, backoff_base=2.0, jitter=1.0s`), ensuring image synthesis never blocks the main asyncio event loop and GCS persistence runs via `asyncio.to_thread`.

## Alternatives considered
### Alternative A: Uniform Gemini 3.1 Pro Across All Agents
- *Why it lost*: Sub-agent latency exceeded P95 <3.0s budget and inflated unit cost per run by ~3x without tangible benefit for structured JSON generation.

### Alternative B: Open-Source Models on GKE / Agent Platform Endpoints
- *Why it lost*: High infrastructure management overhead, cold starts, and higher idle cost during low QPS.

## Consequences
### Positive
- Predictable unit economics ($0.0455 per campaign execution).
- P95 latency guarantees met across all agent turns.
- Elimination of regional model endpoint 404 errors.

### Negative / accepted trade-offs
- Model inference traffic exits `asia-northeast3` to Agent Platform `global` endpoints over Google private backbone.
- Two distinct foundation models managed across text and visual pipelines.

### Risks (and mitigations)
- Global endpoint quota contention $\to$ Managed via Dynamic Shared Quota (DSQ) with exponential backoff retry policy.
- Model deprecation cycles $\to$ 30-day model swap runbook ([docs/runbooks/model-swap.md](../runbooks/model-swap.md)) with eval regression gating.

## Conditions to revisit
- If Agent Platform releases regional endpoints for Gemini 3.5 / Nano Banana 2 Lite in `asia-northeast3`.
- If new foundation model release reduces unit cost or latency by $>30\%$ on golden eval suite.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [docs/EVAL.md](../EVAL.md)
- [docs/runbooks/model-swap.md](../runbooks/model-swap.md)

## Changelog
- 2026-08-27: Initial model selection and location pinning.
- 2026-08-29: Replaced deprecated Imagen with Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`).
- 2026-09-02: Added Multi-Tier Model Fallback (`FallbackGemini`), Centralized HTTP Backoff & Jitter Retry Policy, and Async Nano Banana 2 Lite 2-attempt retry loop.
