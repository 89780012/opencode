# 审查流程技术设计

## 边界与数据流

`strategy-front` 只负责发起意图和展示状态；`smartx-workflow` 负责生成可信的审查实例上下文并驱动状态机；`strategy-service` 是审查记录、进度与事件的事实来源。

提交链路：

`UI -> model-chain prompt -> workflow review request -> reviewer before(running) -> reviewer after(pending) -> MCP save_review(terminal) -> SQLite transaction -> WebSocket -> Redux`

## 协议

- `reviewId`：由 workflow 使用 reviewer 的稳定 tool call ID 生成/传递；服务端在 workspace/worktree 内映射成稳定记录 ID。兼容旧调用时才回退到“最近 running”。
- `sessionId`：由 workflow 从 hook 上下文注入，不信任模型自行填写；仅用于校验和进度归属，审查历史仍按 workspace/worktree 展示。
- `updatedAt`：前端当前可用的单调字段。相同 ID 下只接受更新的记录；时间相同且一方为 terminal 时，terminal 优先于 running。
- 状态聚合优先级：`error > failed/warning > running > passed`。显式总体状态必须与聚合状态一致。

## 状态隔离

- workflow 的 pending review 从 workspace 单槽改为 workspace + session 键；analysis/flowchart 继续保持 workspace 级。
- review request 只有 reviewer 真正启动后才确认；failed running 持久化保留可重试状态。
- passed terminal 保存成功后写入 session 级 final 请求，下一次 system transform 进入 final 刷新，不再依赖已被删除的 pending。

## 持久化与事件

- `SaveReview` 在单个 SQLite 事务内写审查记录和对应 progress；提交后再发事件。
- progress helper 支持复用现有事务，并在提交后广播，避免 review 已成功而 API 返回失败。
- 历史查询同时过滤 workspace 与 worktree。
- 不做破坏性表重建；稳定 ID 和 session 通过请求协议实现，旧表可继续读取。

## WebSocket

- 未注册的客户端事件直接忽略，不再原样全局广播。
- client 使用 done/cancel 生命周期；send 队列不由读协程关闭，reply 和 broadcast 都可观察断线，消除关闭 channel 竞态。
- 查询请求携带关联 ID，前端只接受当前请求的 `review.got`。

## 兼容与回滚

- 缺少 `reviewId/sessionId` 的旧 HTTP/MCP 调用保留兼容路径，但新 workflow 总是注入两者。
- 前端仍能解析旧记录；非法新事件采用 fail-closed 展示。
- 回滚可按前端、workflow、service 三组提交反向应用；数据库没有不可逆迁移。
