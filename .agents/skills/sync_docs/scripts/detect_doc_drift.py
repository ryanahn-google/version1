#!/usr/bin/env python3
"""Detects drift between modified code files and codebase documentation.

Scans the git working tree or commit range for code modifications and verifies
that the corresponding architecture and design documentation (TDD.md, ADRs,
OpenAPI contracts, README.md, etc.) have been updated in tandem.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

# Rule table mapping code path regex patterns to documentation requirements.
DOC_MAPPING_RULES: list[dict[str, Any]] = [
    {
        "category": "Backend API & Routing",
        "pattern": r"^(app/routers/|app/fast_api_app\.py|app/main\.py|app/schemas/)",
        "impacted_docs": [
            "api/openapi.yaml",
            "docs/design/TDD.md",
            "docs/design/SCOPING.md",
        ],
        "rationale": (
            "API endpoints, request/response models, or route changes require "
            "updating the OpenAPI 3.1 contract and TDD Section 10 (APIs)."
        ),
    },
    {
        "category": "Data Models & DB Migrations",
        "pattern": r"^(app/models/|alembic/|app/session_repo\.py)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md",
        ],
        "rationale": (
            "Database schema migrations, table definitions, or session store "
            "changes require updating TDD Section 9 (Data Model) and ADR-0003."
        ),
    },
    {
        "category": "Subagents & Reasoning Engine Runtimes",
        "pattern": r"^(app/agents/|scripts/deploy_subagents\.sh)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "docs/adr/0001-ai-multi-agent-pattern.md",
            "docs/adr/0002-model-selection-and-location-pinning.md",
            "docs/EVAL.md",
        ],
        "rationale": (
            "Subagent prompt logic, deliverables, or runtime deployments "
            "require updating TDD Sections 2 & 8, ADR-0001/0002, and EVAL.md."
        ),
    },
    {
        "category": "Orchestration & Workflow Engine",
        "pattern": r"^(app/orchestrator/|app/campaign_runner\.py|app/agent_runner\.py)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "docs/adr/0003-dual-mode-a2a-and-hybrid-session-persistence.md",
        ],
        "rationale": (
            "DAG stage lifecycles, review actions, rollback logic, or bridge "
            "execution require updating TDD Section 4 (DAG) and Section 8."
        ),
    },
    {
        "category": "Infrastructure & Terraform IaC",
        "pattern": r"^(deployment/terraform/|\.cloudbuild/|Dockerfile)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "docs/adr/0004-multi-project-cicd-pipeline-and-approval-gate.md",
            "docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md",
            "docs/adr/0006-hybrid-generated-asset-storage.md",
        ],
        "rationale": (
            "Cloud Run, VPC, Cloud SQL, GCS, IAM, or CI/CD changes require "
            "updating TDD Sections 7, 11, & 14 and corresponding ADRs."
        ),
    },
    {
        "category": "Security, Guardrails & Network",
        "pattern": r"^(app/security\.py|deployment/terraform/cicd/model_armor\.tf)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "docs/runbooks/incident-response.md",
            "docs/adr/0005-direct-vpc-egress-and-cloud-sql-auth-proxy.md",
        ],
        "rationale": (
            "Model Armor templates, auth token verification, or network policies "
            "require updating TDD Section 11 and incident runbooks."
        ),
    },
    {
        "category": "Frontend UI & SPA",
        "pattern": r"^(frontend/src/)",
        "impacted_docs": [
            "docs/design/FRONTEND.md",
            "docs/design/TDD.md",
            "README.md",
        ],
        "rationale": (
            "UI layouts, stage stepper views, deliverable editors, or styling "
            "require updating FRONTEND.md, TDD Section 8, and README.md."
        ),
    },
    {
        "category": "Evaluation, Benchmarks & Quality Gates",
        "pattern": r"^(eval/|tests/eval/|scripts/eval_gate\.py)",
        "impacted_docs": [
            "docs/EVAL.md",
            "docs/adr/0008-agent-platform-eval-and-deployment-quality-gate.md",
        ],
        "rationale": (
            "Evaluation scenarios, LLM judge scoring, or quality gates "
            "require updating EVAL.md and ADR-0008."
        ),
    },
    {
        "category": "Application Configuration & Core Settings",
        "pattern": r"^(app/settings\.py|\.env\.example)",
        "impacted_docs": [
            "docs/design/TDD.md",
            "README.md",
            "docs/runbooks/model-swap.md",
        ],
        "rationale": (
            "Environment variables and settings require updating TDD Section 10 "
            "and README.md setup instructions."
        ),
    },
]


def get_git_modified_files(
    repo_root: Path, base_ref: str | None = None
) -> tuple[list[str], list[str]]:
    """Retrieves modified files from git status and git diff.

    Args:
        repo_root: Root directory of the git repository.
        base_ref: Optional base git reference to diff against.

    Returns:
        A tuple of (staged_or_unstaged_files, committed_diff_files).
    """
    working_files: set[str] = set()

    # 1. Inspect uncommitted working tree and index changes.
    status_cmd = ["git", "status", "--porcelain"]
    try:
        res = subprocess.run(
            status_cmd,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=True,
        )
        for line in res.stdout.splitlines():
            if not line.strip():
                continue
            # Porcelain format: XY path or XY old -> new
            path_part = line[3:].strip()
            if " -> " in path_part:
                path_part = path_part.split(" -> ")[-1]
            working_files.add(path_part)
    except subprocess.SubprocessError:
        pass

    # 2. Inspect committed changes if base_ref provided.
    committed_files: set[str] = set()
    if base_ref:
        diff_cmd = ["git", "diff", "--name-only", f"{base_ref}...HEAD"]
        try:
            res = subprocess.run(
                diff_cmd,
                cwd=str(repo_root),
                capture_output=True,
                text=True,
                check=True,
            )
            for line in res.stdout.splitlines():
                if line.strip():
                    committed_files.add(line.strip())
        except subprocess.SubprocessError:
            pass

    return sorted(working_files), sorted(committed_files)


def is_doc_file(filepath: str) -> bool:
    """Checks if a filepath corresponds to documentation or guidelines.

    Args:
        filepath: Relative filepath string.

    Returns:
        True if the file is documentation, False otherwise.
    """
    if filepath.endswith(".md") or filepath.endswith(".html"):
        return True
    if filepath.startswith("docs/"):
        return True
    if filepath == "api/openapi.yaml":
        return True
    return False


def analyze_drift(modified_files: list[str], repo_root: Path) -> dict[str, Any]:
    """Analyzes modified files against documentation synchronization rules.

    Args:
        modified_files: List of all modified relative filepaths.
        repo_root: Root path of the repository.

    Returns:
        A dictionary containing categorized findings and drift status.
    """
    del repo_root  # Unused reserved parameter
    touched_docs: set[str] = {f for f in modified_files if is_doc_file(f)}

    # Group modified code files by category
    categorized_code: dict[str, list[str]] = {}
    triggered_rules: dict[str, dict[str, Any]] = {}

    for filepath in modified_files:
        if is_doc_file(filepath):
            continue
        # Skip internal cache or generated artifacts
        if "__pycache__" in filepath or filepath.endswith(".pyc"):
            continue
        if filepath.startswith(".agents/") and not filepath.startswith(
            ".agents/AGENTS.md"
        ):
            continue

        matched_any = False
        for rule in DOC_MAPPING_RULES:
            if re.search(rule["pattern"], filepath):
                cat = rule["category"]
                categorized_code.setdefault(cat, []).append(filepath)
                triggered_rules[cat] = rule
                matched_any = True

        if not matched_any and not filepath.startswith("."):
            categorized_code.setdefault("General Application Code", []).append(filepath)

    findings: list[dict[str, Any]] = []
    has_unaddressed_drift = False

    for cat, code_files in categorized_code.items():
        rule = triggered_rules.get(cat)
        if not rule:
            continue

        impacted_docs = rule["impacted_docs"]
        synced_docs = [doc for doc in impacted_docs if doc in touched_docs]
        missing_docs = [doc for doc in impacted_docs if doc not in touched_docs]

        # Check if at least one primary doc was updated for this category
        is_synced = len(synced_docs) > 0
        if not is_synced:
            has_unaddressed_drift = True

        findings.append(
            {
                "category": cat,
                "code_files_count": len(code_files),
                "sample_code_files": code_files[:4],
                "impacted_docs": impacted_docs,
                "synced_docs": synced_docs,
                "missing_docs": missing_docs,
                "status": "SYNCED" if is_synced else "DRIFT_DETECTED",
                "rationale": rule["rationale"],
            }
        )

    return {
        "total_modified_files": len(modified_files),
        "total_modified_docs": len(touched_docs),
        "modified_docs_list": sorted(touched_docs),
        "findings": findings,
        "has_drift": has_unaddressed_drift,
    }


def format_text_report(analysis: dict[str, Any]) -> str:
    """Formats the drift analysis dictionary into a human-readable report.

    Args:
        analysis: Analysis output dictionary.

    Returns:
        Formatted multi-line report string.
    """
    lines: list[str] = [
        "============================================================",
        "  Codebase Documentation Drift Analysis Report",
        "============================================================",
        f"Modified Files: {analysis['total_modified_files']} "
        f"(Docs modified: {analysis['total_modified_docs']})",
        "",
    ]

    if not analysis["findings"]:
        lines.append("No application or infrastructure code modifications detected.")
        return "\n".join(lines)

    for item in analysis["findings"]:
        status_marker = (
            "[OK: SYNCED]" if item["status"] == "SYNCED" else "[!] DRIFT DETECTED"
        )
        lines.append(f"Category: {item['category']} {status_marker}")
        lines.append(f"  Rationale: {item['rationale']}")
        lines.append("  Modified Code:")
        for cf in item["sample_code_files"]:
            lines.append(f"    - {cf}")
        if item["code_files_count"] > len(item["sample_code_files"]):
            lines.append(
                f"    - ... and {item['code_files_count'] - len(item['sample_code_files'])} more"
            )

        if item["synced_docs"]:
            lines.append("  Synced Docs:")
            for sd in item["synced_docs"]:
                lines.append(f"    * {sd}")

        if item["missing_docs"]:
            lines.append("  Unsynced Doc Targets:")
            for md in item["missing_docs"]:
                lines.append(f"    - {md}")
        lines.append("")

    lines.append("------------------------------------------------------------")
    if analysis["has_drift"]:
        lines.append(
            "Result: DRIFT DETECTED. Some code changes lack corresponding doc updates."
        )
    else:
        lines.append("Result: ALL CLEAN. All code changes have matching doc updates.")
    lines.append("------------------------------------------------------------")
    return "\n".join(lines)


def main() -> int:
    """Main entrypoint for detect_doc_drift CLI.

    Returns:
        Exit code: 0 on success/clean, 1 if drift detected with --check.
    """
    parser = argparse.ArgumentParser(
        description="Detect drift between modified code and documentation."
    )
    parser.add_argument(
        "--base",
        type=str,
        default=None,
        help="Base git reference/commit to diff against (e.g. main or HEAD~1).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit with code 1 if unaddressed documentation drift is detected.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format.",
    )
    args = parser.parse_args()

    repo_root = Path.cwd()
    working_files, committed_files = get_git_modified_files(
        repo_root, base_ref=args.base
    )
    all_files = sorted(set(working_files + committed_files))

    analysis = analyze_drift(all_files, repo_root)

    if args.json:
        print(json.dumps(analysis, indent=2))
    else:
        print(format_text_report(analysis))

    if args.check and analysis["has_drift"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
