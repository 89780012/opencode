from __future__ import annotations

import json
import sys
from pathlib import Path


FILES = ("feature-list.json", "progress.md", "session-log.md", "state.json")
TASK = ("id", "name", "description", "status", "priority", "dependencies")
TASK_STATUS = {"pending", "in-progress", "done", "blocked"}
STATE_STATUS = {"pending", "in-progress", "done", "blocked", "running", "ready"}


def fail(msg: str) -> int:
    print(f"[error] {msg}")
    return 1


def ok(msg: str) -> None:
    print(f"[ok] {msg}")


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    state = root / ".project-state"
    if not state.exists():
        return fail(f"missing .project-state at {state}")

    miss = [name for name in FILES if not (state / name).exists()]
    if miss:
        return fail(f"missing files: {', '.join(miss)}")
    ok("project-state files exist")

    feature = json.loads((state / "feature-list.json").read_text(encoding="utf-8"))
    if not isinstance(feature, dict):
        return fail("feature-list.json must be an object")
    if not isinstance(feature.get("project"), str) or not feature["project"].strip():
        return fail("feature-list.json.project is required")
    if not isinstance(feature.get("created"), str) or not feature["created"].strip():
        return fail("feature-list.json.created is required")
    if not isinstance(feature.get("features"), list):
        return fail("feature-list.json.features must be an array")

    for i, item in enumerate(feature["features"], start=1):
        if not isinstance(item, dict):
            return fail(f"feature {i} must be an object")
        miss = [key for key in TASK if key not in item]
        if miss:
            return fail(f"feature {i} missing fields: {', '.join(miss)}")
        if item["status"] not in TASK_STATUS:
            return fail(f"feature {i} has invalid status: {item['status']}")
        if not isinstance(item["dependencies"], list):
            return fail(f"feature {i}.dependencies must be an array")
    ok("feature-list.json is valid")

    doc = json.loads((state / "state.json").read_text(encoding="utf-8"))
    if not isinstance(doc, dict):
        return fail("state.json must be an object")
    if not isinstance(doc.get("phase"), str) or not doc["phase"].strip():
        return fail("state.json.phase is required")
    if not isinstance(doc.get("status"), str) or doc["status"] not in STATE_STATUS:
        return fail(f"state.json.status is invalid: {doc.get('status')}")
    if not isinstance(doc.get("current"), str) or not doc["current"].strip():
        return fail("state.json.current is required")
    if not isinstance(doc.get("next"), list):
        return fail("state.json.next must be an array")
    if not isinstance(doc.get("risks"), list):
        return fail("state.json.risks must be an array")
    if not isinstance(doc.get("verified"), bool):
        return fail("state.json.verified must be a boolean")
    if not isinstance(doc.get("dirty"), bool):
        return fail("state.json.dirty must be a boolean")
    if not isinstance(doc.get("updated_at"), int):
        return fail("state.json.updated_at must be an integer")
    ok("state.json is valid")

    progress = (state / "progress.md").read_text(encoding="utf-8").strip()
    if not progress:
        return fail("progress.md cannot be empty")
    if "#" not in progress:
        return fail("progress.md should contain at least one markdown heading")
    ok("progress.md is non-empty")

    log = (state / "session-log.md").read_text(encoding="utf-8").strip()
    if not log:
        return fail("session-log.md cannot be empty")
    if "## " not in log:
        return fail("session-log.md should contain at least one section heading")
    ok("session-log.md is non-empty")

    print("[done] project state validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
