# ADR-0005: Direct VPC Egress and Cloud SQL Auth Proxy Architecture

- **Status**: Accepted
- **Date**: 2026-08-28
- **Deciders**: Ryan Ahn (FDE Lead), Infrastructure Approver
- **Related**: [docs/design/TDD.md](../design/TDD.md), [deployment/terraform/cicd/network.tf](../../deployment/terraform/cicd/network.tf), [deployment/terraform/cicd/service.tf](../../deployment/terraform/cicd/service.tf)

## Context
Marketing Value Creator (MVC) runs on Google Cloud Run and interacts with:
1. Google Cloud SQL (PostgreSQL 15) for session persistence, state tracking, and campaign deliverable storage.
2. Google Cloud APIs (Vertex AI Gemini, Secret Manager, Model Armor, Cloud Logging) and external webhooks over the Internet.

Securing container outbound traffic and database connectivity requires balancing network isolation, authentication, encryption, and operational simplicity.

Two candidate architectures were evaluated:
1. **Private Services Access (PSA) Peering**: Allocating private RFC 1918 IP blocks, peering the custom VPC with Google Service Networking (`servicenetworking.googleapis.com`), and connecting Cloud Run to Cloud SQL exclusively via Private IP.
2. **Direct VPC Egress with Cloud SQL Auth Proxy**: Configuring Cloud Run with Direct VPC Egress via a dedicated regional subnetwork and Cloud NAT, and accessing Cloud SQL via the native Cloud SQL Auth Proxy volume mount over IAM authentication and mTLS Unix domain sockets.

## Decision
We adopt **Direct VPC Egress with Cloud SQL Auth Proxy**:

1. **Custom VPC & Subnet**:
   - `version1-vpc` custom network in `asia-northeast3`.
   - `asia-northeast3-subnet` (`10.10.0.0/24`) with Private Google Access enabled.
   - Cloud Router (`version1-router`) and Cloud NAT (`version1-nat`) for controlled outbound egress.
   - Cloud Run Direct VPC Egress configured via `run.googleapis.com/network-interfaces: [{"network":"version1-vpc","subnetwork":"asia-northeast3-subnet"}]` and `vpc-access-egress: all-traffic`.

2. **Cloud SQL Access via Auth Proxy Unix Domain Socket**:
   - Cloud Run mounts the native Cloud SQL volume at `/cloudsql`:
     ```hcl
     volume_mounts {
       name       = "cloudsql"
       mount_path = "/cloudsql"
     }
     ```
   - Cloud SQL instance configured with IAM authentication (`cloudsql.iam_authentication = "on"`).
   - Application connects using asyncpg over the local Unix domain socket:
     `postgresql+asyncpg://{user}:{pass}@/{dbname}?host=/cloudsql/{instance_connection_name}`.

## Alternatives Considered

### Alternative A: Private Services Access (PSA) VPC Peering with Private IP
Allocate an internal IP range (`10.60.0.0/16`) and establish a VPC peering connection with `servicenetworking.googleapis.com`.
- *Why it was attractive*: Traditional network isolation where the database has no public IP address.
- *Why it lost*:
  - **High Architectural Complexity**: Requires dedicated Global Address allocations, Service Networking peering connections, and explicit DNS route propagation across projects.
  - **Teardown & Deletion Latency**: PSA peering retains reservations in Google's internal networking plane, causing Terraform destroy operations to frequently hang or fail with dependency locks.
  - **Zero Incremental Security Over Auth Proxy**: Cloud SQL Auth Proxy automatically enforces 256-bit AES TLS encryption with ephemeral client/server certificate rotation and verifies caller IAM identity, ensuring that only authenticated Cloud Run containers can connect regardless of IP routing.

### Alternative B: Serverless VPC Access Connector
Deploy a Serverless VPC Access connector (`google_vpc_access_connector`) to bridge Cloud Run to the VPC.
- *Why it was attractive*: Established legacy standard for connecting Serverless services to Google Cloud VPC networks.
- *Why it lost*:
  - **Unnecessary Idle Cost**: Requires a minimum of 2 to 3 `f1-micro` or `e2-micro` instances running 24/7, costing \$18-\$35/month, violating scale-to-zero FinOps principles.
  - **Throughput Bottlenecks**: Connector instances introduce additional latency hops and bandwidth limits (200 Mbps–1 Gbps) compared to native Direct VPC Egress subnetwork interfaces.

## Consequences

### Positive
- **No IP Whitelisting Needed**: Cloud SQL does not require whitelisting dynamic Cloud Run IP ranges or managing public firewall openings.
- **Mutual TLS & IAM Validation**: All database connections are cryptographically authenticated via Google IAM and encrypted in transit.
- **Fast and Clean Infrastructure Teardown**: Eliminates PSA peering locks, allowing rapid and reproducible CI/CD Terraform creation and destruction in under 60 seconds.
- **Predictable Egress Routing**: Outbound calls to Vertex AI and Google APIs exit through the dedicated `version1-nat` gateway with static IP routing.

### Negative / Accepted Trade-offs
- Cloud SQL instance has a public IP address allocated, but direct public access is denied because authorized networks are empty (`0.0.0.0/0` is not authorized) and connections require IAM-signed proxy certificates.

### Risks (and mitigations)
- Auth Proxy socket mount unavailability $\to$ Cloud Run health checks verify `/healthz` container readiness; instance auto-restarts if Unix socket is unmounted.

## Conditions to Revisit
- If enterprise corporate security policy strictly forbids public IP allocation on managed database instances under any circumstances, migrate to Private IP with Private Service Connect (PSC) or PSA.

## References
- [docs/design/TDD.md](../design/TDD.md)
- [deployment/terraform/cicd/network.tf](../../deployment/terraform/cicd/network.tf)
- [deployment/terraform/cicd/service.tf](../../deployment/terraform/cicd/service.tf)
- Google Cloud Run Direct VPC Egress Documentation

## Changelog
- 2026-08-28: Initial proposal and acceptance.
