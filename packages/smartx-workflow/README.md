# `@opencode-ai/smartx-workflow`

这是一个极简版 SmartX 工作流插件。

它会在同一个 session 里跟踪两组顺序约束：

- `smartx_start` / `smartx-start` -> `smartx_logs`
- `skill({ name: "smartx-develop" })` -> `skill({ name: "smartx-debug" })`

只要前一步已经发生、后一步还没补齐，插件就会在后续继续请求 LLM 时持续注入系统提示，提醒模型先完成对应的 follow-up，再结束回复。

## 当前行为

插件只保留两个 hook：

- `tool.execute.after`
- `experimental.chat.system.transform`

执行逻辑如下：

1. 每调用一次 `smartx_start`，当前 session 的 `logs` 计数加一。
2. 每调用一次 `skill({ name: "smartx-develop" })`，当前 session 的 `debug` 计数加一。
3. 每调用一次 `smartx_logs`，按顺序消耗一次 `logs` 计数。
4. 每调用一次 `skill({ name: "smartx-debug" })`，按顺序消耗一次 `debug` 计数。
5. 只要 `logs > 0` 或 `debug > 0`，插件就在模型继续生成前追加系统提示，明确要求先补齐缺失的后续动作。

## 状态

状态只保存在插件进程内存里，按 session 记录：

- `logs > 0` 表示还有未被 `smartx_logs` 配对完成的 `smartx_start`
- `debug > 0` 表示还有未被 `smartx-debug` 配对完成的 `smartx-develop`
- `logs = 0 && debug = 0` 表示当前没有待补的 follow-up

兼容性说明：

- 插件仍兼容旧别名 `smartx_log`
- 但系统提示会统一引导为 `smartx_logs`

这意味着：

- 同一个 OpenCode 进程里的继续生成会记住这个状态
- 如果插件重载或进程重启，内存状态会丢失

## 不再保留的能力

下面这些都没有做：

- `.project-state/workflow.json` 持久化
- 阶段状态机
- 自动 idle 续推
- handoff 约束
- bootstrap / discover / verify 流程
- `smartx-helper` 专属 gate
- 对 `.project-state` 其他文件的检查

## 构建

在 `packages/smartx-workflow` 目录执行：

```bash
bun typecheck
bun test
bun run build
```

产物输出到：

```text
packages/smartx-workflow/dist/smartx-workflow.js
```
