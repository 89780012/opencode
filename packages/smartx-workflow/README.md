# `@opencode-ai/smartx-workflow`

`smartx-workflow` 负责把 SmartX 策略的审查、调试和回测串成可恢复的持久化流程。

## 行为边界

- baseline 与 project memory 只提供工作区提示，不对普通工具做通用硬门禁。
- baseline 关闭时不启动 analysis/flowchart，但不影响审查、调试、回测、Python 或普通开发。
- 子 session 不拥有主工作区流水线。
- 只有明确源码写入产生 code revision；Bash/Python 运行不会单独触发新审查。

## Workflow Run

人工和自动阶段统一写入 strategy-service 的 `workflow_runs`。阶段顺序固定为：

```text
review -> debug -> backtest -> done
```

关闭或未请求的阶段会跳过。Run 创建后固化计划，中途修改自动化开关不会改变当前 Run。

人工请求通过 `manual:<messageID>` revision 建立 Run。reviewer 仍要求用户明确发起审查；实际调用 `smartx_start` 或 `smartx_run_backtest` 时，即使自然语言识别遗漏，也会补建人工 Run。

调试是启动烟测：`start -> logs`，验证启动存活和新增日志没有 fatal issue，不代表完整业务调试。

回测提交后由 strategy-service worker 维护，终态通过持久化事件推进，不依赖浏览器或模型轮询。

## 暂停与恢复

前端停止会并行执行 OpenCode abort 和：

```text
PUT /api/workbench/workflow/cancel
```

服务端把最新活动 Run 写为 `paused` 并保存安全恢复状态。用户随后发送精确的“继续”“接着”“恢复”或 `resume` 时，插件调用：

```text
PUT /api/workbench/workflow/resume
```

下一次 session idle 会从同一 Run 的 review/debug/backtest 阶段继续。“继续修改策略”等普通句子不会触发恢复。

## MCP 上下文

执行工具时，workflow 会覆盖不可信的作用域字段：

- debug start：`pipeline:<workflowId>:start`
- debug logs：`pipeline:<workflowId>:logs`
- backtest：`pipeline:<workflowId>`

调试和回测不能越过 Run 中尚未完成的前序阶段。只读回测查询保持可用，也不会把 workspace 标成 dirty。

## 详细流程

参见 [TRIGGER_FLOW.md](./TRIGGER_FLOW.md)。

## 验证

在 `packages/smartx-workflow` 目录运行：

```bash
bun typecheck
bun test
bun run build
```

产物输出到 `packages/smartx-workflow/dist/smartx-workflow.js`，`dist` 不提交 Git。SmartX 发布器需要同步分发匹配版本的 workflow、helper agent 和相关 skills。
