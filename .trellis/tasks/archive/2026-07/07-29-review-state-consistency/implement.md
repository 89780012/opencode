# Implementation

1. 修正 strategy-service 的 `ListReviews` 查询分支和状态聚合，补充 session 作用域与 warning-only 通过测试。
2. 修改 smartx-workflow 的 `manual()`，恢复 paused/cancelled run；同步 `noteSave` 与聚合规则并更新自动化测试。
3. 修改 strategy-front 审查同步和 selector，按 active session 取数、接受根工作树记录、处理 `review.get.error`；同步前端聚合规则并增加纯逻辑测试。
4. 核对 WorkflowFloat 使用恢复后的 `reviewRound`，补充暂停第 1 轮后恢复为第 2 轮的覆盖。
5. 更新 `.trellis/spec/strategy-workbench.md`，记录审查作用域、轮次和 warning 契约。
6. 运行目标测试及包级质量门。

## Validation

- `go test ./internal/workbench -count=1`、`go test ./...`、`go build ./...`、`go vet ./...` from `packages/strategy-service`
- `bun test` targeted automation tests and `bun typecheck` from `packages/smartx-workflow`
- targeted review/workflow tests, `bun typecheck`, and `bun run build` from `packages/strategy-front`

## Risky Files

- `packages/smartx-workflow/src/workspace.ts`: run 恢复与轮次状态机，必须覆盖重复事件和终态。
- `packages/strategy-service/internal/workbench/service.go`: 查询作用域与聚合决定持久化事实。
- `packages/strategy-front/src/components/workbench/hooks/use-workbench-review.ts`: Socket 请求生命周期和 session 切换竞态。

## Rollback Points

- service 查询/聚合、workflow 恢复、frontend 同步分别形成可独立验证的修改块。
- 若恢复 paused run 产生回归，可仅回退 `manual()` 分支，保留审查面板和 warning 修复。
