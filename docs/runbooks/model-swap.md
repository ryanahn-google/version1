# 30-Day Model-Swap Runbook: Marketing Value Creator (MVC)

> Standard operating procedure for swapping foundation models in MVC (e.g. Gemini 3.5 Flash Lite or Nano Banana 2 Lite upgrades) without customer-facing disruption, regression, or downtime.

---

## 1. Overview & Swap Specification

- **Current Models**:
  - Root Orchestrator & Judge: `gemini-3.1-pro`
  - Text Sub-Agents (P1, P2, P4): `gemini-3.5-flash-lite`
  - Creative Visual Sub-Agent (P3): `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite)
- **Target Candidate**: `<Candidate Model ID>`
- **Swap Owner**: Ryan Ahn (ryanahn@, FDE Lead)
- **Rollback Mechanism**:
  - Primary: Cloud Run revision traffic split rollback in Cloud Run Console.
  - Secondary: Environment variable update (`DEFAULT_MODEL` / `A2A_MODEL_VERSION`) and container redeploy.
- **Rollback Availability Window**: Opens at Day 1; closes on final decommission (Day 30).

---

## 2. 30-Day Execution Calendar

### Phase 1: Announce, Calibrate & Baseline (Day 1–5)
- [ ] Draft release notes and communicate swap timeline to Nova Electronics Corp marketing stakeholders.
- [ ] **Judge Independence Verification**: Confirm the evaluation judge model (`gemini-3.1-pro`) is independent from the candidate model family to prevent self-preference evaluation bias.
- [ ] Execute current model baseline on Golden Evaluation Dataset (`app/agents/*/eval/datasets/golden-dataset.json`):
  ```bash
  uv run pytest tests/integration/test_mvc_campaign_e2e.py
  ```
- [ ] Lock and version the Golden Dataset.
- [ ] Record baseline latency (TTFT P95, turn latency) and unit cost ($/campaign execution).

### Phase 2: Shadow Evaluation & Offline Validation (Day 6–10)
- [ ] **Tool Safety Check**: Verify all tools reachable by the candidate model are read-only or idempotent.
- [ ] Run candidate model offline against the full Golden Evaluation Suite.
- [ ] **Regression Gate**: Ensure Candidate scores $\ge 4.0 / 5.0$ and exhibits 0 schema validation errors.
- [ ] Confirm image generation deliverables adhere strictly to 16:9 studio photographic standards.

### Phase 3: Progressive Canary Traffic Ramp (Day 11–20)
- [ ] **Canary Stage 1 (10% Traffic)**:
  - Deploy new revision to Staging Cloud Run (`version1`).
  - Route 10% traffic to candidate revision.
  - Soak for minimum 24 hours. Monitor error rate and Model Armor trigger rates.
- [ ] **Canary Stage 2 (50% Traffic)**:
  - If 24h error budget consumption is $<1\%$, expand traffic allocation to 50%.
  - Inspect structured logs in Cloud Logging for unexpected P3 visual synthesis fallbacks.
- [ ] **Canary Stage 3 (100% Promotion)**:
  - Route 100% traffic to verified revision.
  - Run post-deploy automated Locust load test.

### Phase 4: Decommission & Cleanup (Day 21–30)
- [ ] Archive previous revision artifacts in Artifact Registry.
- [ ] Update documentation: `docs/design/TDD.md`, `docs/adr/0002-model-selection-and-location-pinning.md`.
- [ ] Declare model swap complete.

---

## 3. Rollback Procedure & Emergency Triggers

### Auto-Rollback Triggers:
1. **Quality Regression**: Golden Eval quality score drops by $>0.2$ points on 5.0 scale.
2. **Schema Incompatibility**: Any JSON parsing or Pydantic validation failure in P1, P2, or P4 deliverables.
3. **5xx Error Burst**: API error rate exceeds $0.5\%$ over a 5-minute rolling window.
4. **Latency Excursion**: P95 sub-agent latency exceeds $4.0\text{s}$ (text) or $12.0\text{s}$ (visual).

### Immediate Rollback Command:
```bash
# Rollback Cloud Run traffic immediately to previous healthy revision
gcloud run services update-traffic version1 \
  --region=asia-northeast3 \
  --to-revisions=<PREVIOUS_STABLE_REVISION>=100
```
