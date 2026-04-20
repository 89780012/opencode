from __future__ import annotations

import json
import sys
from pathlib import Path


req = ("project", "created", "features")
task = ("id", "name", "description", "status", "priority", "dependencies")
status = {"pending", "in-progress", "done", "blocked"}


def fail(msg: str) -> int:
    print(f"[错误] {msg}")
    return 1


def ok(msg: str) -> None:
    print(f"[通过] {msg}")


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    state = root / ".project-state"
    if not state.exists():
        return fail(f"未找到状态目录: {state}")

    files = {
        "feature-list.json": state / "feature-list.json",
        "progress.md": state / "progress.md",
        "session-log.md": state / "session-log.md",
    }
    miss = [name for name, file in files.items() if not file.exists()]
    if miss:
        return fail(f"缺少状态文件: {', '.join(miss)}")

    ok("状态目录和基础文件存在")

    try:
        data = json.loads(files["feature-list.json"].read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        return fail(f"feature-list.json 不是合法 JSON: {err}")

    miss = [key for key in req if key not in data]
    if miss:
        return fail(f"feature-list.json 缺少字段: {', '.join(miss)}")

    if not isinstance(data["features"], list):
        return fail("feature-list.json 的 features 必须是数组")

    for i, item in enumerate(data["features"], start=1):
        if not isinstance(item, dict):
            return fail(f"第 {i} 个任务不是对象")
        miss = [key for key in task if key not in item]
        if miss:
            return fail(f"第 {i} 个任务缺少字段: {', '.join(miss)}")
        if item["status"] not in status:
            return fail(f"第 {i} 个任务的 status 非法: {item['status']}")
        if not isinstance(item["dependencies"], list):
            return fail(f"第 {i} 个任务的 dependencies 必须是数组")

    ok("feature-list.json 结构合法")

    for name in ("progress.md", "session-log.md"):
        text = files[name].read_text(encoding="utf-8").strip()
        if not text:
            return fail(f"{name} 不能为空")
        ok(f"{name} 可读取且非空")

    print("[完成] 项目状态文件校验通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
