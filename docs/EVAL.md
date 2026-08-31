# Evaluation Plan: Marketing Value Creator (MVC) v1.0

> The multi-agent campaign planning system is not done until it is evaluated.
> Single source of truth for evaluation datasets, metrics, judge calibration, and CI/CD quality gates.

---

## 1. Quality Ownership & Objectives

- **Quality Owner**: Ryan Ahn (ryanahn@, FDE Lead)
- **Evaluation Cadence**: Automated on PRs (`pr-version1`), pre-deployment Staging verification, and on-demand via `agents-cli eval run`.
- **Primary Goal**: Ensure that the 4-stage sequential Multi-Agent DAG generates 100% schema-valid deliverables, achieves $\ge 4.0 / 5.0$ on LLM-as-a-Judge quality rubrics, and guarantees 100.0% budget conservation with zero hallucination.

---

## 2. Golden Evaluation Datasets

### 2.1 Dataset Inventory
The evaluation dataset is organized into a master E2E dataset and per-subagent decomposed datasets:

| Dataset | Path | Target Scope | Primary Focus |
| :--- | :--- | :---: | :--- |
| **Master Golden Campaigns (10 Scenarios)** | `tests/eval/datasets/golden_campaigns.json` | E2E DAG (Orchestrator + P1-P4) | 5 Flagship campaigns, 3 Edge cases (micro-budget, flash sale, bilingual edit), 2 Guardrail probes |
| **Market Sensing Golden Suite** | `app/agents/market_sensing/eval/datasets/golden-dataset.json` | [P1] Market Sensing | Consumer trend analysis, competitor benchmarking, sentiment synthesis |
| **Strategy & Briefing Golden Suite** | `app/agents/strategy_brief/eval/datasets/golden-dataset.json` | [P2] Strategy & Brief | Persona definition, value proposition, channel messaging mix |
| **Creative Visual Golden Suite** | `app/agents/creative_content/eval/datasets/golden-dataset.json` | [P3] Creative Content | Ad copy, headline, studio photographic prompt generation |
| **Performance & Insights Golden Suite** | `app/agents/performance_insights/eval/datasets/golden-dataset.json` | [P4] Performance Insights | Multi-channel budget allocation, 100.0% budget conservation, ROAS |

### 2.2 Dataset Composition
- **50% Hand-Crafted Flagship Scenarios (5)**: Galaxy S27 Ultra (Smartphone), Neo QLED 8K (TV), Bespoke AI (Laundry), NovaBuds Pro (Audio), Odyssey Ark G9 (Gaming Monitor).
- **30% Edge-Case Stress Scenarios (3)**: 48-hour flash sale, $5,000 hyper-local micro-budget, bilingual Korean campaign with marketer headline edit.
- **20% Hard Negatives & Guardrail Probes (2)**: Prompt injection / system override probe, competitor defamation / false claim probe (intercepted by Model Armor with 400 Bad Request).

---

## 3. Evaluation Metrics & Graders

We apply a tiered grading strategy: deterministic code assertion first, followed by calibrated LLM judge scoring.

| Metric Name | Grader Type | Evaluation Target | Failure Severity |
| :--- | :---: | :---: | :---: |
| **JSON Schema Conformance** | Code (`pydantic.BaseModel`) | $100\%$ validation against deliverable schemas | **Blocking (P0)** |
| **Deterministic Budget Conservation** | Code (Float sum) | Channel percentages sum strictly to $100.0\%$ | **Blocking (P0)** |
| **End-to-End DAG Completion** | Code (HTTP/SSE) | All 4 stages complete through HITL gates | **Blocking (P0)** |
| **Rubric Quality Score** | LLM Judge (`gemini-3.1-pro`) | Score $\ge 4.0 / 5.0$ across all evaluation rubrics | **Blocking (P1)** |
| **Faithfulness & Grounding** | LLM Judge (`gemini-3.1-pro`) | $0$ unsupported claims vs provided brand brief | **Blocking (P1)** |
| **Sub-Agent Turn Latency** | Code (Timer) | Text $< 3.0\text{s}$ P95, Visual $< 8.0\text{s}$ P95 | **Warning (P2)** |

---

## 4. LLM-as-a-Judge Calibration

- **Judge Model**: `gemini-3.1-pro` (Vertex AI `location="global"`).
- **Independence Guarantee**: The judge model family (`gemini-3.1-pro`) is decoupled from the text generation model (`gemini-3.5-flash-lite`), eliminating self-preference bias.
- **Calibration Rubrics (1.0 to 5.0 Scale)**:
  - **1.0 - Unacceptable**: Hallucinated competitor specs, budget math failure, or toxic/unsafe content.
  - **2.0 - Poor**: Fails brand tone, vague target persona, generic recommendations.
  - **3.0 - Acceptable**: Meets basic brief criteria, sound budget breakdown, minor creative repetition.
  - **4.0 - Good**: Actionable insights, highly distinct persona messaging, creative copy matches consumer trends.
  - **5.0 - Superior**: Executive-ready strategic brief, defensible ROAS projections, photorealistic prompt synthesis.
- **Agreement Calibration**: Calibrated against held-out human-labeled marketing briefs with $>90\%$ Cohen's kappa agreement.

---

## 5. Automated Evaluation Execution

### 5.1 Subagent Evaluation via Agent Platform
Each subagent can be evaluated directly on Vertex AI Agent Platform:
```bash
cd app/agents/market_sensing
agents-cli eval run --config eval/eval_config.yaml --dataset eval/datasets/golden-dataset.json
```

### 5.2 Synthetic Marketer E2E Evaluator
Simulates an automated marketer driving the 4-stage DAG across all 10 scenarios:
```bash
uv run python tests/eval/e2e_campaign_evaluator.py
# Or against deployed Staging:
uv run python tests/eval/e2e_campaign_evaluator.py --base-url https://version1-staging.run.app
```

---

## 6. CI/CD Quality Gate & Regression Policy

- **PR Gate (`pr-version1` in `.cloudbuild/pr_checks.yaml`)**:
  - `uv run pytest tests/unit tests/integration` must pass with zero failures.
  - `uv run pytest tests/eval/test_golden_campaigns.py -k test_golden_dataset_syntax` validates dataset schema integrity.
- **Deployment Quality Gate (`cd-version1` in `.cloudbuild/staging.yaml`)**:
  - Executed via `scripts/eval_gate.py` against deployed Staging services.
  - Generates JSON and HTML reports and archives them to `gs://${_LOGS_BUCKET_NAME_STAGING}/eval-results/results-<timestamp>`.
  - **Halt Condition**: If schema conformance $< 100\%$, budget conservation $< 100\%$, average score $< 4.0 / 5.0$, or regression $> 0.2$, `scripts/eval_gate.py` exits with code 1, automatically blocking the `trigger-prod-deployment` step.

---

## 7. References
- [ADR-0004: Multi-Project CI/CD Pipeline with Cloud Build Approval Gate](adr/0004-multi-project-cicd-pipeline-and-approval-gate.md)
- [ADR-0009: Agent Platform Hybrid Evaluation and Two-Stage Deployment Quality Gate](adr/0009-agent-platform-eval-and-deployment-quality-gate.md)
- [Master Dataset: tests/eval/datasets/golden_campaigns.json](../tests/eval/datasets/golden_campaigns.json)
- [Evaluator: tests/eval/e2e_campaign_evaluator.py](../tests/eval/e2e_campaign_evaluator.py)
- [Quality Gate: scripts/eval_gate.py](../scripts/eval_gate.py)

