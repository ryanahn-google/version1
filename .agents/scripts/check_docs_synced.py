#!/usr/bin/env python3
"""Hook script to enforce codebase documentation sync after code modifications.

Executes during the Jetski agent's Stop lifecycle event. If code files were
modified in the current session without corresponding documentation updates
(or without executing the sync-docs skill), this hook commands the agent to
continue and reconcile documentation before concluding.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

# Tools that modify file contents.
CODE_EDIT_TOOLS: set[str] = {
    "write_to_file",
    "replace_file_content",
    "multi_replace_file_content",
    "notebook_edit",
}

# Regex to identify documentation files.
DOC_FILE_REGEX = re.compile(r"(^docs/|\.md$|\.html$|^api/openapi\.yaml$|^README\.md$)")


def is_doc_path(filepath: str) -> bool:
    """Checks if a file path is considered a documentation target.

    Args:
        filepath: Absolute or relative file path string.

    Returns:
        True if the file is documentation, False otherwise.
    """
    normalized = filepath.replace("\\", "/")
    return bool(DOC_FILE_REGEX.search(normalized))


def get_git_code_and_doc_changes(
    repo_root: Path,
) -> tuple[list[str], list[str]]:
    """Inspects git status for modified code and documentation files.

    Args:
        repo_root: Path to the repository root directory.

    Returns:
        Tuple of (modified_code_files, modified_doc_files).
    """
    code_files: list[str] = []
    doc_files: list[str] = []

    try:
        res = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=True,
        )
        for line in res.stdout.splitlines():
            if not line.strip():
                continue
            path_part = line[3:].strip()
            if " -> " in path_part:
                path_part = path_part.split(" -> ")[-1]
            if is_doc_path(path_part):
                doc_files.append(path_part)
            else:
                # Ignore .agents/ internal files and caches
                if (
                    not path_part.startswith(".agents/")
                    and "__pycache__" not in path_part
                    and not path_part.endswith(".pyc")
                ):
                    code_files.append(path_part)
    except subprocess.SubprocessError:
        pass

    return code_files, doc_files


def inspect_transcript(
    transcript_path: str,
) -> tuple[int, int, int]:
    """Analyzes the session transcript for code edits, doc syncs, and reminders.

    Args:
        transcript_path: Absolute path to transcript.jsonl.

    Returns:
        Tuple of (last_code_edit_step, last_doc_sync_step, stop_reminded_count).
    """
    last_code_edit_step = -1
    last_doc_sync_step = -1
    stop_reminded_count = 0

    if not transcript_path or not os.path.isfile(transcript_path):
        return last_code_edit_step, last_doc_sync_step, stop_reminded_count

    try:
        with open(transcript_path, encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    step = json.loads(line)
                except Exception:
                    continue

                step_idx = step.get("step_index", 0)
                tool_calls = step.get("tool_calls") or []

                for tc in tool_calls:
                    name = tc.get("name", "")
                    args = tc.get("args", {})

                    if name in CODE_EDIT_TOOLS:
                        target = (
                            args.get("TargetFile") or args.get("NotebookPath") or ""
                        )
                        if is_doc_path(target):
                            last_doc_sync_step = step_idx
                        else:
                            last_code_edit_step = step_idx

                    elif name == "view_file":
                        path = args.get("AbsolutePath", "")
                        if "sync_docs" in path or "sync-docs" in path:
                            last_doc_sync_step = step_idx

                    elif name == "run_command":
                        cmd = args.get("CommandLine", "")
                        if (
                            "detect_doc_drift.py" in cmd
                            or "sync-docs" in cmd
                            or "sync_docs" in cmd
                        ):
                            last_doc_sync_step = step_idx

                # Check textual content
                content = step.get("content", "")
                if "sync-docs" in content or "detect_doc_drift.py" in content:
                    last_doc_sync_step = step_idx

                if "codebase documentation has not been synchronized yet" in content:
                    stop_reminded_count += 1
    except Exception:
        pass

    return last_code_edit_step, last_doc_sync_step, stop_reminded_count


def main() -> None:
    """Main lifecycle handler for enforce-docs-sync hook."""
    try:
        input_data: dict[str, Any] = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"decision": "allow"}))
        return

    transcript_path = input_data.get("transcriptPath", "")
    workspace_paths = input_data.get("workspacePaths", [])
    repo_root = Path(workspace_paths[0]) if workspace_paths else Path.cwd()

    last_code_edit, last_doc_sync, stop_reminded_count = inspect_transcript(
        transcript_path
    )

    # Check git status for uncommitted code changes
    code_changes, doc_changes = get_git_code_and_doc_changes(repo_root)

    # Determine if doc sync is required:
    # 1. Code was modified after the last doc sync step in the session, OR
    # 2. Uncommitted code changes exist in git while no docs are modified.
    needs_sync = False
    if (
        last_code_edit > -1
        and last_code_edit > last_doc_sync
        and stop_reminded_count < 2
    ):
        needs_sync = True
    elif (
        code_changes
        and not doc_changes
        and last_doc_sync == -1
        and stop_reminded_count < 2
    ):
        needs_sync = True

    if needs_sync:
        sample_files = code_changes[:3] if code_changes else ["modified code"]
        files_str = ", ".join(f"`{f}`" for f in sample_files)
        output = {
            "decision": "continue",
            "reason": (
                "Code changes were detected in this session (e.g. "
                f"{files_str}), but the codebase documentation has not been "
                "synchronized yet. Please execute the 'sync-docs' skill "
                "(.agents/skills/sync_docs/SKILL.md) or run 'uv run python "
                ".agents/skills/sync_docs/scripts/detect_doc_drift.py' to "
                "identify affected documents (TDD.md, ADRs, openapi.yaml, "
                "README.md) and update them before finishing."
            ),
        }
        print(json.dumps(output))
    else:
        print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
