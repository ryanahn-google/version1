# ADR-0007: Domain-Restricted Sharing (DRS) Compliance and Authenticated Asset Streaming Proxy

- **Status**: Accepted
- **Date**: 2026-08-29
- **Deciders**: Ryan Ahn (FDE Lead), Enterprise Security Lead
- **Related**: [docs/design/TDD.md](../design/TDD.md), [deployment/terraform/cicd/storage.tf](../../deployment/terraform/cicd/storage.tf), [app/fast_api_app.py](../../app/fast_api_app.py)

## Context
Marketing Value Creator (MVC) generates campaign visual assets via [P3] Creative Content Agent (using Imagen / Nano Banana 2 Lite) and persists them to Google Cloud Storage (`gs://{project_id}-version1-artifacts/campaigns/{sessionId}/`). Marketers reviewing the campaign in the React Single Page Application (SPA) must view these generated images in real time.

In typical prototype architectures, public asset display is achieved by granting `allUsers` the `roles/storage.objectViewer` IAM role on the GCS bucket. However, enterprise Google Cloud organizations enforce the **Domain-Restricted Sharing (DRS)** constraint (`constraints/iam.allowedPolicyMemberDomains`). Under this policy, any Terraform apply attempting to grant `allUsers` or `allAuthenticatedUsers` permissions fails immediately with an organization policy violation.

## Decision
We adopt an **Authenticated Backend Streaming Proxy Architecture** on Cloud Run:

1. **Remove Public GCS IAM Bindings**:
   - `google_storage_bucket_iam_member.artifacts_public_viewer` (`allUsers`) is completely removed from Terraform (`deployment/terraform/cicd/storage.tf` and `single-project/storage.tf`).
   - The GCS artifacts bucket remains strictly private, accessible only by authenticated service identities (`version1-app` and `version1-subagent`).

2. **FastAPI Streaming Proxy (`/generated/{filename:path}`)**:
   - The Cloud Run FastAPI backend exposes an internal streaming endpoint:
     ```python
     @app.get("/generated/{filename:path}", include_in_schema=False)
     async def serve_generated_asset(filename: str):
         # Checks local disk cache first, then streams directly from GCS artifacts bucket
     ```
   - In development, the proxy serves from the local `static/generated/` directory.
   - In staging and production, the proxy uses the Cloud Run Service Account (`version1-app`) with `roles/storage.objectAdmin` to stream the image binary directly from GCS to the client browser with appropriate `image/png` content-type headers.

3. **Subagent URL Generation**:
   - Subagents save image binaries to GCS and return URLs pointing to the Cloud Run proxy (`https://{cloud-run-domain}/generated/{filename}`), ensuring that the frontend React SPA renders visuals seamlessly without requiring direct GCS public read access.

## Alternatives Considered

### Alternative A: Google Cloud V4 Signed URLs
Generate ephemeral Signed URLs with a finite expiration time (e.g. 1 hour) and attach them to deliverable payloads.
- *Why it lost*: Requires frequent URL re-signing when historical campaign sessions are reopened days or weeks later from Cloud SQL, introducing state re-hydration complexity and potential stale image link failures.

### Alternative B: Organization Policy Exemption for DRS
Request an exemption on `constraints/iam.allowedPolicyMemberDomains` for the artifacts bucket.
- *Why it lost*: Violates enterprise least-privilege security posture. Central security teams routinely reject public bucket exemptions due to data exfiltration and liability risks.

## Consequences

### Positive
- **100% DRS Compliance**: Completely eliminates Terraform deployment failures caused by organization policy enforcement.
- **Zero Public Bucket Exposure**: GCS bucket retains uniform bucket-level access and private IAM controls.
- **Unified Frontend Experience**: The React SPA accesses images via standard relative `/generated/` HTTP paths with zero CORS preflight or auth token URL embedding issues.

### Negative / Accepted Trade-offs
- Cloud Run egress bandwidth is consumed when proxying images from GCS to user browsers (mitigated by Cloud Run's high network throughput and small image sizes of ~1-2 MB).
