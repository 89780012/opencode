---
name: project-manager
description: 管理 `.project-state/` 项目记忆的恢复、保存与校验。用于持续任务开工前恢复上下文，收尾前落盘交接状态。
---

# Project Manager

这个 skill 只负责项目记忆协议，不负责业务实现。

它的目标是把持续任务的上下文固定到工作区里的 `.project-state/`，并且把这套流程锚定到可验证的 MCP 工具，而不是只靠提示词约定。

## 强制链路

对于持续开发、调试、审查、交付这类会跨多轮推进的任务，默认顺序是：

1. `resume_project_state` 或 `init_project_state`
2. `workspace-analyzer / save_analysis / strategy-flowchart-generator / save_flowchart`（需要时）
3. `smartx-develop`
4. `smartx-debug`
5. `save_project_state`
6. 最终总结 / 交接

只读问答、纯解释、纯检索可以不启用这套协议；一旦进入持续推进，就必须走完整链路。

## MCP 工具协议

### 1. 开工前恢复

如果 `.project-state/` 已存在，必须先调用：

```json
{
  "tool": "resume_project_state",
  "workspacePath": "<workspace>"
}
```

如果 `.project-state/` 不存在，必须先调用：

```json
{
  "tool": "init_project_state",
  "workspacePath": "<workspace>",
  "project": "<project-name>",
  "phase": "implementation",
  "status": "in-progress",
  "current": "<current-task>"
}
```

在恢复或初始化完成前，不要进入实现、调试、审查或最终收口。

### 2. 过程中读取/校验

需要只读查看当前项目记忆时，调用：

- `get_project_state`

怀疑 `.project-state/` 缺文件、坏结构、需要补齐模板文件时，调用：

- `validate_project_state`

### 3. 收尾前保存

如果本轮产生了新的进展、代码修改、待办变化、风险信息或验证结果，结束前必须调用：

```json
{
  "tool": "save_project_state",
  "workspacePath": "<workspace>",
  "phase": "<phase>",
  "status": "<status>",
  "current": "<current-task>",
  "summary": "<what changed>",
  "next": ["<next step 1>", "<next step 2>"],
  "risks": ["<risk 1>"],
  "verified": true,
  "dirty": false
}
```

`save_project_state` 成功前，不要把本轮任务当成已经正式交接完成。

## 文件约定

`.project-state/` 目录下有四个核心文件：

- `feature-list.json`: 人类可读的任务列表
- `progress.md`: 人类可读的当前进展
- `session-log.md`: 追加式会话日志
- `state.json`: 机器可读的当前状态源

其中：

- `state.json` 是 workflow / service 校验的机器源
- `feature-list.json` 的 `status` 只允许：`pending` / `in-progress` / `done` / `blocked`
- `progress.md` 和 `session-log.md` 负责给人看，不作为强校验源

## 推荐状态字段

`state.json` 推荐至少包含：

- `phase`
- `status`
- `current`
- `summary`
- `next`
- `risks`
- `verified`
- `dirty`
- `updated_at`

## 异常处理

- `.project-state/` 缺失：持续任务必须初始化，不能直接跳过
- 只缺部分文件：优先调用 `validate_project_state`
- 状态冲突：以最近一次成功的 `save_project_state` 为准
- 工作区还要继续推进：可以先不保存，但在最终总结前必须补保存

## 本地资源

- 模板：`templates/feature-list.json`
- 模板：`templates/progress.md`
- 模板：`templates/session-log.md`
- 模板：`templates/state.json`
- 校验：`scripts/validate_state.py`
- 校验：`scripts/validate_state.js`

## 手动校验

```bash
python scripts/validate_state.py <workspace>
```

或：

```bash
node scripts/validate_state.js <workspace>
```
