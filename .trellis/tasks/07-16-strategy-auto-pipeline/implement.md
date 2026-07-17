# 实施计划

## 1. 配置和持久化

- 扩展 strategy-service Config、默认值、清洗、读写 SQL 和 config 表增量迁移。
- 扩展 strategy-front SystemConfig、默认值和系统设置面板三个 Switch。
- 将 smartx-workflow 的 baseline 读取升级为完整 workflow 配置读取。

## 2. 流水线事实状态

- 在 strategy-service 增加 workflow_runs schema、模型、存储和服务层状态转换。
- 增加 scoped snapshot API/MCP 辅助能力及 `workflow.updated` 广播。
- 覆盖唯一键、幂等、revision 单调、跨 session 隔离和重启恢复测试。

## 3. 自动审查编排

- 在 smartx-workflow 为主会话成功写入建立 code revision，并在自然收口时选择自动阶段。
- 复用现有 review 状态机，绑定 workflow run 和 review round。
- 修改第三轮失败行为为 review_exhausted，禁止未验证修复进入后续阶段。
- 保持手工审查和自动审查幂等兼容。

## 4. 自动调试

- 扩展 MCP start/logs 的可信身份、幂等和结构化 v1 输出。
- 为 Python 策略增加启动加载检查、启动后存活确认和增量日志游标。
- 实现致命日志分类、脱敏摘要和 debug passed/failed 状态推进。
- workflow 注入 start -> logs 固定顺序，并只在通过时选择下一阶段。

## 5. 自动回测与前端同步

- 用稳定 pipeline requestKey 启动现有异步回测并绑定 run ID。
- 在 backtest worker 的终态更新中推进 workflow run。
- 新增前端 workflow reducer/sync hook，挂载到 Workbench 并扩展时间线状态。
- 验证后台更新不抢占现有审查或回测历史选择。

## 6. 验证

- `packages/strategy-service`: `go test ./... -count=1`、`go build ./...`、`go vet ./...`。
- `packages/smartx-workflow`: `bun test`、`bun typecheck`、`bun run build`。
- `packages/strategy-front`: `bun test`、`bun run typecheck`、`bun run lint`、`bun run build`。
- 从对应包目录运行命令，不从仓库根目录运行测试或直接调用 tsc。
- 执行全开成功链、三轮审查失败、语法失败、运行时日志失败、重复调用、刷新恢复、回测失败端到端场景。
- 最后检查新增标识符遵循单词优先命名规则，并运行 `git diff --check`。

## 7. 验收记录

- [x] `strategy-service` 新增配置迁移、workflow 状态机、日志游标与 fatal 分类测试通过；`go build ./...`、`go vet ./...` 通过。
- [x] `smartx-workflow` 自动成功链和第三轮审查失败停链测试通过；`bun typecheck`、`bun run build` 通过。
- [x] `strategy-front` 39 项测试、typecheck、生产/legacy build 和触及文件 ESLint 通过。
- [x] `GET/PUT /api/system/config` 验证三个开关保存、服务重启恢复和原配置回滚均成功。
- [x] Playwright 在 1440x900 下验证“设置 -> 系统”布局、三个开关逐项保存、刷新恢复和无页面脚本异常；配置请求均返回 200。
- [x] `git diff --check` 通过。
- [ ] 未执行真实 SmartX 策略启动和远端回测副作用：当前没有用户指定的安全测试 workspace、SmartX 账号与日志目录。自动状态机、MCP 参数覆盖、增量日志和回测绑定已由定向测试覆盖。

### 已知既有失败

- `smartx-workflow` 全量测试 76 通过、7 失败：旧测试仍期待当前分支已注释的硬门禁。
- `strategy-service` 全量测试 1 项失败：`TestSaveReviewScopesSessionAndWorktree` 命中当前分支 `ListReviews` 的既有 TODO。
- `strategy-front` 40 项全量测试通过；全量 lint 有 45 个既有错误和 10 个 warning，本次触及文件的定向 ESLint 通过。
- 前端开发/构建提示 Node.js 22.10.0 低于 Vite 推荐的 22.12+，但开发服务和构建均成功。

## 风险与回滚点

- 最高风险是异步 backtest 终态和 workflow run 的原子/幂等绑定；先锁定服务测试再接 workflow 和前端。
- start/logs 不能用历史日志或单纯缺少 error 判定成功；日志游标和 live 确认必须先实现。
- 自动触发必须依赖 dirty revision，避免纯问答误启动真实策略。
- 每一层都保留开关关闭和手工入口作为回滚路径。

## 8. 审查返工记录

- [x] 无活动自动 run 时保留手工 `smartx_start/logs` 参数与行为。
- [x] baseline 关闭或 final 已 ready 时，审查通过后的首个 transform 直接注入 debug/backtest。
- [x] MCP start 返回成功前持久化 `debug/running`、debug ID 和 cursor，丢失 after hook 后重试幂等。
- [x] system transform 通过 session parent 排除 OpenCode/plugin 重启后恢复的子会话。
- [x] `debug_cursor` 通过幂等迁移写入 SQLite，服务重启后可重建 debug 内存上下文且不向前端泄露路径。
- [x] debug 工具只精确匹配 `smartx_start` 和 `smartx_logs`。
- [x] 前端同 scope 不同 run 使用 `updatedAt` 阻止迟到 HTTP 覆盖新 Socket 状态。
- [x] `done` workflow 使用中性“流程”时间线类别，不再默认显示为回测。
- [x] 返工后 workflow 5 项定向测试、service 7 项定向测试、前端 39 项测试、三个包 typecheck/build、Go build/vet、前端定向 ESLint 和 diff 检查通过。

## 9. 宿主外零侵入续跑返工

- [x] smartx-workflow 监听主会话 idle，并以 single-flight + run revision 恢复非终态流水线；idle 时尚无 run 也会从当前 session 的 dirty revision 幂等创建。
- [x] 自动 reviewer 改用 `promptAsync + SubtaskPart` 确定启动，结构化中文结果由 workflow 校验并直接保存。
- [x] 自动 debug/backtest 改为 workflow 直接调用 strategy-service `/mcp`，保持稳定 requestKey 和手工入口兼容。
- [x] strategy-service 补齐直接 MCP logs 的 workflow 状态推进和重复调用幂等。
- [x] 自动修复增加无进展续跑上限，避免静默退出和无限循环。
- [x] strategy-front 增加“不展示原始 JSON”的回归断言，只消费 summary/items/suggestions。
- [x] 覆盖 stop 后续跑、重复 idle、防重复 reviewer、JSON 失败关闭、保存失败脱敏、start/logs/backtest 顺序和恢复测试。

## 10. 第二轮审查返工

- [x] `backtest/running` 且 backtest ID 相同时，重复绑定按幂等成功处理。
- [x] 自动 start 在 SmartX 副作用前持久化 `debug_request_key`、确定性 debug ID 和 cursor，并在恢复时先检查 live。
- [x] `review/fixing` 在插件重启后按 workspace/session 恢复持久化 failed review，不再因内存 Map 为空终止。
- [x] 手工 MCP `start` schema 恢复 `name` 必填，自动路径继续由服务端覆盖可信名称。
- [x] 增加迁移、隐藏字段、回测重试、debug claim、session review 恢复和 fixing 重启回归测试。
