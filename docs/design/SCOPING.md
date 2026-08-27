# Customer Scoping Document: Marketing Value Creator (MVC) v1.0

## Engagement metadata

- **Customer / project:** Nova Electronics Corp / Marketing Value Creator (MVC) v1.0
- **Forward Deployed Engineer (FDE):** Ryan Ahn (ryanahn@)   **Date:** 2026-08-27   **MVP target:** 2 weeks (Capstone Acceptance)
- **One-sentence success statement:** Compress Nova Electronics Corp's manual 4-to-6-week multi-channel campaign planning workflow into an interactive, multi-agent simulation taking under 15 seconds of compute with 100% brand safety and zero budget hallucination.

---

## Problem class and runtime shape

- **Problem class:** `agentic workflow`
- **Runtime shape:** `long-running`
- **Why this pair:** The system orchestrates 4 specialized sub-agents ([P1] Market Sensing, [P2] Strategy & Brief, [P3] Creative Content, [P4] Performance & Insights) sequentially, incorporating asynchronous Human-in-the-Loop (HITL) review pauses where marketers inspect, approve, or revise intermediate deliverables.

---

## Section A — Business outcome

1. **What outcome does this unlock that you can't achieve today?**
   Automates desk research, briefing cycles, visual concept generation, and multi-channel budget allocation into a unified simulation, removing 4–6 weeks of fragmented email and agency friction.
2. **Who specifically benefits, and how would they describe the benefit to a peer?**
   Regional Campaign Planners & Global Brand Communications (GBC) Marketing Leads. "I can test 5 different campaign angles and have complete executive-ready briefs, Imagen 3 visual mockups, and ROAS projections in minutes instead of waiting a month for an agency."
3. **What is the measurable success metric, and what is the baseline today?**
   - *Metric:* End-to-end DAG execution turnaround $< 15\text{s}$ (excluding human pause time); Golden eval dataset quality score $\ge 4.0 / 5.0$ (LLM-as-a-Judge); $100\%$ JSON schema compliance for P1, P2, P4.
   - *Baseline:* 4 to 6 weeks of manual cross-agency briefing, spreadsheet modeling, and subjective review.
4. **What have you already tried, what would a non-AI or off-the-shelf answer cost, and what does doing nothing cost?**
   - *Tried:* Single-prompt chat interfaces failed due to severe context dilution, inability to perform intermediate HITL revisions, and lack of visual generation.
   - *Alternative / Do-nothing:* Retaining external creative/media agencies costs \$250,000+ per major campaign cycle and delays time-to-market by over a month.
5. **How good does the output have to be — what accuracy makes this useful, what accuracy makes it worse than the status quo, and who adjudicates?**
   - *Useful at:* $\ge 4.0 / 5.0$ on Golden Eval; $100\%$ JSON schema validation; $100\%$ budget conservation (channel allocation percentages sum exactly to 100%).
   - *Worse than status quo at:* Hallucinated competitor specs, budget math errors, or brand voice violations.
   - *Adjudicator:* Engineering quantitative metrics standalone approval (automated CI/CD LLM-as-a-Judge $\ge 4.0/5.0$ and schema validation).
6. **What is the time horizon — when does this need to be in production?**
   Capstone evaluation delivery date: August 2026.

---

## Section B — Constraints

7. **Budget envelope — capex, opex, headcount?**
   - *Capex:* \$0.
   - *Opex:* Target ceiling of $\le \$0.10$ per campaign run. Measured actual: **\$0.0455 / run** (FinOps model in TDD §13). Monthly run rate: \$24.80 (500 runs/mo) to \$248.00 (5,000 runs/mo).
   - *Headcount:* 1 FDE Lead (Author & Implementer).
8. **What does the failure mode look like — worst output the system could produce?**
   Leaked internal system prompts via prompt injection, hallucinated competitor specs causing legal liability, or budget sum mismatch. Mitigated via Google Cloud Model Armor middleware, Pydantic v2 schemas, and deterministic budget normalization.
9. **Where does the source data live, who owns it, what is the data classification?**
   - *Location:* Public market trends, synthetic consumer benchmarks, and generated artifacts in GCS (`gs://mvc-artifacts-*`).
   - *Owner:* Nova Electronics Corp Marketing Operations.
   - *Classification:* `internal`. No real consumer PII is ingested or processed.
   - *Retention:* 30-day automated TTL lifecycle policy on both GCS artifacts and Cloud SQL session records.
10. **What integration must exist on day one (auth, identity, ticketing, CRM)?**
    - Google OAuth 2.0 OIDC bearer token verification on all Cloud Run API endpoints.
    - Google Cloud Storage for marketing image and JSON deliverables.
    - Cloud SQL (PostgreSQL 15) for session persistence across scale-to-zero events.
11. **Where must this run — region, VPC, data plane? Export controls?**
    - *Compute & Storage Region:* `asia-northeast3` (Seoul) via Direct VPC Egress (`asia-northeast3-subnet`).
    - *Foundation Model Endpoint:* Vertex AI `global` (pinned to avoid regional quota/model availability errors).
12. **What does the user experience as "fast", and what is the interaction shape?**
    - *First Response:* Time to First Token (TTFT) P95 $\le 2.0\text{s}$.
    - *Sub-Agent Turn Latency:* Text (P1, P2, P4) P95 $< 3.0\text{s}$; Visual image (P3) P95 $< 8.0\text{s}$.
    - *Interaction Shape:* Server-Sent Events (SSE) streaming (`POST /api/v1/campaigns`).
13. **What volume must it carry?**
    - Peak QPS: 0.5 QPS (MVP) / 2.5 QPS (Enterprise Scale).
    - Concurrent users: 10 concurrent campaign planners.
    - Session duration: Minutes to days (survives Cloud Run scale-to-zero via Cloud SQL).

---

## Section C — Operations

14. **Existing observability stack we must plug into?**
    Google Cloud Operations Suite: Cloud Trace (propagating `traceId`), Cloud Logging (structured JSON), and BigQuery Agent Analytics.
15. **Who carries the pager when this breaks at 03:00?**
    Automated Cloud Monitoring burn-rate alerts with Google Cloud Alert Policies; FDE engineering support team during active business hours.
16. **What is the eval set today? If none, who builds one with us?**
    Pre-configured Golden Evaluation Dataset ("Galaxy S27 Black Friday Global Campaign") stored in `agents/*/eval/datasets/golden-dataset.json`.
17. **Rollback / kill-switch story when output quality regresses?**
    - *Graceful Degradation:* Bounded 3-attempt exponential backoff retry. If Imagen 3 or sub-agent fails, returns structured placeholder asset and error envelope allowing marketer to approve or retry without aborting the session.
    - *Cloud Run Revisions:* Immediate zero-downtime traffic split rollback to previous revision.
    - *Model Armor:* Instant policy toggle to block emerging attack vectors.

---

## Section D — Definition of done

18. **Change-management cadence — how do new features ship?**
    - CI/CD via Google Cloud Build with an **Automated Dual Gate**: PRs require 100% pytest pass (unit & integration) AND Golden Eval quality score $\ge 4.0 / 5.0$ with zero schema drift.
    - Reproducible infrastructure provisioning via 100% Terraform IaC (`deployment/terraform/`).
19. **Six months from now, what does "this was a success" look like in one sentence?**
    Nova Electronics Corp marketing teams globally plan and simulate over 100 quarterly campaigns on MVC within 15 seconds each, reducing agency spend by 40% while upholding 100% brand guidelines.

---

## System context (C4 Level 1)

```mermaid
flowchart LR
    Marketer([Marketer / Campaign Planner]) -->|Google OAuth 2.0 OIDC| CloudRun["Cloud Run Service (asia-northeast3)<br>React SPA + FastAPI Orchestrator (Gemini 3.1 Pro)"]
    CloudRun <-->|A2A JSON-RPC Protocol| AgentRuntime["Agent Runtime Sub-Agents (asia-northeast3)<br>P1, P2, P4 (Gemini 3.5 Flash Lite) + P3 (Imagen 3)"]
    CloudRun <-->|State Persistence (30d TTL)| CloudSQL[("Cloud SQL (PostgreSQL 15)<br>orchestrator_sessions")]
    CloudRun & AgentRuntime <-->|Deliverable Storage (30d TTL)| GCS[("GCS Bucket<br>gs://mvc-artifacts-*")]
    CloudRun -.->|Prompt Sanitization| ModelArmor["Model Armor Service (global)"]
```

- **Actors:** Regional Marketing Planners, Brand Managers.
- **Systems it reads from:** Market trend inputs, session state in Cloud SQL, GCS deliverables.
- **Systems it writes to:** `orchestrator_sessions` table in Cloud SQL, marketing visuals & JSON in GCS.
- **Trust boundaries crossed:** Public internet to Cloud Run (secured by Google OAuth 2.0 OIDC), Cloud Run to Vertex AI / Agent Runtime (secured via Google IAM & Direct VPC Egress).

---

## In scope / out of scope (MVP Boundary)

| Capability | In / Out | Why |
| :--- | :---: | :--- |
| **Multi-Agent Campaign DAG (P1 $\to$ P2 $\to$ P3 $\to$ P4)** | **In** | Core product outcome: automated campaign briefing. |
| **Structured Deliverables (JSON & Image)** | **In** | Validated via Pydantic schemas in `src/schemas/`. |
| **Interactive HITL Revision Gates (`approve` / `revise`)** | **In** | Enables real-time human control and feedback loops. |
| **Enterprise Security (Google OAuth + Model Armor)** | **In** | Prevents prompt injection and unauthorized access. |
| **Scale-to-Zero State Persistence (Cloud SQL)** | **In** | Ensures session continuity across long marketer review pauses. |
| **Live Media Buying / AdTech DSP Execution** | **Out — post-MVP** | Strictly simulated sandbox for MVP; automated ad spend deferred. |
| **Consumer PII Ingestion** | **Out — never** | No personal consumer data processed; brand compliance mandate. |
| **Legacy ERP / SAP Connectors** | **Out — post-MVP** | Deferred to enterprise scale rollout. |
| **Non-Google SSO (Okta, SAML 2.0)** | **Out — post-MVP** | Google OAuth 2.0 OIDC only for MVP. |

---

## Stakeholder map (RACI)

| Stakeholder | Role | Architecture | Security sign-off | Go-live | Budget |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Ryan Ahn (ryanahn@)** | FDE Lead / Author | **R** | C | **R** | C |
| **Google Cloud Evaluator / Tech Lead** | Evaluator / Tech Lead | **A** | C | **A** | I |
| **Google Cloud FDE Engineering Manager** | FDE Engineering Manager | I | C | **A** | **A** |
| **Google Cloud Security Lead** | Security / IAM Lead | C | **A** | C | I |
| **Executive Sponsor (Nova Electronics GBC)** | Business Sponsor | C | I | C | C |
| **Regional Campaign Planners** | End Users | I | I | I | I |

---

## Non-Functional Specification

### Latency
- **Perceived Speed:** Time to First Token P95 $\le 2.0\text{s}$ `confirmed`
- **Sub-Agent Turn Latency:** P1, P2, P4 P95 $< 3.0\text{s}$; P3 (Image) P95 $< 8.0\text{s}$ `confirmed`
- **Total E2E DAG Turnaround:** P95 $< 15.0\text{s}$ (excluding human pause time) `confirmed`
- **Interaction Shape:** Server-Sent Events (SSE) streaming `confirmed`
- **Measured by:** Integration test suite (`tests/integration/test_mvc_campaign_e2e.py`) on 2026-08-27

### Quality
- **Target Metric:** Golden Eval dataset quality score $\ge 4.0 / 5.0$ (LLM-as-a-Judge) `confirmed`
- **Schema Conformance:** $100\%$ JSON schema validation for P1, P2, P4 deliverables `confirmed`
- **Budget Conservation:** $100.0\%$ exact channel budget allocation math `confirmed`
- **Floor:** Hallucinated competitor specs or budget deviation $> 0\%$ `confirmed`
- **Adjudicator:** Automated CI/CD evaluation runner `confirmed`

### Eval Rigor
- **Stakes Tier:** `standard` `confirmed` (Workload produces marketing drafts; errors are recoverable before public release; internal marketing audience)
- **Maturity Stage:** `pilot`
- **Auto-Accept Permitted:** Yes, on paths where unit tests and golden eval scores meet thresholds `confirmed`
- **Human Review Coverage:** $100\%$ during interactive campaign simulation review gates `confirmed`
- **Eval Set Owner:** Ryan Ahn (FDE Lead) `confirmed`

### Scale
- **Peak QPS:** 0.5 QPS (MVP) / 2.5 QPS (Enterprise Scale) `confirmed`
- **Concurrent Users:** 10 active campaign planners `confirmed`
- **Per-Session Shape:** 4 turns per session, $\sim 1,500$ input tokens, $\sim 800$ output tokens per turn `confirmed`

### Cost
- **Unit Economics:** **$0.0455 per campaign run** `confirmed`
- **Per-Request Target Ceiling:** $\le \$0.10$ `confirmed`
- **Monthly Run Rate:** \$24.80 / mo (500 runs) to \$248.00 / mo (5,000 runs) `confirmed`
- **FinOps Owner:** Ryan Ahn (FDE Lead)

### Residency & Data Plane
- **Compute & Storage Region:** `asia-northeast3` (Seoul) `confirmed`
- **Model Endpoint:** Vertex AI `global` `confirmed`
- **Network Posture:** Direct VPC Egress via `asia-northeast3-subnet` `confirmed`
- **Data Classification:** `internal` `confirmed`

### Reliability Intent
- **Availability Target:** $99.5\%$ (28-day error budget: 201.6 min) `confirmed`
- **Kill-switch / Rollback:** Cloud Run traffic shifting to previous revision; Model Armor rule updates `confirmed`

---

## Assumptions Register

| # | Assumption | Why it matters (what breaks if false) | Owner | Validate by | Status |
| :-: | :--- | :--- | :--- | :---: | :---: |
| 1 | Vertex AI `global` endpoint provides $>33\times$ RPM headroom for Gemini 3.5 Flash Lite | Quota throttling under concurrent simulation load | Ryan Ahn | 2026-08-27 | **validated** |
| 2 | Model Armor latency remains under 200ms per prompt | Violates P95 < 2s Time to First Token SLO | Ryan Ahn | 2026-08-27 | **validated** |
| 3 | Marketers pause between 2 minutes and 24 hours per review stage | Cloud Run scales to zero; requires Cloud SQL session recovery | Ryan Ahn | 2026-08-27 | **validated** |
| 4 | Synthetic market benchmarks are sufficient for MVP simulation | Real consumer PII would trigger high-stakes regulated compliance | Ryan Ahn | 2026-08-27 | **validated** |

---

## Scope-Freeze One-Pager

### Project: Marketing Value Creator (MVC) v1.0 — MVP Scope Freeze

**Date:** 2026-08-27   **Signatories:** Executive Sponsor (Nova Electronics), FDE Engineering Manager (Google Cloud), Ryan Ahn (FDE Lead)

#### 1. Success Statement
Compress Nova Electronics Corp's manual 4-to-6-week multi-channel campaign planning workflow into an interactive, multi-agent simulation taking under 15 seconds of compute with 100% brand safety and zero budget hallucination.

#### 2. In Scope (MVP)
- **Multi-Agent Sequential DAG**: Autonomous execution of [P1] Market Sensing $\to$ [P2] Strategy & Brief $\to$ [P3] Creative Content $\to$ [P4] Performance & Insights.
- **Strict Structured Deliverables**: P1, P2, P4 output schema-validated JSON; P3 generates Imagen 3 marketing visual image saved to GCS.
- **Human-in-the-Loop Review Gates**: Marketers inspect outputs via Web UI and submit text feedback or approve progression.
- **Enterprise Security**: Google OAuth 2.0 OIDC token verification on all API requests; Google Cloud Model Armor prompt sanitization; Direct VPC Egress.
- **Scale-to-Zero State Persistence**: Cloud SQL (PostgreSQL 15) session store managing multi-turn state across idle pauses.
- **100% Terraform IaC & Golden Eval**: Full infrastructure as code in `asia-northeast3` with automated CI/CD eval gating.

#### 3. Out of Scope (MVP) — Explicit
- **Live Media Buying / DSP Execution**: *Revisit post-MVP* (strictly simulated sandbox for MVP).
- **Customer PII Processing**: *Explicitly never* (synthetic benchmarks and public data only).
- **Legacy ERP/SAP Connectors**: *Revisit post-MVP*.
- **Non-Google SSO**: *Revisit post-MVP* (Google OAuth 2.0 only for MVP).

#### 4. Non-Functional Commitments (`confirmed`)
- **End-to-End DAG Compute Turnaround:** P95 $\le 15.0\text{s}$
- **Sub-Agent Turn Latency:** P95 $\le 3.0\text{s}$ (text), P95 $\le 8.0\text{s}$ (image)
- **Quality Score:** Golden Eval quality score $\ge 4.0 / 5.0$ (LLM-as-a-Judge); $100\%$ JSON schema compliance; $100.0\%$ budget conservation
- **Unit Cost:** $\le \$0.10$ ceiling per run (measured: **\$0.0455 / run**)
- **Target Availability:** $99.5\%$ availability
- **Data Retention:** 30-day automated TTL lifecycle policy on GCS and Cloud SQL

#### 5. Eval Rigor
- **Tier:** `standard`   **Auto-accept:** Yes, on paths where CI test suite passes and eval score $\ge 4.0 / 5.0$   **Eval Owner:** Ryan Ahn (FDE Lead)

#### 6. Architecture Pattern
- **Pattern:** Centralized Orchestrator (FastAPI on Cloud Run) coordinating 4 specialized sub-agents deployed to Agent Runtime via A2A protocol.
- **Rejected:** Monolithic single prompt (lost due to context loss and lack of step-by-step review); Uniform Gemini Pro everywhere (lost due to 3x cost inflation and latency budget violation).

#### 7. MVP Exit Gates
1. `tests/integration/test_mvc_campaign_e2e.py` passes 100% on golden scenario ("Galaxy S27 Black Friday Global Campaign").
2. Golden evaluation dataset achieves $\ge 4.0 / 5.0$ overall quality score via `agents-cli eval`.
3. 100% Terraform infrastructure deployment passes clean apply in `asia-northeast3`.

#### 8. Change-Request Process
Any change to in/out-of-scope capabilities or to a confirmed non-functional commitment requires a written Change Request (CR) approved by the signatories above.
