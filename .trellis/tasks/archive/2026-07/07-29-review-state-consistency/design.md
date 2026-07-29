# Design

## Boundaries

- `packages/strategy-service/internal/workbench` 负责审查持久化、列表作用域和总体状态聚合。
- `packages/smartx-workflow` 负责暂停 run 的恢复、轮次上限和保存提示中的聚合契约。
- `packages/strategy-front` 负责按当前 session 同步审查、处理查询错误并展示统一状态。

## Review Scope

`ReviewGet.SessionID` 已存在。`ListReviews` 在 session 非空时按 `(workspace_path, session_id)` 查询；否则按 `(workspace_path, worktree_path)` 保持兼容。前端查询携带当前 active session，不再把 `worktreePath === workspacePath` 当作记录归属条件。

Redux 保留 workspace 级缓存，但 `useWorkbench` 在形成当前视图和历史视图前按 active session 过滤。`review.updated` 只接收当前 workspace/session 的事件。根工作树 `/` 因此不会被误判为其他工作区。

## Workflow Continuity

`manual()` 先读取最新 run。若状态为 `paused` 或 `cancelled`，调用现有 `resumeRun` 远端能力并返回恢复后的 run；之后 review before-hook 基于继承的 `reviewRound` 递增。`failed`、`review_exhausted` 和 `done` 不恢复，仍允许显式创建新 run。

该方案保留 workflow ID、revision、summary 和三轮限制，不需要新增 API 或数据库字段。

## Review Aggregation

三层使用同一规则：

1. 任一 item 为 `error` -> overall `error`。
2. 否则任一 item 为 `failed` -> overall `failed`。
3. 否则任一 item 为 `running` -> overall `running`。
4. 其余 `passed`/`warning` 组合 -> overall `passed`。

`warning` 仍保留在 items 与 suggestions 中；总体通过只代表没有阻断项。

## Compatibility

- 不改变 HTTP、WebSocket、MCP 和数据库字段结构。
- 历史上已经保存为 `failed` 的 warning-only 记录保持原值，避免静默改写审计历史。
- 无 session 的旧调用继续走 workspace/worktree 查询。

## Risks And Rollback

- 恢复逻辑只覆盖 `paused/cancelled`，避免复活明确失败或耗尽的 run。
- session 过滤必须保留无 session 的兼容记录，但不能让其他 session 的记录进入当前历史。
- 各包修改可以按 service、workflow、frontend 独立回滚，不涉及 schema rollback。
