# 技术设计

## 架构边界

```text
Workbench Composer
  -> strategy-service model-chain -> OpenCode smartx-helper
  -> smartx-workflow tool.execute.before（绑定身份、幂等、gate）
  -> strategy-service MCP run/list/get/config
  -> backtest.Service -> SQLite + SmartX background worker
  -> backtest.updated -> strategy-front HTTP/Socket/revision merge
```

- `strategy-service` 继续拥有回测领域逻辑、持久化、错误映射和 MCP 工具实现。
- `smartx-workflow` 只负责可信会话上下文、动作分类和生命周期 gate，不重复实现 HTTP 回测客户端。
- `strategy-front` 只消费工具结果和既有事实状态，不从聊天文本解析“回测”并偷偷调用 API。

## MCP 契约

- `run_backtest`：模型只提供可选 config patch；workflow 注入 `workspacePath/sessionId/requestKey` 并移除 `pluginId`。成功返回 v1 accepted result 和 pending/active run brief。
- `list_backtests`：workflow 注入 workspace/session；limit 默认 5、最大 20；返回 brief 数组。
- `get_backtest`：需要 run ID，workflow 注入 workspace/session；服务端 scoped get；返回状态、config、summary 和有限的结果元数据。
- `get_backtest_config`：只读已保存默认配置。

统一启动输出：

```json
{
  "version": 1,
  "accepted": true,
  "reason": "created",
  "run": {
    "id": "bt_xxx",
    "workspacePath": "D:/workspace/example",
    "sessionId": "ses_xxx",
    "status": "pending",
    "progress": 0,
    "revision": 0
  }
}
```

`reason` 可为 `created`、`idempotent` 或 `active`。同作用域 active conflict 作为可处理结果返回；跨作用域 plugin conflict 只返回 busy 原因，不返回其他会话的任务内容。

## 身份、幂等与配置

- workflow 在 MCP 调用前强制写入当前 plugin workspace 和主 session ID，使用 `ai:` + callID 作为 requestKey。
- 子 session 调用全部回测工具直接失败，避免把 reviewer/analyzer session 写入工作台数据。
- service 在落库前验证 sessions 表中的 `(workspace_path, id)` 归属，并从 workspace basename 推导 pluginId。
- config patch 使用指针字段区分“未提供”和零值；先读取全局默认值，再覆盖本次显式字段，不调用 Save。

## 前端同步

- 工具输出只用于识别 run ID 和显示调用语义，不直接覆盖完整 BacktestRun。
- completed run tool part 触发一次 scoped detail/list 对账；现有 `useWorkbenchBacktestSync` 继续负责 WebSocket 增量和断线恢复。
- 工具卡从 Redux 中按 run ID 读取真实状态，提供显式“查看回测”按钮；找不到或不匹配 scope 时回退通用 Tool。

## 兼容与回滚

- 不删除任何现有 HTTP 路由、refresh 兼容接口、数据库字段或手工入口。
- MCP 工具可通过从 tools/list 移除并在 helper 中禁用来快速回滚，现有回测仍可使用。
- 前端专用卡解析失败时保留通用工具输出，避免旧会话消息不可读。
