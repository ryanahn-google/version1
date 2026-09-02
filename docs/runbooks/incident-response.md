# Incident Response Runbook: Marketing Value Creator (MVC)

> Standard operating procedure for triaging, mitigating, and documenting production incidents across the MVC platform.
> **Golden Rule**: Capture diagnostic evidence (Trace IDs, logs, model inputs) before applying mitigating restarts or failovers.

---

## 1. Incident Severity Rubric

| Severity | Definition | Target Response (MTTD) | Target Mitigation (MTTR) | Notification Channel |
| :---: | :--- | :---: | :---: | :--- |
| **Sev-1 (Critical)** | Complete Cloud Run outage, Cloud SQL database unreachable, or 100% simulation failures | $< 5\text{ min}$ | $< 30\text{ min}$ | PagerDuty + Executive Chat Space |
| **Sev-2 (Major)** | P3 visual synthesis failing continuously, Model Armor blocking legitimate briefs, or P95 latency $>30\text{s}$ | $< 15\text{ min}$ | $< 1\text{ hour}$ | On-Call Engineer + Marketing Lead |
| **Sev-3 (Minor)** | Intermittent sub-agent retries, non-blocking telemetry delay, or localized UI rendering glitches | $< 1\text{ hour}$ | $< 4\text{ hours}$ | Issue Tracker Ticket |

---

## 2. Capture-Before-Mitigation Protocol

Before restarting containers, updating Model Armor templates, or rolling back revisions:
1. **Extract Active Trace ID**: Locate the failing request's `traceId` from the frontend error banner or Cloud Run logs:
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' \
     --limit=10 --project=capstone-staging-506811 --format="json(trace,textPayload,jsonPayload)"
   ```
2. **Snapshot Model Payload & Headers**: Record the offending prompt, tenant ID, and sub-agent stage.
3. **Verify Cloud SQL Proxy Socket**: Confirm whether `/cloudsql/` Unix domain socket is active before recycling instances.
4. **Verify Container Health Probe**: Confirm Orchestrator container liveness via `GET /healthz` (`app/routers/system.py:34`). Note: MVC implements exclusively `/healthz` for health and liveness checks; `/ready` does not exist in the application.

---

## 3. Incident Playbooks

### Playbook A: Agent Platform 429 Resource Exhausted (Quota Contention) & Model Failover
- **Symptom**: Model calls encounter HTTP 429 `ResourceExhausted` or 503 `ServiceUnavailable` during traffic spikes.
- **Diagnosis**:
  ```bash
  gcloud logging read 'jsonPayload.error.code=429 OR jsonPayload.error.code=503' --limit=10 --project=capstone-staging-506811
  ```
- **Automatic Mitigation (Active Engine)**:
  1. **HTTP Exponential Backoff with Jitter**: Automatically retries up to 3 times with exponential backoff (`initial_delay=1.0s, max_delay=10.0s, exp_base=2.0, jitter=1.0s`) via `get_default_http_retry_options()` on HTTP status codes `[408, 429, 500, 502, 503, 504]`.
  2. **Multi-Tier Model Fallback (`FallbackGemini`)**: If primary model (`gemini-3.1-pro-preview` for Orchestrator, `gemini-3.5-flash-lite` for subagents) remains unavailable, requests automatically and transparently fail over to secondary fallback models (`gemini-2.5-pro` and `gemini-2.5-flash` respectively).
- **Manual Operational Actions**:
  1. Inspect Cloud Logging to verify that `FallbackGemini` successfully switched to the secondary model.
  2. Confirm endpoint location is pinned to `global`.
  3. If quota contention is company-wide, temporarily reduce Cloud Run container concurrency from 80 to 40.

### Playbook B: Model Armor False-Positive Rejections (`PROMPT_INJECTION_DETECTED`)
- **Symptom**: Marketer inputs valid marketing brief (e.g. competitor comparison) but receives HTTP 400 with `PROMPT_INJECTION_DETECTED`.
- **Diagnosis**: Inspect Security Command Center (SCC) or Cloud Logging for Model Armor template `version1-guardrails` match filters.
- **Mitigation**:
  1. Export the triggering brief text.
  2. Update the Model Armor template confidence threshold from `LOW_AND_ABOVE` to `MEDIUM_AND_ABOVE` in multi-region `us` (where `version1-guardrails` is provisioned per `deployment/terraform/cicd/model_armor.tf:17`):
     ```bash
     # Example: adjust floor settings in Terraform or Google Cloud Console (location: us)
     ```
  3. Advise the marketer to rephrase while template adjustment propagates.

### Playbook C: Cloud SQL Auth Proxy Socket Disconnect & Transient Fault Recovery
- **Symptom**: Ephemeral connection drops, proxy socket resets, or PostgreSQL transaction lock contention.
- **Automatic Mitigation (Active Engine)**:
  - All database query methods in `SessionRepository` are decorated with `@db_retry` (3 attempts, initial 0.5s, factor 2.0, max 5.0s, jitter 0.5s).
  - Transient `OperationalError` and `DBAPIError` exceptions are retried with randomized jitter, absorbing brief proxy restarts and maintenance switchovers without returning 500 errors to clients.
- **Diagnosis**: Check if Cloud SQL instance is in `MAINTENANCE` or restarting if errors persist past 3 retry attempts:
  ```bash
  gcloud logging read 'textPayload=~"database operation.*failed after.*attempts"' --limit=5 --project=capstone-staging-506811
  ```
- **Manual Operational Actions**:
  1. Check Cloud SQL instance health:
     ```bash
     gcloud sql instances describe version1-db-staging --project=capstone-staging-506811 --format="value(state)"
     ```
  2. If instance is `RUNNABLE`, trigger Cloud Run zero-downtime revision redeployment to remount the Unix domain socket volume.

### Playbook D: GCS Signed URL Expiration / Image Display Failure
- **Symptom**: Historical visual assets fail to render in the browser with HTTP 403 / Signature Expired.
- **Diagnosis**: Inspect `/api/v1/campaigns/{sessionId}/visual` response.
- **Mitigation**:
  1. Verify Cloud Run Service Account (`version1-app`) retains `roles/iam.serviceAccountTokenCreator`.
  2. Re-trigger the endpoint to issue a fresh 1-hour V4 signed URL dynamically.

### Playbook E: P3 Creative Visual Generation Timeout / Exhaustion
- **Symptom**: Stage 3 Creative Content takes longer than 15s or image rendering encounters upstream drop.
- **Automatic Mitigation (Active Engine)**:
  - Visual generation (`synthesize_nano_banana_image`) runs asynchronously via `client.aio.models.generate_content` with a strict 25.0s timeout and a 2-attempt exponential backoff retry loop (`attempts=2, backoff_base=2.0, jitter=1.0s`).
  - File I/O for Google Cloud Storage is offloaded to worker threads (`asyncio.to_thread`), preventing event loop starvation.
  - If both attempts fail, the agent logs a warning and returns a structured placeholder deliverable, allowing the campaign workflow to proceed without fatal termination.

---

## 4. Post-Incident & Blameless Postmortem Policy

1. Publish postmortem draft within 48 hours for all Sev-1 and Sev-2 incidents.
2. Structure: Root Cause, Timeline, What went well, What went wrong, Action Items with direct ticket assignments.
3. If the incident revealed a model edge case, add the failing scenario to `app/agents/*/eval/datasets/golden-dataset.json`.
