# Marketing Value Creator (MVC)

Enterprise generative AI campaign planning platform automating cross-agency marketing workflows under strict brand and safety guardrails.

## Language

### Platform & Governance

**Agent Gateway**:
A managed Google Cloud networking component that secures and governs client-to-agent and agent-to-agent interactions with inline policy enforcement.
_Avoid_: API Gateway, Cloud Load Balancer, Envoy proxy

**Agent Identity**:
A unique, trackable SPIFFE-based principal identity provisioned for an agent deployed on Agent Runtime to enable cryptographic authentication and policy binding.
_Avoid_: Service account, IAM user, client credentials

**Model Armor Template**:
A regional Google Cloud security configuration specifying detection filters and thresholds for prompt injection, jailbreaks, harmful content, and sensitive data leakage.
_Avoid_: Prompt filter, safety rule, moderation config

**Authz Extension**:
A Service Extensions custom provider configuration linking an Agent Gateway to an external evaluation service such as Model Armor for content-based inspection.
_Avoid_: Custom plugin, webhook, HTTP filter

**Authz Policy**:
A network security policy resource binding an Agent Gateway target to an Authz Extension with a specific evaluation profile (such as content-based inspection).
_Avoid_: Security rule, firewall policy, route rule

### Agent Architecture

**Orchestrator**:
The central FastAPI service on Cloud Run that coordinates the campaign lifecycle, human-in-the-loop review gates, and session state.
_Avoid_: Backend server, master node, workflow controller

**Subagent**:
An autonomous, domain-specialized agent deployed on Vertex AI Agent Runtime executing a single stage of the campaign DAG.
_Avoid_: Microservice, background worker, job

**Deliverable**:
A structured JSON schema or high-resolution visual asset produced by a subagent upon stage execution.
_Avoid_: Output, payload, response blob

### Evaluation & Quality Flywheel

**Quality Gate**:
An automated CI/CD evaluation policy that blocks release promotion unless schema conformance is 100%, budget conservation is 100.0%, and LLM judge rubric score is >= 4.0 / 5.0.
_Avoid_: Smoke test, release check, deploy script

**Evaluation Dataset**:
A canonical JSON suite of multi-domain campaign scenarios and expectation rubrics used to benchmark subagent and end-to-end performance.
_Avoid_: Test set, mock data, sample inputs

**Synthetic Marketer**:
An automated simulation agent that executes the human-in-the-loop review gates across the campaign DAG during end-to-end evaluation.
_Avoid_: Mock user, test driver, simulated client

