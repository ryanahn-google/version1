# ADR-0004: Multi-Project CI/CD Pipeline with Cloud Build Native Approval Gate

- **Status**: Accepted
- **Date**: 2026-08-28
- **Deciders**: Ryan Ahn (FDE Lead), Engineering Approver
- **Related**: [docs/design/TDD.md](../design/TDD.md), [deployment/terraform/cicd/build_triggers.tf](../../deployment/terraform/cicd/build_triggers.tf)

## Context
The Marketing Value Creator (MVC) v1.0 requires automated testing, container builds, and deployment across distinct environments (Staging and Production).
Key enterprise requirements include:
1. **Strict Environment Isolation**: Production workloads and databases must not share GCP project boundaries, IAM permissions, or network namespaces with Staging or CI/CD runners.
2. **Automated Verification Before Promotion**: Staging must undergo automated load testing (Locust) to verify end-to-end API and SSE chat streaming resilience before code is allowed near Production.
3. **Production Approval Gate**: Deployment to Production must never be fully automatic; an authorized operator must explicitly inspect verification results and approve deployment.
4. **Tooling Overhead**: Minimizing operational footprint by avoiding heavy CD pipelines (e.g. Google Cloud Deploy with Skaffold) when Cloud Build native capabilities fulfill all contractual commitments.

## Decision
We implement a **3-Project CI/CD Hub-and-Spoke Topology** using Google Cloud Build 2nd Gen and Cloud Build Triggers:

1. **Project Separation**:
   - `capstone-cicd`: Central build runner, container image repository (`version1-repo` in Artifact Registry), and GitHub 2nd Gen Connection (`git-version1`).
   - `capstone-staging-506811`: Fully isolated Staging environment.
   - `capstone-prod-506811`: Fully isolated Production environment.

2. **Automated Three-Trigger Pipeline**:
   - `pr-version1` (`.cloudbuild/pr_checks.yaml`): Triggered on Pull Requests to `main`.
     1. Installs project dependencies via `uv sync --locked`.
     2. Validates Alembic database migrations (`alembic upgrade head`, `alembic check`).
     3. Builds React 19 SPA frontend (`npm ci`, `npm run build`).
     4. Executes unit tests (`uv run pytest tests/unit`).
     5. Executes integration tests (`uv run pytest tests/integration`).
     6. Validates evaluation suite syntax and dataset integrity (`uv run pytest tests/eval/test_golden_campaigns.py -k test_golden_dataset_syntax`).
   - `cd-version1` (`.cloudbuild/staging.yaml`): Triggered on push or merge to `main`.
     1. Builds the Python 3.13 container image and pushes to `asia-northeast3-docker.pkg.dev/capstone-cicd/version1-repo/version1:$SHORT_SHA`.
     2. Deploys P1–P4 sub-agents to Agent Platform Agent Runtime via `scripts/deploy_subagents.sh`.
     3. Executes database migrations in staging via Cloud Run Job (`version1-db-migrate`).
     4. Deploys Orchestrator to Staging Cloud Run (`version1`) via `agents-cli deploy`.
     5. Extracts the Staging Cloud Run service URL and generates an internal OIDC authentication token.
     6. Executes a 30-second headless Locust load test (`tests/load_test/load_test.py`) against `/api/v1/campaigns` and `/api/v1/campaigns/{sessionId}`.
     7. Exports load test HTML and CSV reports to `gs://${_LOGS_BUCKET_NAME_STAGING}/load-test-results/`.
     8. Executes the automated pre-production evaluation quality gate (`scripts/eval_gate.py`) against deployed Staging services.
     9. Invokes the Production deployment trigger (`deploy-version1`) via `gcloud beta builds triggers run deploy-version1` upon successful validation.
   - `deploy-version1` (`.cloudbuild/deploy-to-prod.yaml`): Configured with a Cloud Build Native Approval Gate:
     ```hcl
     approval_config {
       approval_required = true
     }
     ```
     Enters a `PENDING` state until an authorized engineer clicks **Approve** in the Cloud Build Console. Upon approval, builds and pushes the production container image, deploys verified subagents via `scripts/deploy_subagents.sh`, executes prod database migrations via Cloud Run Job (`version1-db-migrate`), and deploys the Orchestrator to `capstone-prod-506811` via `agents-cli deploy`.

## Alternatives Considered

### Alternative A: Google Cloud Deploy with Skaffold
Provision Cloud Deploy Delivery Pipelines and Targets with Skaffold manifest rendering.
- *Why it was attractive*: Built-in multi-target promotion UI and automated metric-based canary rollbacks.
- *Why it lost*: Required introducing `skaffold.yaml` configuration layers and replacing the lightweight `agents-cli deploy` standard ADK workflow. Cloud Build's native `approval_config` provides the required human gate with zero added operational dependencies.

### Alternative B: Single GCP Project with Namespace Tagging
Deploy both Staging and Production workloads within a single GCP project, partitioned by service suffixes (`version1-staging`, `version1-prod`).
- *Why it lost*: Violates enterprise blast radius isolation. A shared project risks accidental credential leakage, IAM privilege escalation, and noisy-neighbor quota exhaustion between test and prod. Note: The starter-pack directory `deployment/terraform/single-project/` is retained solely as an unmaintained local reference template; canonical multi-environment CI/CD is implemented exclusively in `deployment/terraform/cicd/`. Full remediation is intentionally omitted from `single-project/` by design.

## Consequences

### Positive
- Complete physical blast radius isolation between build runner, staging, and production environments.
- Automated performance and quality gating: 30-second Locust load testing on `/api/v1/campaigns` and `scripts/eval_gate.py` ensure defective or regressed revisions are blocked before human promotion approval.
- Simple, auditable manual promotion via Cloud Build Console.

### Negative / Accepted Trade-offs
- Production releases do not support automatic multi-step canary traffic shifting (e.g. 10% -> 50% -> 100%); traffic routes 100% to the newly approved Cloud Run revision upon approval.
- Rollback requires re-running a previous build trigger or splitting traffic in Cloud Run Console.

## Conditions to Revisit
- If business requirements mandate automated multi-step canary rollouts with automated metric-based rollback, migrate deployment stages to Google Cloud Deploy.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [.cloudbuild/pr_checks.yaml](../../.cloudbuild/pr_checks.yaml)
- [.cloudbuild/staging.yaml](../../.cloudbuild/staging.yaml)
- [.cloudbuild/deploy-to-prod.yaml](../../.cloudbuild/deploy-to-prod.yaml)
- [deployment/terraform/cicd/build_triggers.tf](../../deployment/terraform/cicd/build_triggers.tf)

## Changelog
- 2026-08-28: Initial proposal and acceptance.
