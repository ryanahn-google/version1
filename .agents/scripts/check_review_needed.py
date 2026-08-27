#!/usr/bin/env python3
"""Hook script to enforce running ponytail-review after code modifications."""

import json
import os
import sys


def main():
    try:
        input_data = json.load(sys.stdin)
    except Exception:
        # Default allow on stdin read failure
        print(json.dumps({"decision": "allow"}))
        return

    transcript_path = input_data.get("transcriptPath", "")
    if not transcript_path or not os.path.isfile(transcript_path):
        print(json.dumps({"decision": "allow"}))
        return

    code_edit_tools = {
        "write_to_file",
        "replace_file_content",
        "multi_replace_file_content",
        "notebook_edit",
    }

    last_edit_step = -1
    last_review_step = -1
    stop_reminded_count = 0

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

                # Check for code modification tools
                for tc in tool_calls:
                    tool_name = tc.get("name", "")
                    if tool_name in code_edit_tools:
                        last_edit_step = step_idx
                    elif tool_name == "view_file":
                        args = tc.get("args", {})
                        path = args.get("AbsolutePath", "")
                        if "ponytail-review" in path:
                            last_review_step = step_idx

                # Check content for review keywords or ponytail-review executions
                content = step.get("content", "")
                if "ponytail-review" in content or "ponytail review" in content.lower():
                    last_review_step = step_idx

                # Check if stop reminder was already injected
                if "ponytail-review has not been executed yet" in content:
                    stop_reminded_count += 1
    except Exception:
        print(json.dumps({"decision": "allow"}))
        return

    # If code was modified after the last review and we haven't already reminded twice:
    if (
        last_edit_step > -1
        and last_edit_step > last_review_step
        and stop_reminded_count < 2
    ):
        output = {
            "decision": "continue",
            "reason": (
                "Code changes were detected in this session, but the "
                "'ponytail-review' skill has not been run and reported yet. "
                "Please execute the 'ponytail-review' skill to check for "
                "over-engineering and report the review results before finishing."
            ),
        }
        print(json.dumps(output))
    else:
        print(json.dumps({"decision": "allow"}))


if __name__ == "__main__":
    main()
