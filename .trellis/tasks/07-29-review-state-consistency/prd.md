# 修复审查状态与面板一致性

## Goal

让同一 SmartX 工作区会话中的审查记录、工作流轮次、最近活动和审查面板使用一致的作用域与状态语义，避免已有审查被显示为空、恢复审查后轮次重置，以及“通过但有建议”被继续当作失败处理。

## Background

- `workspace_reviews` 已保存当前会话的多轮记录，但 workflow 写入的根工作树为 `/`，前端查询和 Redux 过滤却要求 `worktreePath === workspacePath`，导致真实记录被丢弃。[use-workbench-review.ts](../../../packages/strategy-front/src/components/workbench/hooks/use-workbench-review.ts) [workbench-slice.ts](../../../packages/strategy-front/src/store/workbench-slice.ts)
- 同一 `workspace + session` 下存在一个暂停的旧 workflow 和一个后续手工创建的新 workflow。新 workflow 的 `reviewRound` 从 1 重新开始，而 session 进度继续累计，因此同一次审查同时显示“第 1 轮”和“第 2 轮”。[workspace.ts](../../../packages/smartx-workflow/src/workspace.ts)
- 审查报告可以明确给出“通过，仅有建议”，但 service、workflow 和前端都把任意 `warning` 聚合为 `failed`，导致继续修复和复审。[service.go](../../../packages/strategy-service/internal/workbench/service.go) [workspace.ts](../../../packages/smartx-workflow/src/workspace.ts)
- `ListReviews` 已临时改为按 workspace 查询，但仍向单占位符 SQL 传入两个参数；当前 SQLite 驱动容忍该错误，代码契约仍不正确。[service.go](../../../packages/strategy-service/internal/workbench/service.go)

## Requirements

1. 审查列表读取以 `workspacePath + sessionId` 为首选作用域；未提供 session 时保持兼容的 workspace/worktree 查询。
2. 前端不得因根工作树使用 `/` 而丢弃同 workspace、同 session 的审查记录；历史列表不得混入其他 session。
3. `review.get.error` 必须结束查询中的 loading/request 状态，不能静默卡住刷新入口。
4. 对 `paused` 或 `cancelled` 的最新 workflow 再次提交审查时，恢复原 run 并继承 `reviewRound`；只有不存在可恢复 run 或 run 已进入不可恢复终态时才创建新 run。
5. 工作流浮层和最近活动必须对同一审查展示相同轮次；三轮限制不得因暂停后手工提交而重置。
6. 总体审查状态聚合规则统一为：`error` 优先，存在 `failed` 为 `failed`，其余 `passed + warning` 为 `passed`，`running` 仅用于进行中记录。
7. `warning` 条目和建议必须继续展示，不能因总体通过而丢失。
8. 不迁移或重写既有历史审查记录；新规则只约束后续保存和运行状态。

## Acceptance Criteria

- [ ] 当前会话已保存且 `worktreePath="/"` 的审查记录能在审查面板当前视图和历史视图中显示。
- [ ] 切换 session 后只显示目标 session 的审查记录和轮次。
- [ ] 审查列表查询失败后停止 loading，并允许再次查询。
- [ ] 暂停在第 1 轮的 workflow 再次提交审查后显示第 2 轮，不创建新的 workflow ID。
- [ ] 同一 workflow 最多执行三轮审查，暂停/恢复不会重置限制。
- [ ] 仅含 `passed` 和 `warning` 的报告保存为总体 `passed`，warning 项和建议仍可见。
- [ ] 含 `failed` 或 `error` 的报告仍分别聚合为 `failed` 或 `error`。
- [ ] strategy-service、smartx-workflow 和 strategy-front 的针对性测试、类型检查及构建通过。

## Out Of Scope

- 修改历史 SQLite 记录的 state 或 worktreePath。
- 重构全部 worktree 数据模型或增加数据库迁移。
- 修改审查智能体的具体检查内容、模型选择或报告文案。
