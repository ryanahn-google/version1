# Agent Guidelines

## 1. Core Operating Directives (Mandatory)
1. **Actively use the `ponytail` skill throughout development**: Prioritize the simplest, most minimal working solution (YAGNI, standard library / native features first, shortest diff).
2. **Environment Configuration**: Manage all environment variables in a single `.env` file instead of `env.tfvars` when writing Terraform code. When reading OS environment variables in application code, use Pydantic `BaseSettings` within a dedicated `settings.py` file rather than direct `os.getenv` or `os.environ` calls.
3. **Agent Harness Directory**: Whenever Harness is needed, DO NOT create `_agents` directory and instead stick to `.agents` directory.
4. **Preserve `.env`**: DO NOT modify or overwrite the `.env` file.
5. **Package Management**: Use `uv` as package installer/manager for this project (`uv run ...`, `uv sync`).
6. **Agent Framework**: Use Google ADK (Agent Development Kit) for agent development.
7. **Proactive Skill & CLI Utilization**: Actively leverage the `google-agents-cli-*` skill suite (`google-agents-cli-workflow`, `google-agents-cli-adk-code`, `google-agents-cli-eval`, `google-agents-cli-deploy`, `google-agents-cli-observability`, `google-agents-cli-publish`, `google-agents-cli-scaffold`) throughout the entire development lifecycle.

## 2. Project Context & Architecture
- **System**: Nova Electronics Corp — Marketing Value Creator (MVC).
- **Topology**:
  - **Orchestrator**: FastAPI on Cloud Run (`asia-northeast3`) serving both the backend API and compiled React SPA static assets under a single origin.
  - **Sub-agents**: 4 specialized agents deployed on Agent Runtime orchestrated via direct A2A protocol:
    - `[P1] Market Sensing Agent` (Gemini 3.5 Flash Lite) -> outputs structured JSON (`market_sensing.json`).
    - `[P2] Strategy & Brief Agent` (Gemini 3.5 Flash Lite) -> outputs structured JSON (`campaign_brief.json`).
    - `[P3] Creative Content Agent` (Gemini 3.5 Flash Lite + Imagen 3) -> outputs image deliverables (PNG/JPEG via `imagen-3.0-generate-002`) stored in GCS.
    - `[P4] Performance & Insights Agent` (Gemini 3.5 Flash Lite) -> outputs structured JSON (`performance_insights.json`).
  - **Orchestrator & Eval Model**: Gemini 3.1 Pro (`gemini-3.1-pro`).
  - **Location Pinning**: GCP resources in `asia-northeast3` (Seoul); Vertex AI foundation model endpoint pinned to `global` (`location="global"`).
  - **State & Storage**: Agent Platform Sessions for state management & turn history; Google Cloud Storage (`gs://mvc-artifacts-*`) for deliverable artifacts.
  - **Security & Guardrails**: Google OAuth 2.0 (OIDC ID token verification on Cloud Run API); Google Cloud Model Armor for prompt/output sanitization; Direct VPC Egress for network isolation.

## 3. Engineering & Code Standards
- **Google Python Style Guide (`go/pyguide`)**:
  - Strict type annotations on all function signatures and complex types.
  - Google-style docstrings (`Args:`, `Returns:`, `Raises:`).
  - 80-character line length limit; clean grouped imports (stdlib, third-party, local).
  - Specific exception handling (avoid broad `except Exception:`).
- **Three-Surface Layering**:
  - Pure domain / helper logic -> Tool / Subagent wrapper -> API / Transport layer.
- **Contract-First & Data Modeling**:
  - Single source of truth for API contracts: `api/openapi.yaml`.
  - Structured data validation via Pydantic v2 schemas in `app/schemas/`.
- **Configuration & Environment Management**:
  - Centralize OS environment variable loading and validation using Pydantic `BaseSettings` (`pydantic-settings`) in a dedicated `settings.py` file.
  - Prohibit scattered or direct `os.getenv()` or `os.environ` lookups across the codebase to ensure type safety, validation, and single-source-of-truth configuration.

## 4. Google Agents CLI & ADK Workflow Guidelines
- **End-to-End Lifecycle (`google-agents-cli-workflow`)**:
  - Follow the structured phases: Scaffold -> Build -> Evaluate -> Pre-Deploy Test -> Deploy -> Publish -> Observe.
- **Agent Authoring & Coding (`google-agents-cli-adk-code`)**:
  - Implement agents, tools, callbacks, and session state using ADK conventions.
  - Import tool instances directly rather than modules (e.g., `from google.adk.tools.load_web_page import load_web_page`).
  - Perform local interactive verification via `agents-cli playground`.
  - Code preservation: preserve model configuration and existing parameters unless explicitly instructed.
- **Evaluation Loop & Quality Flywheel (`google-agents-cli-eval`)**:
  - Synthesize test scenarios: `agents-cli eval dataset synthesize`.
  - Generate execution traces: `agents-cli eval generate`.
  - Grade outputs: `agents-cli eval grade`.
  - Check regression diffs: `agents-cli eval compare`.
  - Cluster failure modes: `agents-cli eval analyze`.
  - Auto-tune agent prompts based on eval traces: `agents-cli eval optimize`.
- **Infrastructure & Deployment (`google-agents-cli-deploy`, `google-agents-cli-scaffold`)**:
  - Scaffold and enhance project configurations: `agents-cli scaffold enhance`.
  - Manage infrastructure templates: `agents-cli infra single-project` / `agents-cli infra cicd`.
  - Run all unit and integration tests prior to deployment: `uv run pytest tests/unit tests/integration`.
  - **Explicit Confirmation**: Never execute `agents-cli deploy` without explicit human confirmation.
- **Observability & Monitoring (`google-agents-cli-observability`)**:
  - Configure Cloud Trace for latency / span diagnostics and Cloud Logging for prompt-response inspection.
  - Enable BigQuery Agent Analytics for turn-level telemetry and fleet performance.
- **Publishing & Fleet Management (`google-agents-cli-publish`)**:
  - Register and manage agents in Agent Registry / Gemini Enterprise via `agents-cli publish gemini-enterprise`.