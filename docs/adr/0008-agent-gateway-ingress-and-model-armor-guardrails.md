# ADR-0008: Agent Gateway Ingress and Model Armor Inline Guardrails

- **Status**: Superseded (Direct A2A with Orchestrator Model Armor Adopted)
- **Date**: 2026-08-31
- **Deciders**: Ryan Ahn (FDE Lead), Enterprise Security Lead
- **Related**: [docs/design/TDD.md](../design/TDD.md), [deployment/terraform/cicd/model_armor.tf](../../deployment/terraform/cicd/model_armor.tf), [app/orchestrator/security.py](../../app/orchestrator/security.py)

> [!NOTE]
> **Implementation Update (2026-08-31)**: During infrastructure apply, Google Cloud's `AgentGateway` resource endpoint returned `Error 501: unimplemented` on the regional control plane in `asia-northeast3` (preview feature not yet implemented server-side in the public control plane). Consequently, `AgentGateway` and Service Extensions IaC definitions were cleanly removed from Terraform. Zero-trust guardrails are enforced directly via Model Armor at the Cloud Run Orchestrator edge (`app/orchestrator/security.py`) and subagents use SPIFFE-based Agent Identity with direct A2A communication.

## Context
Marketing Value Creator (MVC) deploys four domain-specialized subagents ([P1] Market Sensing, [P2] Strategy & Brief, [P3] Creative Content, [P4] Performance & Insights) to Vertex AI Agent Runtime (Reasoning Engine) in `asia-northeast3` (Seoul). The central Cloud Run Orchestrator coordinates campaign execution by invoking these subagents via the Agent-to-Agent (A2A) protocol.

To enforce zero-trust security and data privacy across agent boundaries, inbound prompts and outbound deliverables must be screened against enterprise security policies. While application-layer sanitization was previously implemented in the Orchestrator (`app/orchestrator/security.py`), enterprise governance requires a non-bypassable, platform-managed network perimeter that inspects payload content directly before it reaches agent execution environments.

Furthermore, Google Cloud Model Armor regional availability poses a trade-off: `asia-northeast3` provides ultra-low latency for Korean enterprise users and fully supports Sensitive Data Protection (SDP), but prompt injection and jailbreak filters require cross-jurisdictional routing that introduces 100–200ms of additional network RTT.

## Decision
We adopt a **Client-to-Agent (Ingress) Agent Gateway with Regional Model Armor and Defense-in-Depth Guardrails**:

1. **Agent Gateway Ingress (`CLIENT_TO_AGENT`) in `asia-northeast3`**:
   - Provision a Google-managed Agent Gateway (`${var.project_name}-gateway`) in `asia-northeast3` via Terraform (`deployment/terraform/cicd/gateway.tf`).
   - The gateway intercepts all inbound calls from the Cloud Run Orchestrator to Agent Runtime subagents.

2. **Model Armor Content Authorization Extension (`CONTENT_AUTHZ`)**:
   - A Service Extensions Authz Extension connects the gateway to the regional Model Armor REP (`modelarmor.${var.region}.rep.googleapis.com`).
   - A Network Security Authz Policy binds the extension to the gateway under a content-based authorization profile (`CONTENT_AUTHZ`).
   - The policy operates in **Fail-Closed** mode (`fail_open = false`, action `CUSTOM`), terminating requests immediately upon policy violations.

3. **Defense-in-Depth Strategy & Regional Pinning**:
   - **Network/Gateway Layer (Data Loss Prevention)**: The regional Model Armor template (`${var.project_name}-guardrails`) enforces **Sensitive Data Protection (`sdp_settings`)** natively in `asia-northeast3`, preventing exfiltration of PII (SSN, credit cards, emails) and confidential enterprise data with zero cross-region latency penalty.
   - **Application Layer (Injection & Jailbreak Defense)**: The Cloud Run Orchestrator (`app/orchestrator/security.py`) enforces prompt boundaries, schema validation, and heuristic pattern filtering at the API edge before DAG execution or session state initialization.

4. **Modality & Payload Isolation**:
   - Agent Gateway inspects structured text prompts and JSON deliverables (`MarketSensingDeliverable`, `CampaignBriefDeliverable`, `PerformanceInsightsDeliverable`, and [P3] creative copy metadata).
   - Generated binary visual assets (PNG/JPEG) produced by [P3] are uploaded directly to Google Cloud Storage (`gs://{project_id}-version1-artifacts/`) via authenticated IAM credentials, bypassing gateway serialization overhead.

5. **Agent Identity & Automated Deployment Pipeline**:
   - All subagents deployed to Agent Runtime are provisioned with SPIFFE-based **Agent Identity** (`--agent-identity`), enabling cryptographic attestation and binding via `--agent-gateway-ingress`.
   - Deployment logic is standardized in a modular script (`scripts/deploy_subagents.sh`) invoked by Cloud Build in `.cloudbuild/staging.yaml` and `deploy-to-prod.yaml`.

6. **Error Propagation & Client Resilience**:
   - `A2ASubAgentClient` catches HTTP 400/403 responses bearing Model Armor violation signatures and translates them into a localized `HTTPException(400, "보안 가드레일(Model Armor) 정책에 의해 요청이 차단되었습니다...")`, pausing the campaign session with a clear audit record.

## Alternatives Considered

### Alternative A: Cross-Region Model Armor in `us-central1`
Deploy Model Armor templates in `us-central1` to access prompt injection filters.
- *Why it lost*: Agent Gateway requires regional co-location with its Model Armor template. Moving the gateway or routing cross-region introduces substantial round-trip latency (>150ms) and violates enterprise data residency in South Korea.

### Alternative B: Pure Application-Layer Guardrails (No Gateway)
Continue relying solely on `SecurityManager._call_model_armor_api()` in FastAPI.
- *Why it lost*: Application-layer checks can be bypassed by internal lateral movement or direct service-to-service calls, and fail to provide centralized audit logging across the agent fleet.

### Alternative C: Inline Binary Inspection for Image Deliverables
Route raw image bytes through Agent Gateway and Model Armor.
- *Why it lost*: Model Armor regional template integrations support text and JSON only. Encoding binary assets into JSON payloads creates significant memory buffering and latency overhead.

## Consequences

### Positive
- **Zero-Bypass Perimeter**: All traffic into Agent Runtime subagents is governed at the infrastructure tier by Google-managed Agent Gateway.
- **Ultra-Low Latency**: Keeping all resources co-located in `asia-northeast3` avoids cross-region hops.
- **Fail-Closed Protection**: Policy violations are immediately blocked before LLM compute or tool execution occurs.
- **Clean Separation of Concerns**: Infrastructure protects against data leakage; application logic protects against prompt manipulation.

### Negative / Accepted Trade-offs
- Subagents deployed without Agent Identity must be recreated upon initial gateway adoption.
- Model Armor Service Extensions DEP service agent requires specific IAM role bindings (`roles/modelarmor.calloutUser`, `roles/modelarmor.user`, `roles/serviceusage.serviceUsageConsumer`).

### Risks (and mitigations)
- Service Extension timeout $\to$ Authz extension timeout configured to `5s` with fail-closed enforcement.
- Agent Identity propagation delay $\to$ `scripts/deploy_subagents.sh` introduces pacing and error handling during sequential deployment.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [deployment/terraform/cicd/gateway.tf](../../deployment/terraform/cicd/gateway.tf)
- [deployment/terraform/cicd/model_armor.tf](../../deployment/terraform/cicd/model_armor.tf)
- [scripts/deploy_subagents.sh](../../scripts/deploy_subagents.sh)
- Google Cloud Agent Gateway Documentation: `go/agent-gateway-ug`

## Changelog
- 2026-08-31: Initial proposal and acceptance.
