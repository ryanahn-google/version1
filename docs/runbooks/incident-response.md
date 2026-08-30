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

---

## 3. Incident Playbooks

### Playbook A: Vertex AI 429 Resource Exhausted (Quota Contention)
- **Symptom**: Sub-agents return HTTP 429 or `ResourceExhausted` during concurrent campaign simulations.
- **Diagnosis**:
  ```bash
  gcloud logging read 'jsonPayload.error.code=429' --limit=5 --project=capstone-staging-506811
  ```
- **Mitigation**:
  1. Confirm endpoint is directed to `location="global"` (Vertex AI Dynamic Shared Quota).
  2. Verify sub-agent exponential backoff with jitter is active.
  3. If persistent, temporarily reduce Cloud Run container concurrency from 80 to 40 to space out concurrent token bursts.

### Playbook B: Model Armor False-Positive Rejections (`PROMPT_INJECTION_DETECTED`)
- **Symptom**: Marketer inputs valid marketing brief (e.g. competitor comparison) but receives HTTP 400 with `PROMPT_INJECTION_DETECTED`.
- **Diagnosis**: Inspect Security Command Center (SCC) or Cloud Logging for Model Armor template `version1-guardrails` match filters.
- **Mitigation**:
  1. Export the triggering brief text.
  2. Update the Model Armor template confidence threshold from `LOW_AND_ABOVE` to `MEDIUM_AND_ABOVE` in `asia-northeast3`:
     ```bash
     # Example: adjust floor settings in Terraform or Google Cloud Console
     ```
  3. Advise the marketer to rephrase while template adjustment propagates.

### Playbook C: Cloud SQL Auth Proxy Socket Disconnect
- **Symptom**: Cloud Run returns HTTP 500 with `Cannot connect to host /cloudsql/...: Connection refused`.
- **Diagnosis**: Check if Cloud SQL instance is in `MAINTENANCE` or restarting.
- **Mitigation**:
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

---

## 4. Post-Incident & Blameless Postmortem Policy

1. Publish postmortem draft within 48 hours for all Sev-1 and Sev-2 incidents.
2. Structure: Root Cause, Timeline, What went well, What went wrong, Action Items with direct ticket assignments.
3. If the incident revealed a model edge case, add the failing scenario to `app/agents/*/eval/datasets/golden-dataset.json`.
