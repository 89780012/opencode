# 回测异步进度与实时状态

## 目标

将回测生命周期从浏览器轮询迁移到 `strategy-service` 后台管理。流程图和回测面板共享同一回测动作与状态，用户能够看到真实进度，并在切换会话、WebSocket 断线或重新打开页面后恢复最新状态。

## 背景

- 两个入口最终都调用 `useWorkbench().backtest()`：`packages/strategy-front/src/components/workbench/features/stage/stage.tsx:45`、`:64`。
- 当前前端只轮询第一条 `pending/running` 记录，每 3 秒调用一次刷新接口：`packages/strategy-front/src/components/workbench/hooks/use-workbench-backtest.ts:22`。
- 当前后端 `Run` 同步等待 SmartX 返回远端 `btId`，`Refresh` 只在浏览器请求时查询并持久化进度：`packages/strategy-service/internal/backtest/service.go:90`、`:153`。
- 前后端已经具备原生 WebSocket 通路和断线重连能力：`packages/strategy-front/src/lib/socket-bus.ts:19`、`packages/strategy-service/internal/web/event.go:167`。
- 回测表已经持久化任务 ID、远端 ID、状态、进度、结果和时间：`packages/strategy-service/internal/db/store.go:222`。

## 需求

- R1：流程图和回测面板必须使用同一个回测命令状态；同一会话存在活动回测时不得再次提交。
- R2：回测 HTTP 接口保持 HTTP 状态码 `200`。响应体继续使用 `{ code, msg, data }`：成功为业务码 `200`，参数错误、活动任务冲突和内部错误使用非 `200` 业务码。
- R3：`POST /api/backtest/run` 在完成校验和本地任务落库后立即返回 `pending` 任务，不等待 SmartX 完成回测启动或进度查询。
- R4：`strategy-service` 必须在独立于 HTTP 请求的后台生命周期中启动 SmartX 回测、间隔查询进度并持久化终态。
- R5：SmartX 查询的瞬时错误必须重试并退避；超过连续错误或总运行时长阈值后才进入失败终态。进度统一为 `0..100`，不得回退。
- R6：每次状态更新必须先持久化，再广播轻量 `backtest.updated` WebSocket 事件；完整结果仍通过 HTTP 详情接口获取。
- R7：前端首次进入、切换会话和 WebSocket 重连时必须通过回测列表/详情接口对账，WebSocket 不作为唯一事实来源。
- R8：请求必须携带幂等 `requestKey`。相同键不得重复创建任务；同一 `(workspacePath, sessionId)` 或同一插件默认只允许一个活动回测，冲突通过响应体业务码返回。
- R9：前端回测状态必须按工作区和会话隔离，忽略过期或乱序响应；进度更新不得抢占用户正在查看的历史记录。
- R10：运行中，流程图入口显示“查看回测 + 进度”并只负责导航；回测面板显示真实进度、阶段、耗时和更新时间。失败时显示原因和重试入口，`0%` 必须正常显示。
- R11：服务重启后必须恢复具有有效 `btId` 的活动任务；无法确认是否已提交到 SmartX 的无 `btId` 任务不得盲目重复启动。
- R12：当前会话没有任何回测记录时，回测面板必须显示“运行回测”和明确的未运行空状态；只有已有终态记录时才能显示“重新运行”或“重试”。

## 验收标准

- [x] AC1：点击任一入口后，HTTP `200` 响应立即返回业务码 `200` 和 `pending` 任务，界面进入启动状态。
- [x] AC2：同一会话或插件运行期间再次点击任一入口不会创建第二条任务；后端直接请求也受到同样约束。
- [x] AC3：关闭工作台、切换会话或断开 WebSocket 不会停止后端查询；重新进入后能恢复最新进度。
- [x] AC4：前端收到 `backtest.updated` 后按工作区、会话、任务和版本更新；旧事件不能覆盖新状态或污染其他会话。
- [x] AC5：运行中显示 `0..100%` 的真实进度；完成后自动加载完整报告；失败时显示可读错误并允许重新运行。
- [x] AC6：用户查看历史报告时，后台任务进度更新不会自动切换当前选择。
- [x] AC7：相同 `requestKey` 重试返回原任务；活动任务冲突返回 HTTP `200` 和非 `200` 业务码。
- [x] AC8：瞬时进度查询失败会重试，终态后停止查询；服务重启能恢复带有效 `btId` 的活动任务。
- [x] AC9：后端回测状态机、幂等、重试、恢复和事件顺序测试通过；前端会话隔离、重连对账、重复提交、`0%` 和失败态测试通过。
- [x] AC10：`packages/strategy-service` 的 `go test ./...`、`go build ./...` 与 `packages/strategy-front` 的相关 Bun 测试、`bun run typecheck`、`bun run build` 通过。
- [ ] AC11：首次进入无记录的回测面板显示“运行回测”；任务处于 `pending/running` 时，同一面板随 Socket 状态实时显示阶段、百分比、进度条、耗时和更新时间。

## 范围外

- SmartX 未提供取消协议前，不实现“取消回测”。
- 不支持同一会话或插件的并行回测和参数对比队列。
- 不新增 SSE、Socket.IO、Redis、NATS 或多实例任务协调。
- 不改造回测报告的指标内容和图表体系。

## 产品决策

- HTTP 传输状态固定为 `200`，业务成功或失败由响应体 `code` 表达。
- 默认单会话单活动回测。
- WebSocket 只传递增量通知，SQLite 和 HTTP 查询是事实来源。
