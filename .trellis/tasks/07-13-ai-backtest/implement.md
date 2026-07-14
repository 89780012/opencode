# 实施计划

## 1. strategy-service

- 为 backtest 增加单次 ConfigPatch 合并、session/workspace 归属校验、scoped get 和面向 AI 的 brief/detail 投影。
- 在 MCP tools/list 注册 run/list/get/config，更新 initialize instructions。
- 在 tools/call 复用 `a.back`，实现幂等/active conflict、404、输入错误和内部错误脱敏。
- 更新 MCP、backtest service/store/API 测试，确保现有 HTTP 契约不变。

## 2. smartx-workflow

- 识别带 MCP 前缀的四个工具，将启动分类为 backtest、查询分类为 read。
- 在 gate 前覆盖 workspace/session/requestKey/pluginId，拒绝子 session。
- 完成生命周期 gate，并保证回测成功后不触发 dirty/project-memory stale。
- 更新 helper 提示、权限规则、README 和 workflow 测试。

## 3. strategy-front

- 定义并校验 v1 回测工具结果，拒绝畸形和跨作用域数据。
- 增加专用工具卡，显示实时 Redux 状态和显式查看动作，失败时回退通用面板。
- 工具完成后执行一次 scoped 对账，保持 revision 保护和历史选择。
- 增加 reducer、解析、卡片/映射和同步测试。

## 4. 发布与规范

- 检查启动/重启的 EnsureMCP 路径，保证工具清单刷新。
- 构建 smartx-workflow 产物。
- 更新 `.trellis/spec/strategy-workbench.md` 的 AI 回测契约。

## 5. 验证

- `packages/strategy-service`: `go test ./...`、`go build ./...`、`go vet ./...`。
- `packages/smartx-workflow`: `bun test`、`bun typecheck`、`bun run build`。
- `packages/strategy-front`: 目标 `bun test`、`bun run typecheck`、`bun run lint`、`bun run build`。
- 最终检查新标识符遵循单词优先命名，确认工作树只包含本任务变更。

## 风险与回滚点

- scoped get 和 session 校验可能暴露旧孤儿记录；保留历史列表读取但禁止 AI 跨 scope 获取。
- MCP 输出必须限制尺寸，避免模型上下文和前端消息被大 result 撑满。
- 工具名、workflow 分类和 agent 权限必须同步发布；任一不一致时保持手工回测可用。
