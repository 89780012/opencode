from __future__ import annotations

import json
import sys
from pathlib import Path


req = ("project", "created", "features")
task = ("id", "name", "description", "status", "priority", "dependencies")
status = {"pending", "in-progress", "done", "blocked"}
mark = ("更新时间", "当前阶段", "下一步")
note = ("会话目标", "执行动作", "当前结果", "下一步")


def fail(msg: str) -> int:
    print(f"[错误] {msg}")
    return 1


def ok(msg: str) -> None:
    print(f"[通过] {msg}")


def lines(text: str) -> list[str]:
    return text.splitlines()


def section(text: str, name: str) -> list[str] | None:
    row = lines(text)
    for i, line in enumerate(row):
        if line.strip() != f"## {name}":
            continue
        body: list[str] = []
        for item in row[i + 1 :]:
            if item.strip().startswith("## "):
                break
            body.append(item)
        return body
    return None


def has(row: list[str], name: str) -> bool:
    return any(item.strip().startswith(f"- {name}：") or item.strip().startswith(f"- {name}:") for item in row)


def check_progress(text: str) -> int | None:
    row = [line.strip() for line in lines(text) if line.strip()]
    top = next((line for line in row if line.startswith("## ")), None)
    if top != "## 最新状态":
        return fail("progress.md 顶部必须先出现 `## 最新状态`")

    body = section(text, "最新状态")
    if body is None:
        return fail("progress.md 缺少 `## 最新状态` 段落")

    miss = [name for name in mark if not has(body, name)]
    if miss:
        return fail(f"progress.md 的“最新状态”缺少字段: {', '.join(miss)}")
    return None


def check_log(text: str) -> int | None:
    row = lines(text)
    head = [(i, line.strip()) for i, line in enumerate(row) if line.strip().startswith("## ")]
    if not head:
        return fail("session-log.md 至少要有一条 `## 时间` 记录")

    for n, (i, line) in enumerate(head, start=1):
        if not line.removeprefix("## ").strip():
            return fail(f"session-log.md 第 {n} 条记录缺少时间标题")
        end = head[n][0] if n < len(head) else len(row)
        body = row[i + 1 : end]
        miss = [name for name in note if not has(body, name)]
        if miss:
            return fail(f"session-log.md 第 {n} 条记录缺少字段: {', '.join(miss)}")
    return None


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

    prog = files["progress.md"].read_text(encoding="utf-8").strip()
    if not prog:
        return fail("progress.md 不能为空")
    err = check_progress(prog)
    if err:
        return err
    ok("progress.md 结构合法")

    log = files["session-log.md"].read_text(encoding="utf-8").strip()
    if not log:
        return fail("session-log.md 不能为空")
    err = check_log(log)
    if err:
        return err
    ok("session-log.md 结构合法")

    print("[完成] 项目状态文件校验通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
