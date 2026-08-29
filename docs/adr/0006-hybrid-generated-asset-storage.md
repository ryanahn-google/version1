# ADR-0006: Hybrid Generated Visual Asset Storage (Local Static Mount vs Google Cloud Storage)

- **Status**: Accepted
- **Date**: 2026-08-29
- **Deciders**: Ryan Ahn (FDE Lead), Nova Electronics Corp Sponsor
- **Related**: [docs/design/TDD.md](../design/TDD.md), [ADR-0002](0002-model-selection-and-location-pinning.md), [ADR-0003](0003-dual-mode-a2a-and-hybrid-session-persistence.md)

## Context
[P3] Creative Content Agent generates high-resolution marketing visual mockups using Gemini-native image generation (Nano Banana 2 Lite: `gemini-3.1-flash-lite-image`).
The generated assets (PNG binary data) must be persisted and served to the React SPA frontend with distinct environmental constraints:
1. **Production (Cloud Run on GCP)**: The service container is ephemeral and stateless. Generated visual assets must be durably stored in an object store with Google Cloud Storage (GCS) lifecycle management (30-day retention), CDN caching, and high-availability public or signed URLs.
2. **Local Development (`make dev`, `make dev-live`)**: Developers and marketers conducting rapid local testing need immediate visual verification in the frontend without mandatory GCS bucket provisioning, service account credential binding, or cross-origin GCS bucket permissions.
3. **Automated Testing (`pytest`)**: Test suites running in CI environments require fast, deterministic execution (<45s) without incurring image generation latency or API costs.

## Decision
We implement a dual-mode, environment-aware asset storage architecture managed by `AssetStorageService` invoked directly within the `creative_content` subagent:

1. **Production Storage Mode (`ENV=prod` or `ARTIFACTS_BUCKET_NAME` configured)**:
   - Generated image binaries from Nano Banana 2 Lite are uploaded to Google Cloud Storage at:
     `gs://${ARTIFACTS_BUCKET_NAME}/campaigns/{sessionId}/{assetId}.png`
   - Assets inherit bucket lifecycle policies (30-day automatic expiration).
   - The returned `assetUrl` is an accessible HTTPS GCS URL or signed URL.

2. **Local Development Storage Mode (`ENV=development` or bucket unset)**:
   - Image binaries are saved locally to `static/generated/{assetId}.png`.
   - FastAPI serves this directory via a dedicated static mount:
     `app.mount("/generated", StaticFiles(directory="static/generated"), name="generated")`
   - The returned `assetUrl` is `http://127.0.0.1:8000/generated/{assetId}.png` (or relative path `/generated/{assetId}.png`), allowing the React frontend (`CreativeContentView` and `PerformanceInsightsView`) to render the live generated visual mockup immediately.

3. **Automated Test Isolation (`INTEGRATION_TEST=TRUE`)**:
   - Automated tests bypass live image generation API calls and return a deterministic fixture URL (`https://storage.googleapis.com/mvc-artifacts-public/campaigns/galaxy_s27_visual.jpg`), preserving fast local test execution and CI stability.

4. **Graceful Fallback on Quota or Network Failure**:
   - If Vertex AI image generation encounters a rate limit, quota exhaustion, or temporary network timeout, the `creative_content` subagent catches the exception and falls back to the default sample placeholder asset so the campaign workflow can proceed to human review without failing the entire session.

## Alternatives considered
### Alternative A: Cloud Storage Only (Local requires GCP Bucket)
- *Why it lost*: Local developers without active GCP IAM credentials or project access cannot view generated visuals, severely breaking the local development experience.

### Alternative B: Inline Base64 Data URLs in JSON Deliverable
- *Why it lost*: High-resolution 16:9 images produce >2MB Base64 strings, which drastically bloats JSON payload sizes, exhausts database column constraints, and degrades SSE streaming performance.

## Consequences
### Positive
- Production adheres to stateless container best practices with GCS lifecycle management.
- Local developer ergonomics are preserved with zero cloud setup for asset preview.
- Resilient fallback prevents intermittent image generation failures from blocking marketer workflows.
