# Implementation Plan

1. 扩展 strategy-service 配置结构、默认值、SQLite schema/migration 和读写测试。
2. 在 smartx-workflow 增加远程配置读取、每轮策略、生命周期旁路及动作保护测试。
3. 调整 smartx-helper 静态指引为配置驱动。
4. 在 strategy-front 增加系统设置页签、开关面板和关闭状态展示。
5. 运行 package-local Go/Bun 测试、类型检查、lint 和构建。

## Validation

- `packages/strategy-service`: `go test ./...`, `go build ./...`, `go vet ./...`
- `packages/smartx-workflow`: `bun test`, `bun typecheck`
- `packages/strategy-front`: `bun run typecheck`, `bun run lint`, `bun run build`

## Risk Points

- 不覆盖 `smartx-workflow/src/gate.ts` 和 `workspace.ts` 中现有用户改动。
- 禁用 baseline 时必须保留 project memory 保存和 review/backtest 行为。
- 配置切换不得让同一轮在 before/after 之间改变策略。
