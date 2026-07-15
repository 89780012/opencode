# 实施计划

- [x] 为前端审查 reducer 增加单调合并、pending 保留/清理和作用域保护，并补 reducer 回归测试。
- [x] 接通 Composer 的“发送并审查”，为面板提交增加即时 pending、防重复和路由/会话一致性校验。
- [x] 为 review.get 增加请求关联 ID，修正未知状态与历史 running 文案。
- [x] 扩展 workflow 的 `SaveReview/Pending` 协议，注入 `reviewId/sessionId`，按会话隔离 pending。
- [x] 修正 reviewer 空输出判定、passed 后 final 触发和 refreshing 写入门禁，并补状态机测试。
- [x] 扩展 strategy-service 审查请求校验、稳定 ID、worktree 查询与显式 session 进度归属。
- [x] 将 review + progress 合并为单事务，提交后广播；补幂等、并发、校验和回滚测试。
- [x] 收紧 model-chain session/workspace 校验，修复 WebSocket 未注册广播与断线 reply 竞态并补测试。
- [x] 运行 `bun test`、`bun typecheck`、定向 ESLint/前端 build；运行 `go test ./...`、`go build ./...`、`go vet ./...`。
- [x] 执行 `git diff --check` 和独立跨层复核，确认新标识命名与仓库单词命名规则一致。

## 验证结果

- `strategy-front`：`bun test` 34 项通过，`bun run typecheck`、触及文件 ESLint 和 `bun run build` 通过。
- `smartx-workflow`：`bun test` 60 项通过，`bun typecheck` 和 `bun run build` 通过。
- `strategy-service`：`go test ./... -count=1`、`go build ./...` 和 `go vet ./...` 通过；关键并发、回滚、WebSocket、model-chain 与 MCP 测试重复运行通过。
- `go test -race ./internal/workbench ./internal/web` 已尝试；Windows race 二进制因本机 Go 工具链入口缺失以 `0xc0000139` 启动失败，未产生测试断言失败。
- `git diff --check` 通过；仅显示 Git 的 LF/CRLF 工作区转换提示。

## 风险与回滚点

- `SaveReview` 事务化是最高风险点；先用服务测试锁定兼容行为，再接 HTTP/MCP。
- workflow pending 键变更会影响现有测试夹具；保留 analysis/flowchart 的 workspace 键，避免扩大变更。
- 前端快照使用并集合并，因为当前没有删除审查历史的业务入口；若未来新增删除，需要引入 revision/tombstone。
- 不运行仓库根目录测试；所有命令从对应包目录执行。
