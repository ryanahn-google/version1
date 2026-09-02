# ADR-0009: Agent Platform Hybrid Evaluation and Two-Stage Deployment Quality Gate

- **Status**: Accepted
- **Date**: 2026-08-31
- **Deciders**: Ryan Ahn (FDE Lead), Engineering Approver
- **Related**: [docs/EVAL.md](../EVAL.md), [docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md](0004-multi-project-cicd-pipeline-and-approval-gate.md)

## Context
The Marketing Value Creator (MVC) multi-agent platform coordinates 4 domain-specialized subagents ([P1] Market Sensing, [P2] Strategy Brief, [P3] Creative Content, [P4] Performance Insights) through a sequential DAG with human-in-the-loop (HITL) review gates.
To maintain high marketing quality and prevent regression before releases reach production, an automated evaluation system and deployment quality gate are required.

Key considerations:
1. **Subagent Specialization**: Subagents output diverse deliverable formats—P1/P2 output deep qualitative text analyses, P3 outputs ad copy and visual prompt synthesis for Imagen 3, and P4 outputs strict mathematical budget allocations. A single evaluation metric cannot adequately grade all subagents.
2. **Multi-Agent DAG with HITL Gates**: The Orchestrator pauses at each stage transition for marketer review (`PAUSED_FOR_REVIEW`). Evaluating the entire system end-to-end requires driving this state machine programmatically without requiring manual human clicks during CI/CD.
3. **CI/CD Latency vs. Thoroughness**: Running expensive multimodal LLM evaluations on every git commit slows developer iteration. However, skipping rigorous Agent Platform evaluation before promoting to production risks deploying defective models or regressed prompts.

## Decision
We implement a **Hybrid Evaluation Architecture with a Two-Stage Deployment Quality Gate**:

1. **Hybrid Subagent Evaluation on Agent Platform Agent Platform**:
   - **Deterministic Code Metrics**: 100% Pydantic schema conformance (`pydantic.BaseModel` validation) and 100.0% budget conservation (channel allocation percentages summing strictly to 100.0%).
   - **LLM-as-a-Judge**: Managed rubrics executed via `gemini-3.1-pro` on Agent Platform (1.0 to 5.0 scale) assessing strategic relevance, brand alignment, tone adherence, and absence of hallucination.

2. **Synthetic Marketer E2E Evaluation**:
   - An automated simulation runner acts as a Synthetic Marketer, invoking Orchestrator REST/SSE endpoints, inspecting intermediate stage deliverables, injecting review approvals and deliverable updates, and verifying full DAG lifecycle completion.

3. **Two-Stage CI/CD Deployment Quality Gate**:
   - **Stage 1 (PR Gate - `pr_checks.yaml`)**: Fast in-process unit and deterministic schema evaluation to block breaking structural regressions on pull requests.
   - **Stage 2 (Pre-Prod Gate - `staging.yaml`)**: Against the deployed Staging environment, execute the full synthetic golden dataset (10 scenarios: 5 flagship, 3 edge cases, 2 guardrail probes) on Agent Platform Agent Platform.
   - **Blocking Criteria**: Release promotion to production is halted if:
     - Any JSON deliverable fails schema validation (P0).
     - Performance insights budget allocation does not sum to 100.0% (P0).
     - Average LLM judge score is below 4.0 / 5.0 (P1).
     - Average score regresses by > 0.2 points relative to the baseline (P1).

## Consequences

### Positive
- Prevents silent prompt or model drift from reaching production.
- Decouples fast developer feedback on PRs from thorough pre-production quality gating.
- Realistic verification of multi-agent state persistence and review gate transitions.

### Negative / Accepted Trade-offs
- Staging build duration increases by ~2–3 minutes to execute the 10-scenario golden evaluation suite against Agent Platform Agent Platform.
- Agent Platform Gemini 3.1 Pro token consumption during CI/CD eval runs.
