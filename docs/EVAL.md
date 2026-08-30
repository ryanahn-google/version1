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
Datasets reside in `app/agents/*/eval/datasets/` adhering to the canonical `EvaluationDataset` schema:

| Dataset | Path | Target Sub-Agent | Primary Focus |
| :--- | :--- | :---: | :--- |
| **Galaxy S27 Black Friday** | `app/agents/market_sensing/eval/datasets/golden-dataset.json` | [P1] Market Sensing | Consumer trend analysis, competitor benchmarking, sentiment synthesis |
| **Strategy & Briefing Golden** | `app/agents/strategy_brief/eval/datasets/golden-dataset.json` | [P2] Strategy & Brief | Persona definition, value proposition, channel messaging mix |
| **Creative Visual Synthesis** | `app/agents/creative_content/eval/datasets/golden-dataset.json` | [P3] Creative Content | Ad copy, headline, studio photographic prompt generation |
| **Performance & Insights** | `app/agents/performance_insights/eval/datasets/golden-dataset.json` | [P4] Performance Insights | Multi-channel budget allocation, simulated ROAS, CTR impact |

### 2.2 Dataset Composition
- **50% Hand-Crafted Domain-Expert Scenarios**: Real-world smartphone, OLED TV, and premium audio launch briefs reviewed by marketing domain experts.
- **30% Edge-Case Stress Scenarios**: Unorthodox budget sizes ($5,000 micro-test to $50,000,000 global launch), tight turnaround constraints, niche demographics.
- **20% Hard Negatives & Guardrail Probes**: Prompt injection attempts, competitor trademark infringement traps, requests to process consumer PII.

---

## 3. Evaluation Metrics & Graders

We apply a tiered grading strategy: deterministic code assertion first, followed by calibrated LLM judge scoring.

| Metric Name | Grader Type | Evaluation Target | Failure Severity |
| :--- | :---: | :---: | :---: |
| **JSON Schema Conformance** | Code (`pydantic.BaseModel`) | $100\%$ validation against deliverable schemas | **Blocking (P0)** |
| **Deterministic Budget Conservation** | Code (Float sum) | Channel percentages sum strictly to $100.0\%$ | **Blocking (P0)** |
| **End-to-End DAG Completion** | Code (HTTP/SSE) | All 4 stages complete without unhandled exception | **Blocking (P0)** |
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
- **Agreement Calibration**: Calibrated against a held-out set of 20 human-labeled marketing briefs with $>90\%$ Cohen's kappa agreement.

---

## 5. CI/CD Quality Gate & Regression Policy

- **PR Gate (`pr-version1`)**:
  - `uv run pytest tests/unit tests/integration` must pass with zero failures.
  - `tests/integration/test_mvc_campaign_e2e.py` executes the golden campaign simulation.
- **Deployment Gate (`cd-version1`)**:
  - Automated 30-second headless Locust load test (`tests/load_test/load_test.py`) runs against Staging Cloud Run verifying concurrent session creation and SSE event streaming with 0 errors.
- **Baseline Promotion**:
  - Golden eval scores are baselined; any regression $>0.2$ points on the 5.0 scale automatically halts deployment.
