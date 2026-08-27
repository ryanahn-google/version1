#!/usr/bin/env python3
"""Terraform and Architecture Documentation Resource Scanner.

Extracts declared resources and key configurations from Terraform files (.tf)
and cross-references them against specifications in design documents (Markdown).
Uses Python standard library only (re, json, argparse, pathlib).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


def parse_tf_files(tf_dir: Path) -> dict[str, Any]:
    """Scans all .tf files in the directory and extracts resources and configs."""
    findings: dict[str, Any] = {
        "resources": [],
        "cloud_run_services": [],
        "cloud_sql_instances": [],
        "storage_buckets": [],
        "enabled_apis": [],
        "iam_roles": [],
        "variables": {},
    }

    tf_files = sorted(tf_dir.glob("*.tf"))
    if not tf_files:
        return findings

    resource_pattern = re.compile(
        r'resource\s+"([^"]+)"\s+"([^"]+)"\s*\{', re.MULTILINE
    )
    variable_pattern = re.compile(r'variable\s+"([^"]+)"\s*\{([^}]*)\}', re.DOTALL)

    for tf_file in tf_files:
        try:
            content = tf_file.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Warning: Could not read {tf_file}: {e}", file=sys.stderr)
            continue

        rel_path = tf_file.name

        # Extract all generic resources
        for match in resource_pattern.finditer(content):
            res_type = match.group(1)
            res_name = match.group(2)
            line_no = content.count("\n", 0, match.start()) + 1
            findings["resources"].append(
                {
                    "type": res_type,
                    "name": res_name,
                    "file": rel_path,
                    "line": line_no,
                }
            )

            # Check for APIs
            if res_type == "google_project_service":
                svc_match = re.search(
                    r'service\s*=\s*"([^"]+)"', content[match.end() : match.end() + 500]
                )
                if svc_match:
                    findings["enabled_apis"].append(
                        {
                            "service": svc_match.group(1),
                            "file": rel_path,
                            "line": line_no,
                        }
                    )

        # Extract variables with default values
        for match in variable_pattern.finditer(content):
            var_name = match.group(1)
            var_body = match.group(2)
            default_match = re.search(
                r'default\s*=\s*("([^"]+)"|([0-9]+)|true|false)', var_body
            )
            default_val = default_match.group(1) if default_match else None
            findings["variables"][var_name] = default_val

        # Specific extraction: Cloud Run Service
        cr_matches = re.finditer(
            r'resource\s+"google_cloud_run_v2_service"\s+"([^"]+)"\s*\{(.*?)\n\}(?=\n|\Z)',
            content,
            re.DOTALL,
        )
        for m in cr_matches:
            svc_name = m.group(1)
            block = m.group(2)
            line_no = content.count("\n", 0, m.start()) + 1

            cpu_match = re.search(r'cpu\s*=\s*"([^"]+)"', block)
            mem_match = re.search(r'memory\s*=\s*"([^"]+)"', block)
            concurrency_match = re.search(
                r"max_instance_request_concurrency\s*=\s*([0-9]+)", block
            )
            min_instances_match = re.search(r"min_instance_count\s*=\s*([0-9]+)", block)
            max_instances_match = re.search(r"max_instance_count\s*=\s*([0-9]+)", block)
            ingress_match = re.search(r'ingress\s*=\s*"([^"]+)"', block)
            vpc_access_match = re.search(r"vpc_access\s*\{", block)

            # Env vars
            env_vars = re.findall(r'name\s*=\s*"([^"]+)"', block)

            findings["cloud_run_services"].append(
                {
                    "name": svc_name,
                    "file": rel_path,
                    "line": line_no,
                    "cpu": cpu_match.group(1) if cpu_match else None,
                    "memory": mem_match.group(1) if mem_match else None,
                    "concurrency": (
                        int(concurrency_match.group(1)) if concurrency_match else None
                    ),
                    "min_instances": (
                        int(min_instances_match.group(1))
                        if min_instances_match
                        else None
                    ),
                    "max_instances": (
                        int(max_instances_match.group(1))
                        if max_instances_match
                        else None
                    ),
                    "ingress": ingress_match.group(1) if ingress_match else None,
                    "vpc_access": bool(vpc_access_match),
                    "env_vars": env_vars,
                }
            )

        # Specific extraction: Cloud SQL
        sql_matches = re.finditer(
            r'resource\s+"google_sql_database_instance"\s+"([^"]+)"\s*\{(.*?)\n\}(?=\n|\Z)',
            content,
            re.DOTALL,
        )
        for m in sql_matches:
            inst_name = m.group(1)
            block = m.group(2)
            line_no = content.count("\n", 0, m.start()) + 1

            version_match = re.search(r'database_version\s*=\s*"([^"]+)"', block)
            tier_match = re.search(r'tier\s*=\s*"([^"]+)"', block)
            backup_match = re.search(
                r"backup_configuration\s*\{[^}]*enabled\s*=\s*(true|false)", block
            )
            iam_auth_match = re.search(
                r'"cloudsql.iam_authentication"\s*value\s*=\s*"([^"]+)"', block
            )

            findings["cloud_sql_instances"].append(
                {
                    "name": inst_name,
                    "file": rel_path,
                    "line": line_no,
                    "database_version": (
                        version_match.group(1) if version_match else None
                    ),
                    "tier": tier_match.group(1) if tier_match else None,
                    "backup_enabled": (
                        backup_match.group(1) == "true" if backup_match else None
                    ),
                    "iam_auth": iam_auth_match.group(1) if iam_auth_match else None,
                }
            )

        # Specific extraction: GCS Buckets
        bucket_matches = re.finditer(
            r'resource\s+"google_storage_bucket"\s+"([^"]+)"\s*\{(.*?)\n\}(?=\n|\Z)',
            content,
            re.DOTALL,
        )
        for m in bucket_matches:
            b_name = m.group(1)
            block = m.group(2)
            line_no = content.count("\n", 0, m.start()) + 1

            name_attr = re.search(r'name\s*=\s*("([^"]+)"|(\$\{[^}]+\}))', block)
            location_match = re.search(r'location\s*=\s*("([^"]+)"|var\.region)', block)
            ubla_match = re.search(
                r"uniform_bucket_level_access\s*=\s*(true|false)", block
            )
            retention_match = re.search(r"retention_policy\s*\{", block)
            lifecycle_match = re.search(r"lifecycle_rule\s*\{", block)

            findings["storage_buckets"].append(
                {
                    "resource_name": b_name,
                    "file": rel_path,
                    "line": line_no,
                    "name_expression": name_attr.group(1) if name_attr else None,
                    "location": location_match.group(1) if location_match else None,
                    "uniform_bucket_level_access": (
                        ubla_match.group(1) == "true" if ubla_match else None
                    ),
                    "has_retention_policy": bool(retention_match),
                    "has_lifecycle_rule": bool(lifecycle_match),
                }
            )

    return findings


def scan_doc_specifications(doc_path: Path) -> dict[str, Any]:
    """Extracts architectural specifications mentioned in Markdown design docs."""
    specs: dict[str, Any] = {
        "cloud_run": {},
        "cloud_sql": {},
        "storage": {},
        "models": [],
        "regions": [],
        "networking": {},
    }

    if not doc_path.is_file():
        return specs

    content = doc_path.read_text(encoding="utf-8")

    # Cloud Run sizing in docs
    cpu_match = re.search(r"(\d+)\s*vCPU", content, re.IGNORECASE)
    mem_match = re.search(
        r"(\d+\s*GiB|\d+\s*GB|\d+\s*Gi)\s*RAM", content, re.IGNORECASE
    )
    concurrency_match = re.search(r"concurrency\s*=\s*(\d+)", content, re.IGNORECASE)
    min_inst_match = re.search(r"min_instances\s*=\s*(\d+)", content, re.IGNORECASE)
    max_inst_match = re.search(r"max_instances\s*=\s*(\d+)", content, re.IGNORECASE)

    if cpu_match:
        specs["cloud_run"]["cpu"] = cpu_match.group(1)
    if mem_match:
        specs["cloud_run"]["memory"] = mem_match.group(1).replace(" ", "")
    if concurrency_match:
        specs["cloud_run"]["concurrency"] = int(concurrency_match.group(1))
    if min_inst_match:
        specs["cloud_run"]["min_instances"] = int(min_inst_match.group(1))
    if max_inst_match:
        specs["cloud_run"]["max_instances"] = int(max_inst_match.group(1))

    # Cloud SQL
    sql_version_match = re.search(r"PostgreSQL\s*(\d+)", content, re.IGNORECASE)
    if sql_version_match:
        specs["cloud_sql"]["version"] = f"POSTGRES_{sql_version_match.group(1)}"

    # GCS Bucket specifications
    bucket_matches = re.findall(r"gs://([a-zA-Z0-9_\-\{\}]+)", content)
    if bucket_matches:
        specs["storage"]["buckets_mentioned"] = sorted(set(bucket_matches))

    # Retention mentions from table rows: | **GCS Bucket** | ... | ... | 30 days |
    table_retention_match = re.search(
        r"GCS Bucket.*\|\s*(\d+)\s*days?", content, re.IGNORECASE
    )
    general_retention_match = re.search(
        r"(\d+)\s*days?\s*retention", content, re.IGNORECASE
    )
    if table_retention_match:
        specs["storage"]["retention_days"] = int(table_retention_match.group(1))
    elif general_retention_match:
        specs["storage"]["retention_days"] = int(general_retention_match.group(1))

    # VPC / Networking
    if re.search(r"Direct VPC Egress", content, re.IGNORECASE):
        specs["networking"]["direct_vpc_egress"] = True
    if re.search(r"asia-northeast3-subnet", content):
        specs["networking"]["subnet"] = "asia-northeast3-subnet"

    # Region mentions
    regions = set(
        re.findall(r"(asia-[a-z0-9]+|us-[a-z0-9]+|europe-[a-z0-9]+|global)", content)
    )
    specs["regions"] = sorted(regions)

    return specs


def normalize_val(val: Any) -> str:
    """Normalizes values for comparison (e.g. 4GiB -> 4gi, 4Gi -> 4gi)."""
    if val is None:
        return ""
    s = str(val).strip().lower()
    if s.endswith("gib"):
        s = s[:-1]  # 4gib -> 4gi
    return s


def format_markdown_report(
    tf_dir: Path,
    tf_data: dict[str, Any],
    doc_path: Path | None,
    doc_data: dict[str, Any] | None,
) -> str:
    """Formats a comparison report in Markdown."""
    lines = []
    lines.append("# Terraform vs Documentation Audit Report")
    lines.append(f"- **Terraform Path**: `{tf_dir}`")
    if doc_path:
        lines.append(f"- **Design Doc**: `{doc_path}`")
    lines.append("")

    # Summary table of Cloud Run
    lines.append("## 1. Cloud Run Compute Sizing")
    if tf_data["cloud_run_services"]:
        lines.append(
            "| Service | File:Line | Config Key | Terraform Value | Doc Value | Status |"
        )
        lines.append("| :--- | :--- | :--- | :---: | :---: | :---: |")
        doc_cr = (doc_data or {}).get("cloud_run", {})

        for cr in tf_data["cloud_run_services"]:
            svc_name = cr["name"]
            loc = f"{cr['file']}:{cr['line']}"

            checks = [
                ("CPU Limit", cr.get("cpu"), doc_cr.get("cpu")),
                ("Memory Limit", cr.get("memory"), doc_cr.get("memory")),
                ("Concurrency", cr.get("concurrency"), doc_cr.get("concurrency")),
                ("Min Instances", cr.get("min_instances"), doc_cr.get("min_instances")),
                ("Max Instances", cr.get("max_instances"), doc_cr.get("max_instances")),
                (
                    "VPC Access",
                    "Enabled" if cr.get("vpc_access") else "Disabled",
                    "Direct VPC Egress"
                    if (doc_data or {}).get("networking", {}).get("direct_vpc_egress")
                    else "N/A",
                ),
            ]

            for key, tf_val, doc_val in checks:
                status = "MATCH"
                if key == "VPC Access":
                    if doc_val == "Direct VPC Egress":
                        status = "MATCH" if tf_val == "Enabled" else "**MISMATCH**"
                    else:
                        status = "MATCH"
                elif doc_val is not None:
                    if normalize_val(tf_val) != normalize_val(doc_val):
                        status = "**MISMATCH**"
                else:
                    status = "NOT_IN_DOC"

                lines.append(
                    f"| {svc_name} | `{loc}` | {key} | `{tf_val}` | `{doc_val}` | {status} |"
                )
    else:
        lines.append("_No google_cloud_run_v2_service resources found._")
    lines.append("")

    # Summary table of Cloud SQL
    lines.append("## 2. Cloud SQL Database")
    if tf_data["cloud_sql_instances"]:
        lines.append(
            "| Instance | File:Line | Config Key | Terraform Value | Doc Value | Status |"
        )
        lines.append("| :--- | :--- | :--- | :---: | :---: | :---: |")
        doc_sql = (doc_data or {}).get("cloud_sql", {})

        for inst in tf_data["cloud_sql_instances"]:
            name = inst["name"]
            loc = f"{inst['file']}:{inst['line']}"
            ver_status = (
                "MATCH"
                if (
                    not doc_sql.get("version")
                    or inst.get("database_version") == doc_sql.get("version")
                )
                else "**MISMATCH**"
            )

            lines.append(
                f"| {name} | `{loc}` | Database Version | `{inst.get('database_version')}` | `{doc_sql.get('version')}` | {ver_status} |"
            )
            lines.append(
                f"| {name} | `{loc}` | Machine Tier | `{inst.get('tier')}` | - | - |"
            )
            lines.append(
                f"| {name} | `{loc}` | IAM Auth | `{inst.get('iam_auth')}` | - | - |"
            )
            lines.append(
                f"| {name} | `{loc}` | Backup Enabled | `{inst.get('backup_enabled')}` | - | - |"
            )
    else:
        lines.append("_No google_sql_database_instance resources found._")
    lines.append("")

    # Summary table of Storage
    lines.append("## 3. Storage Buckets & Retention")
    if tf_data["storage_buckets"]:
        lines.append(
            "| Bucket Resource | File:Line | Name Expr | Uniform Access | Lifecycle/Retention | Doc Retention | Status |"
        )
        lines.append("| :--- | :--- | :--- | :---: | :---: | :---: | :---: |")
        doc_ret = (doc_data or {}).get("storage", {}).get("retention_days")

        for b in tf_data["storage_buckets"]:
            loc = f"{b['file']}:{b['line']}"
            has_ret = b.get("has_lifecycle_rule") or b.get("has_retention_policy")
            status = "MATCH" if (not doc_ret or has_ret) else "**MISSING_POLICY**"

            lines.append(
                f"| {b['resource_name']} | `{loc}` | `{b.get('name_expression')}` | `{b.get('uniform_bucket_level_access')}` | `{'Yes' if has_ret else 'None'}` | `{doc_ret} days` | {status} |"
            )

        if doc_data and doc_data.get("storage", {}).get("buckets_mentioned"):
            lines.append("")
            lines.append("**Buckets Mentioned in Docs:**")
            for b_mention in doc_data["storage"]["buckets_mentioned"]:
                lines.append(f"- `gs://{b_mention}`")
    else:
        lines.append("_No google_storage_bucket resources found._")
    lines.append("")

    # All Resources Inventory
    lines.append("## 4. Full Terraform Resource Inventory")
    lines.append("| Resource Type | Resource Name | File:Line |")
    lines.append("| :--- | :--- | :--- |")
    for res in tf_data["resources"]:
        lines.append(
            f"| `{res['type']}` | `{res['name']}` | `{res['file']}:{res['line']}` |"
        )

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan Terraform configurations against design documentation."
    )
    parser.add_argument(
        "tf_dir", type=Path, help="Directory containing Terraform (.tf) files"
    )
    parser.add_argument(
        "--doc",
        type=Path,
        default=None,
        help="Optional path to Markdown design document",
    )
    parser.add_argument(
        "--json", action="store_true", help="Output raw JSON instead of Markdown"
    )

    args = parser.parse_args()

    if not args.tf_dir.is_dir():
        print(f"Error: {args.tf_dir} is not a valid directory.", file=sys.stderr)
        sys.exit(1)

    tf_findings = parse_tf_files(args.tf_dir)

    doc_specs = None
    if args.doc:
        doc_specs = scan_doc_specifications(args.doc)

    if args.json:
        output = {
            "terraform": tf_findings,
            "doc_specs": doc_specs,
        }
        print(json.dumps(output, indent=2))
    else:
        print(format_markdown_report(args.tf_dir, tf_findings, args.doc, doc_specs))


if __name__ == "__main__":
    main()
