# `@opencode-ai/smartx-workflow`

`smartx-workflow` 是给 SmartX 策略开发流程加顺序约束的插件。

现在它维护两条约束轴：

1. workspace baseline 约束
2. project memory 约束

## 1. Workspace Baseline 约束

workspace baseline 由两份产物组成：

1. `workspace-analyzer` 生成并保存的 workspace analysis
2. `strategy-flowchart-generator` 生成并保存的 flowchart

### 初始化阶段

一个工作区第一次进入持续工作前，必须先完成：

1. `workspace-analyzer`
2. `smartx_save_analysis`
3. `strategy-flowchart-generator`
4. `smartx_save_flowchart`

初始化完成前：

- 可以读文件、搜索、列目录
- 不允许写代码
- 不允许执行会改变工作区状态的动作

### dirty 阶段

主会话里只要发生成功写入或执行，workspace 会被标成 `dirty`。

`dirty` 表示：

- 已保存的 analysis / flowchart 已过期
- 但开发、调试、验证还可以继续

当进入 review 或 final wrap-up 时，workflow 会要求刷新 baseline。

## 2. Project Memory 约束

project memory 使用 `.project-state/` 作为工作区记忆。

它有独立生命周期：

- `missing`: `.project-state/` 不存在
- `ready`: 当前会话已经恢复或初始化项目记忆
- `stale`: 本轮工作产生了新推进，但还没重新保存

### 强制协议

持续型任务默认顺序：

1. `resume_project_state` 或 `init_project_state`
2. baseline 初始化 / 刷新（需要时）
3. `smartx-develop`
4. `save_project_state`
6. 最终总结

### 恢复规则

在 project memory 尚未恢复时：

- 允许：`read` / `grep` / `list` / `codesearch` / `get_project_state` / `validate_project_state`
- 阻止：写代码、执行命令、审查、调试、最终收口

如果 `.project-state/` 已存在，workflow 会要求先调用：

- `resume_project_state`

如果 `.project-state/` 不存在，workflow 会要求先调用：

- `init_project_state`

### 保存规则

当前会话一旦成功写入或执行并推进任务，project memory 会被标记为 `stale`。

`stale` 状态下：

- 允许继续开发和调试
- 不允许直接收尾

如果用户请求最终总结，或者会话自然进入收口点，workflow 会先要求：

- `save_project_state`

保存成功后，才允许继续最终 wrap-up。

## MCP 工具

project memory 相关工具：

- `init_project_state`
- `resume_project_state`
- `get_project_state`
- `save_project_state`
- `validate_project_state`

workspace baseline 相关工具：

- `refresh_workspace`
- `save_analysis`
- `save_flowchart`
- `save_review`

## 验证

在 `packages/smartx-workflow` 目录运行：

```bash
bun typecheck
bun test
bun run build
```

产物输出：

```text
packages/smartx-workflow/dist/smartx-workflow.js
```

strategy-service 的 CLI 与 desktop 发布脚本会先执行上述构建。`dist` 不提交到 Git，SmartX 发布器必须分发新产物，并同步本次版本中的 `smartx-helper` agent；服务内的 `EnsureBuiltins` 与自动启动 MCP 注入仍由 SmartX 管理。显式 `/system/opencode/start` 和 `/system/opencode/restart` 会在启动 OpenCode 前刷新 strategy-service MCP 配置。

## AI 回测约束

工作台主会话可以直接调用 strategy-service MCP 提供的以下回测工具，不增加额外审批：

- `run_backtest`
- `list_backtests`
- `get_backtest`
- `get_backtest_config`

工具注册名可以带 MCP 前缀。workflow 会在执行前强制使用当前 workspace 和主会话 ID，忽略模型提供的作用域；`run_backtest` 的 `requestKey` 固定为 `ai:<tool-call-id>`，`pluginId` 交由服务端从 workspace 推导。子 agent 不允许调用这些工具。

`run_backtest` 只在 project memory 已恢复且 baseline 处于 `ready` 或 `dirty` 时放行；初始化、刷新和最终快照阶段均会阻止启动。查询工具保持只读，不受 baseline 阶段限制。回测调用不会把 workspace 或 project memory 标记为 dirty。
