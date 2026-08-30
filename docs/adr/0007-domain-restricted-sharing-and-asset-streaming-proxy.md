# ADR-0007: Domain-Restricted Sharing (DRS) Compliance and Authenticated Asset Streaming Proxy

- **Status**: Accepted
- **Date**: 2026-08-29
- **Deciders**: Ryan Ahn (FDE Lead), Enterprise Security Lead
- **Related**: [docs/design/TDD.md](../design/TDD.md), [deployment/terraform/cicd/storage.tf](../../deployment/terraform/cicd/storage.tf), [app/fast_api_app.py](../../app/fast_api_app.py)

## Context
Marketing Value Creator (MVC) generates campaign visual assets via [P3] Creative Content Agent (using Nano Banana 2 Lite) and persists them to Google Cloud Storage (`gs://{project_id}-version1-artifacts/campaigns/{sessionId}/`). Marketers reviewing the campaign in the React Single Page Application (SPA) must view these generated images in real time.

In typical prototype architectures, public asset display is achieved by granting `allUsers` the `roles/storage.objectViewer` IAM role on the GCS bucket. However, enterprise Google Cloud organizations enforce the **Domain-Restricted Sharing (DRS)** constraint (`constraints/iam.allowedPolicyMemberDomains`). Under this policy, any Terraform apply attempting to grant `allUsers` or `allAuthenticatedUsers` permissions fails immediately with an organization policy violation.

## Decision
We adopt an **Authenticated Backend Streaming Proxy Architecture** on Cloud Run:

1. **Remove Public GCS IAM Bindings**:
   - `google_storage_bucket_iam_member.artifacts_public_viewer` (`allUsers`) is completely removed from Terraform (`deployment/terraform/cicd/storage.tf` and `single-project/storage.tf`).
   - The GCS artifacts bucket remains strictly private, accessible only by authenticated service identities (`version1-app` and `version1-subagent`).

2. **FastAPI Direct Access & Streaming Endpoint (`/api/v1/campaigns/{sessionId}/visual`)**:
   - In Cloud Run, the endpoint dynamically issues an HTTP 307 Temporary Redirect to a GCS V4 Signed URL (valid for 1 hour) enabled by `roles/iam.serviceAccountTokenCreator` bound to `version1-app`.
   - The browser automatically follows the redirect and downloads the image **directly from Google Cloud Storage (`storage.googleapis.com`)**, ensuring **0 bytes of memory buffering** in Cloud Run and **0 bytes of Cloud Run network egress**.
   - Before human approval, uncommitted visual assets are previewed via the in-memory draft endpoint (`/api/v1/campaigns/{sessionId}/draft-image`), avoiding unnecessary GCS writes during rejected revision cycles.
   - If signed URL generation is skipped or in local development, it gracefully falls back to zero-memory socket-to-socket chunked streaming (`StreamingResponse` with 64KB chunks) directly from GCS without buffering into memory.

3. **Subagent URL Generation & Persistence**:
   - Subagents hold draft visuals in memory during iteration and commit finalized image binaries to GCS exclusively upon HITL approval under `users/{user_id}/campaigns/{sessionId}/`, ensuring historical campaign sessions reopened from Cloud SQL always generate fresh, valid signed access links dynamically.

## Alternatives Considered

### Alternative A: Making GCS Bucket Public (`allUsers`)
Attempting to grant `allUsers` `roles/storage.objectViewer` directly on the GCS bucket.
- *Why it lost*: The enterprise Google Cloud organization enforces the **Domain-Restricted Sharing (DRS)** constraint (`constraints/iam.allowedPolicyMemberDomains`). Terraform fails immediately during apply with `Error 412: One or more users named in the policy do not belong to a permitted customer`.

### Alternative B: Organization Policy Exemption for DRS
Request an exemption on `constraints/iam.allowedPolicyMemberDomains` for the artifacts bucket.
- *Why it lost*: Violates enterprise least-privilege security posture. Central security teams routinely reject public bucket exemptions due to data exfiltration and liability risks.

## Consequences

### Positive
- **Direct Cloud Storage Downloads**: Client browsers download visual assets directly from `storage.googleapis.com` without loading image binaries into Cloud Run container memory.
- **Zero Cloud Run Egress & Memory**: Eliminates server-side memory buffering and egress bandwidth consumption.
- **100% DRS Compliance**: The bucket remains strictly private, passing all Terraform CI/CD checks without org policy violations.
- **Unified Frontend Experience**: The React SPA accesses images via standard relative `/generated/` HTTP paths with zero CORS preflight or auth token URL embedding issues.

### Negative / Accepted Trade-offs
- Cloud Run requires `roles/iam.serviceAccountTokenCreator` to sign GCS V4 URLs locally without embedding private keys.
- Signed URLs have a fixed 1-hour expiration window; historical sessions reopened later must dynamically request fresh signed URLs from Cloud Run.

### Risks (and mitigations)
- Service account token signing permission latency $\to$ Client signs using cached Google Credentials; signed URLs generated in $<5\text{ms}$.
- Fallback in offline local testing $\to$ Streaming proxy falls back to static sample assets if GCS bucket is unreachable.

## Conditions to Revisit
- If Cloud CDN signed cookies / signed URLs with external load balancing are added in front of GCS.
- If Organization Policy `constraints/iam.allowedPolicyMemberDomains` is relaxed by central IAM security.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [deployment/terraform/cicd/storage.tf](../../deployment/terraform/cicd/storage.tf)
- [app/routers/visuals.py](../../app/routers/visuals.py)
- Google Cloud Domain-Restricted Sharing (DRS) Policy Documentation

## Changelog
- 2026-08-29: Initial proposal and acceptance.
