# 实施计划

## 1. 后端协议与存储

- 扩展 `internal/backtest/types.go`：请求幂等键、revision 和轻量 Socket 更新类型。
- 为 `backtest_runs` 增加可重复执行的增量迁移、幂等索引，以及按会话和插件查询活动任务的能力。
- 调整回测 Web API：HTTP 始终返回 `200`，业务错误写入 envelope `code`，活动冲突携带现有任务。
- 保留列表、详情和旧 refresh 路由兼容。

## 2. 后端 Manager

- 将 SmartX 依赖收窄为可测试接口。
- 在 `backtest.Service` 中实现服务级 worker 生命周期、单任务 single-flight、启动、轮询、退避、超时和终态退出。
- 落库后才广播 `backtest.updated`；增加 revision、进度 clamp 和单调保护。
- 启动时恢复活动任务，关闭时等待 worker 退出。
- 将 Manager 生命周期接入 API/bootstrap，不使用 HTTP 请求 context 驱动后台任务。

## 3. 前端同步与状态

- 扩展回测类型和请求，生成兼容旧 Electron WebView 的 `requestKey`。
- 将 `useWorkbenchBacktestSync` 改为列表快照、`backtest.updated` 订阅、`socket.open` 对账和终态详情加载。
- 修正 reducer 的工作区/会话隔离、revision 乱序保护和历史选择保持。
- 从所有记录派生活动任务，移除以选中历史记录判断运行状态的逻辑。

## 4. 前端交互

- 两个入口共用活动任务状态和发起动作。
- 流程图入口在活动期间变为查看进度，不重复提交。
- 回测面板增加 pending/running/done/failed 分支、真实进度条、耗时、更新时间和错误信息。
- 修复 `0%` 显示和 failed 被映射成 done 的问题。

## 5. 测试与质量门禁

- 后端测试：状态迁移、空 btId、进度单调、瞬时错误重试、终态停止、幂等命中、活动冲突、重启恢复、先落库后事件。
- 前端测试：会话隔离、乱序事件、重连对账、历史选择不被抢占、重复点击只提交一次、`0%` 与失败态。
- 在 `packages/strategy-service` 运行 `go test ./...` 和 `go build ./...`。
- 在 `packages/strategy-front` 运行相关 `bun test`、`bun run typecheck` 和 `bun run build`。
- 检查新增标识符遵循仓库单词命名优先规则，检查旧 Electron WebView 兼容性。

## 风险与回滚点

- 存储迁移前先验证旧数据库升级路径；失败时停止启动，不允许部分 schema 继续运行。
- 后端 Manager 与前端 Socket 同步分开提交验证，任何一层失败都可通过 HTTP 列表确认事实状态。
- 不删除 `/refresh`，直到新链路经过完整验证。
- 不实现伪取消；没有 SmartX 协议时不向用户承诺停止远端回测。
