# Strategy Workbench

## 场景：安装级首次初始化引导

### 1. 范围与触发条件

- 修改 `packages/strategy-front` 的工作台首次引导、Provider/模型链/回测确认或首个策略创建时，必须遵守本契约。
- 修改 `packages/strategy-service` 的 `setup_state`、setup API 或策略创建 WebSocket 关联时，必须同步检查前端状态机。
- 初始化完成状态属于本地安装，不属于 workspace、session 或账号；业务配置仍以原 Provider、model-chain、backtest 和 session 数据为事实来源。

### 2. 签名

- 读取：`GET /api/setup/status`
- 确认：`PUT /api/setup/steps/:step`，`step = provider|model|backtest|strategy`
- 重置：`POST /api/setup/reset`
- 创建：`session.create -> session.created|session.create.error`，请求和响应使用同一 WebSocket `id`
- 存储：SQLite 单例表 `setup_state`，固定 `id = 1`
- 前端本地 UI 状态：`strategy-front.onboarding.v1`

### 3. 契约

setup API 的 `data` 使用以下结构：

```json
{
  "version": 1,
  "providerConfirmedAt": 0,
  "modelConfirmedAt": 0,
  "backtestConfirmedAt": 0,
  "strategyConfirmedAt": 0,
  "completedAt": 0,
  "updatedAt": 0
}
```

- `setup_state` 对应列为 `version`、四个 `*_confirmed_at`、`completed_at`、`updated_at`；表和初始化必须可重复执行。
- 确认接口幂等：已确认步骤返回原时间；四步均确认后写入 `completedAt`。未知步骤返回 `400`，存储错误返回通用 `500`。
- 前端必须区分 `confirmed` 与 `ready`：确认时间只表示用户确认过；Provider 必须已加载、已连接且含模型，模型链必须至少包含一个仍属于已连接 Provider 的模型。
- 顺序固定为 Provider -> 模型链 -> 回测配置 -> 首个策略。模型链必须等待保存成功后确认；回测只在 `PUT /api/backtest/config` 成功后确认。
- 空工作区加载后不得自动打开创建策略弹窗。未完成且当前工作区为空时显示非阻塞入口；设置关闭、稍后继续和刷新不得清除服务端确认状态。
- 首个策略只有在 `session.created.id` 属于本次弹窗已发送的请求集合、`workspacePath` 匹配当前工作区且 `session.id` 有效时才成功。发送失败、`session.create.error` 和超时保留表单；超时请求 ID 暂时保留，以接收迟到成功。
- 匹配创建成功后先在本地 UI 状态写 `pending: true`，再确认 strategy；确认成功清除 pending。响应丢失或页面重载时允许按该标记重试确认，但不得凭“工作区出现任意 session”完成正在进行的引导。
- 老用户迁移只适用于 `updatedAt === 0 && completedAt === 0` 且已存在策略的安装；迁移按顺序幂等确认四步。已开始引导后不得再次进入老用户迁移。
- 完成后配置失效只显示“需处理”并允许修复，不重播完整引导；模型链修复保存成功后必须同步更新引导 readiness。
- Coachmark 使用稳定 `data-onboarding` 目标；目标缺失时显示可操作的固定提示。定位必须响应 resize、捕获阶段 scroll 和 DOM 目标增删，不依赖 `ResizeObserver`、`clip-path` 或 Flex `gap`。

### 4. 校验与错误矩阵

| 条件 | 结果 | 行为 |
| --- | --- | --- |
| setup 状态或模型链读取失败 | 前端错误态 | 保留重试入口，不猜测完成状态 |
| Provider 未加载、连接为空或没有模型 | 当前步骤未就绪 | 禁止确认并显示真实加载错误 |
| 模型链保存或 setup model 确认失败 | 当前步骤失败 | 不进入回测，保留当前选择 |
| 回测配置保存失败 | 当前步骤失败 | 不写 backtest 确认 |
| Socket 未连接或发送失败 | 创建失败 | 保留标题、需求和分析结果，可重试 |
| `session.create.error` 或 60 秒超时 | 创建失败 | 退出 creating，保留表单；迟到事件仍按请求 ID 校验 |
| `session.created` ID 或 workspace 不匹配 | 忽略 | 不关闭弹窗，不确认 strategy |
| 策略已创建但 strategy 确认失败 | pending 错误态 | 自动补试一次并提供显式重试，不重复创建策略 |
| 完成后 Provider/模型链失效 | 已完成、需处理 | 显示设置红点，不回退 `completedAt` |

### 5. Good / Base / Bad Cases

- Good：新安装从非阻塞入口依次保存三项配置；创建请求 `req-1` 收到同工作区 `session.created(req-1)` 后完成，刷新和切换空工作区不再重播。
- Base：用户关闭设置或选择稍后，之后从设置页继续未完成步骤；服务端确认时间保持不变。
- Bad：仅因 session 列表从空变为非空就完成正在进行的引导，发送 `session.create` 后立即关弹窗，或模型链保存失败仍确认 model。

### 6. 必需测试

- 存储：默认值、四步完成时间、重复确认幂等、非法步骤、reset 和数据库重复初始化。
- API：覆盖 GET、四种合法 PUT、非法 PUT、reset 及内部错误映射。
- 前端纯状态：步骤推进、已确认但 readiness 失效回退、确认读取，以及只有 `updatedAt === 0` 的已有策略安装可迁移。
- 浏览器：空工作区不自动弹窗、手动加号可打开、Provider/模型/回测目标定位、策略请求 ID 与 workspace 匹配、错误/超时保留表单、窄屏无横向溢出。
- 从包目录运行 `go test ./...`、`go build ./...`、`go vet ./...`、目标 Bun 测试、`bun typecheck`、相关文件 ESLint 和 `bun run build`；完整 lint 的仓库既有失败必须单独报告。

### 7. Wrong vs Correct

错误：

```ts
useEffect(() => {
  if (sessions.length === 0) openModal()
}, [sessions])
```

正确：空工作区只显示可忽略、可恢复的初始化入口；创建弹窗仅由用户动作打开。

错误：

```ts
socket.emit("session.create", payload)
closeModal()
confirmStrategy()
```

正确：为请求生成稳定 ID，保持 creating 状态，只在同 ID、同 workspace 的 `session.created` 到达后关闭并确认；错误和超时保留表单。

## 场景：当前会话需求清单保存

### 1. 范围与触发条件

- 修改 `packages/strategy-front` 的需求编辑器，或 `packages/strategy-service` 的会话需求读写时，必须遵守本契约。
- 需求数据归属于 `(workspace_path, session_id)`，不能提升为工作区共享状态，也不能影响其他会话。

### 2. 签名

- HTTP：`PUT /api/workbench/requirements`
- 前端：`workbenchApi.saveRequirements(input: RequirementList): Promise<RequirementList>`
- 服务：`SaveRequirements(context.Context, RequirementsSave) (RequirementsRow, error)`
- 存储：`workspace_requirements` 以 `(workspace_path, session_id)` 为主键，使用完整列表 upsert。

### 3. 契约

请求与响应的 `data` 使用同一结构：

```json
{
  "workspacePath": "D:/workspace/example",
  "sessionId": "ses_123",
  "requirements": ["第一条需求", "第二条需求"]
}
```

- `requirements` 是完整、有序、权威的字符串数组；保存是覆盖，不是追加。
- `[]` 合法，表示保存空清单；字段缺失或 `null` 非法。
- 每项保存前去除首尾空白；重复文本和原顺序必须保留。
- 成功响应使用 `{ code: 200, msg: "ok", data }`，`data` 返回规范化后的列表。
- 保存只更新 `workspace_requirements.updated_at`，不得更新 `sessions.updated_at`，不得触发 AI、分析、流程图、回测或进度事件。
- 前端成功后只按响应中的 `workspacePath + sessionId` 更新 Redux。已发出的写请求不得因切换视图而取消，因为客户端取消不能保证服务端事务未提交；请求代次只用于隔离草稿、toast 和本地保存状态。
- 成功保存且列表实际变化后，前端必须独立按响应中的 `workspacePath + sessionId` 递增页面生命周期内的待重审版本，即使该工作区的会话列表已被另一工作区替换。更新已加载会话数据可以因目标不存在而跳过，但记录成功保存不得依赖目标会话仍在当前缓存中。
- 待重审提示显示在主区域顶部；保存接口本身仍不得触发 AI。用户点击“审查并修改”后才通过当前会话发送“需求已变更，请根据最新需求重新审查并修改策略代码。”。
- 待重审提示允许关闭、跨会话切换保留、刷新后清空。发送失败不得清除；发送成功只清除点击时捕获的版本，期间再次保存产生的新版本必须保留。横条发送固定指令时不得清空用户已有的会话草稿。
- 需求编辑器必须以工作区和会话作为 React `key`，确保旧草稿不会在 effect 执行前短暂绑定到新会话。

### 4. 校验与错误矩阵

| 条件 | HTTP | 行为 |
| --- | --- | --- |
| JSON 无法解析 | `400` | 不写入 |
| `workspacePath` / `sessionId` 为空 | `400` | 不写入 |
| `requirements` 缺失、为 `null` 或含空白项 | `400` | 不写入 |
| 会话不存在，或不属于指定工作区 | `404` | 不写入，不泄露跨工作区会话信息 |
| SQLite、事务或上下文执行失败 | `500` | 返回通用错误，不暴露内部异常 |
| `requirements: []` | `200` | 覆盖为非 `null` 空数组 |

### 5. Good / Base / Bad Cases

- Good：提交 `[" A ", "B", "A"]`，响应和重新加载结果均为 `["A", "B", "A"]`。
- Base：提交 `[]`，清空当前会话，刷新后仍显示空状态。
- Bad：提交 `["valid", "   "]`、错配工作区和会话，或省略数组；请求失败且旧列表保持不变。

### 6. 必需测试

- 服务测试：覆盖有序替换、重复文本、幂等、清空、空白拒绝、会话缺失、工作区错配和 `sessions.updated_at` 不变。
- API 测试：断言 `400 / 404 / 500` 分类、空数组响应为 `[]`，并验证拒绝后存量不变。
- 前端测试：断言 reducer 只更新工作区和会话均匹配的记录，并覆盖待重审版本的作用域隔离、工作区切换后的迟到保存、无变化不标记、旧版本不清除新提示和删除会话清理。
- 变更后从各包目录运行 `go test ./...`、`go build ./...`、`bun test ./test/requirements.test.ts`、`bun run typecheck`、相关文件 ESLint 和 `bun run build`。

### 7. Wrong vs Correct

错误：

```ts
// 视图切换时取消 PUT，服务端可能已经提交而客户端状态未更新。
controller.abort()
```

正确：

```ts
const data = await workbenchApi.saveRequirements(input)
dispatch(setRequirements(data)) // 仅更新仍在缓存中的会话
dispatch(markRequirementReview({ workspacePath: data.workspacePath, sessionId: data.sessionId }))
if (active.current !== token || request.current !== gen) return
// 只有当前编辑器才更新草稿和提示。
```

错误：

```go
// 把所有服务错误都报告成 400，并暴露内部持久化错误。
bad(c, err)
```

正确：参数错误映射 `400`，资源缺失或归属错配映射 `404`，未知持久化错误映射通用 `500`。

错误：需求保存成功后直接调用 AI，或发送旧版本重审指令成功时无条件清除提示。

正确：保存成功只标记版本化待重审状态；用户显式点击后发送，且只按点击时捕获的版本清除。

### 8. 旧 Electron WebView 布局契约

- `strategy-front` 的 legacy 目标包含 Chrome 64，而 Flex `gap` 从 Chrome 84 才可用；Autoprefixer 和 legacy JavaScript 构建不会为它生成 CSS 回退。
- `src/index.css` 中的 `.no-flex-gap` 规则只覆盖 Tailwind 工具类，不覆盖 CSS Module。需求编辑器的纵向条目、底栏和按钮间距不得只依赖 Flex `gap`。
- 纵向列表使用块布局和相邻兄弟外边距；CSS Grid 内的 `gap` 可保留。编辑器外层必须占满可用高度并 `overflow: hidden`，只有条目列表滚动，标题栏操作和底部保存区不得被列表挤出可视区域。
- 多行需求输入不得使用 Chrome 64 不支持的 `field-sizing: content`。使用 `rows={1}`，在 ref 挂载和输入变化时先把高度设为 `auto`，再写入 `scrollHeight + border`；禁用手动缩放，由外层列表统一滚动。
- 新增入口放在标题栏并使用 `Plus` 图标；只读态点击时必须进入编辑态并追加空项，编辑态点击时继续追加，新增后聚焦并滚动到末项。

错误：

```css
.reqbox {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
```

正确：

```css
.reqbox {
  display: block;
}

.reqbox > * + * {
  margin-top: 0.25rem;
}
```

自适应输入：

```ts
function fit(node: HTMLTextAreaElement | null) {
  if (!node) return
  node.style.height = "auto"
  node.style.height = `${node.scrollHeight + 2}px`
}
```

- 样式变更后必须运行 `bun run build` 检验 legacy 产物，并在实际旧 Electron WebView 中检查 220px、300px 和 460px 面板宽度：条目不得黏连或横向溢出，底部操作区必须始终可见。

## 场景：异步回测进度与实时状态

### 1. 范围与触发条件

- 修改 `packages/strategy-front` 的回测入口、状态同步和报告面板，或修改 `packages/strategy-service` 的回测 API、持久化和 SmartX 调用时，必须遵守本契约。
- 回测是服务端慢任务。任务生命周期属于 `strategy-service`，不能由浏览器定时器驱动；WebSocket 只传递增量通知，SQLite 和 HTTP 查询是事实来源。

### 2. 签名

- 启动：`POST /api/backtest/run`
- 列表：`GET /api/backtest/runs?workspacePath=<path>&sessionId=<id>`
- 详情：`GET /api/backtest/runs/:id`
- 兼容快照：`POST /api/backtest/runs/:id/refresh`，只读，不得主动查询 SmartX。
- 事件：`backtest.updated`
- 存储：`backtest_runs.request_key`、`backtest_runs.revision`

### 3. 契约

启动请求必须包含：

```json
{
  "workspacePath": "D:/workspace/example",
  "sessionId": "ses_123",
  "pluginId": "example",
  "requestKey": "client-generated-id",
  "config": {}
}
```

- 回测接口所有响应的 HTTP 状态固定为 `200`；响应体继续使用 `{ code, msg, data }`，业务成功为 `code: 200`，业务失败使用非 `200` code。
- 启动接口完成校验和本地事务落库后立即返回 `pending`，不得等待 SmartX 返回远端任务结果。
- 相同 `(workspacePath, sessionId, requestKey)` 返回原任务；幂等命中的活动任务只有在已有有效 `btId` 时才允许恢复查询，无 `btId` 表示远端提交结果不确定，必须只返回快照且不得再次调用 SmartX 启动。同一会话或同一插件已有其他 `pending/running` 任务时拒绝新任务。
- Manager 使用服务级 context 启动和查询 SmartX；任务状态为 `pending -> running -> done|failed`，进度限制在 `0..100` 且不得回退。
- 状态变更必须先持久化并递增 `revision`，再广播轻量 `backtest.updated`；终态完整结果通过详情接口读取。
- 前端首次进入、切换会话和 `socket.open` 时读取 HTTP 快照；Socket 事件以及启动、列表、详情和 refresh 返回的所有 HTTP 快照都必须按 `workspacePath + sessionId + id + revision` 合并，较低 revision 不得覆盖较高 revision，同 revision 的详情可以补齐完整结果。
- 普通进度更新不得改变用户选中的历史报告。流程图入口在任务活动期间只导航到回测面板，不得重新提交。
- 回测面板的 `pending` 和 `running` 状态都必须同时展示阶段和数字百分比；初始 `pending` 的 `0%` 不得被“等待受理”等阶段文案替代。
- 旧数据库必须通过可重复增量迁移增加字段和作用域幂等索引，不能只修改 `create table if not exists`。

### 4. 校验与错误矩阵

| 条件 | HTTP | 业务 code | 行为 |
| --- | --- | --- | --- |
| 合法新任务 | `200` | `200` | 返回已落库的 `pending` 任务并启动后台 worker |
| 相同 requestKey 重试 | `200` | `200` | 返回原任务且不重复启动 SmartX；有 `btId` 时可恢复 single-flight 查询，无 `btId` 时不得启动 worker |
| JSON、路径、会话、requestKey 或配置无效 | `200` | `400` | 不创建任务 |
| 同会话或同插件已有活动任务 | `200` | `409` | `data` 返回现有活动任务 |
| 任务不存在 | `200` | `404` | 不泄露其他任务数据 |
| SQLite、SmartX 初始化或内部状态错误 | `200` | `500` | 返回通用错误，不暴露内部异常 |
| SmartX 查询瞬时失败 | 无 HTTP 响应 | 无 | Manager 退避重试，达到阈值后才落 `failed` |

### 5. Good / Base / Bad Cases

- Good：启动接口立即返回 `pending`；页面关闭后 Manager 继续查询，重新打开页面通过列表和 Socket 恢复进度，完成后加载完整报告。
- Base：Socket 断线期间任务继续运行；重连触发列表对账，遗漏事件不影响最终状态。
- Bad：浏览器每 3 秒调用 `/refresh` 才推进任务、运行中再次点击创建第二条任务、或轻量终态事件阻止同 revision 的完整详情写入 Redux。

### 6. 必需测试

- 后端：断言 pending 快返、幂等命中、幂等命中无 btId 不重复启动、会话/插件冲突、worker single-flight、空 btId、瞬时错误重试、进度单调、超时、终态停止和重启恢复。
- 存储：断言旧表增量迁移可重复执行，空 requestKey 兼容旧记录，作用域内重复 requestKey 被拒绝。
- 事件：断言每个 `backtest.updated.revision` 严格递增，并且读取数据库时对应 revision 已存在。
- API：断言参数、冲突和不存在均返回 HTTP `200`，响应体 code 分别为 `400 / 409 / 404`。
- 前端：断言跨会话响应被忽略、Socket 新状态不被迟到的启动响应或其他旧 revision 快照覆盖、进度更新不抢历史选择、同 revision 详情能补齐完整报告、`0%` 和 `failed` 正确显示。
- 变更后从包目录运行 `go test ./...`、`go build ./...`、`go vet ./...`、相关 Bun 测试、`bun run typecheck` 和 `bun run build`。

### 7. Wrong vs Correct

错误：

```ts
window.setInterval(() => backtestApi.refresh(run.id), 3000)
```

正确：

```ts
socket.on("backtest.updated", merge)
socket.on("socket.open", load)
```

错误：

```go
row, err := service.Run(c.Request.Context(), req) // 请求 context 驱动完整慢任务
```

正确：启动请求只负责事务创建 `pending` 记录；Manager 使用服务生命周期 context 执行 SmartX 启动、查询、持久化和通知，并在数据库关闭前停止所有 worker。

### 8. AI 回测技能与发布契约

- `smartx-backtest` 负责策略回测准备、单次配置 patch、异步启动、状态读取和终态报告解释；策略代码修改仍必须联用 `smartx-develop`，不得把 skill 目录中的 `demo.py` 当作当前 workspace 的自动入口。
- MCP 配置名固定为 `smartx`，OpenCode 工具名固定为 `smartx_run_backtest`、`smartx_list_backtests`、`smartx_get_backtest` 和 `smartx_get_backtest_config`。工作流兼容前缀匹配，但前端工具卡与 scoped HTTP 对账精确识别 `smartx_run_backtest`，发布时不得改名。
- 只有用户明确要求运行、重新运行或重试时才能启动。成功后立即返回 run ID、reason、status 和 progress；不得在同一轮循环查询等待终态。用户后续问进度或历史时用 list，问指定结果时用 get；只有 `done && hasResult` 才解释实际 summary。
- 模型只提供可选 `config` patch 或只读工具的业务参数。`workspacePath`、`sessionId` 和 `requestKey` 由 workflow 注入，`pluginId` 由服务端从 workspace 推导；不得用 `smartx_python`、Shell、HTTP 或直接 `smartx-cli` 绕过 MCP。
- `packages/strategy-service/internal/asset/workspace/skills` 会被 Go embed 收录，但 strategy-service 启动不负责安装其中的 skill。SmartX 发布链必须把匹配版本的完整 `smartx-backtest`、`smartx-market-data`、`smartx-helper` 和 `smartx-workflow` 产物一起分发到 OpenCode 配置，并在安装或更新 skill 后重启 OpenCode 以刷新目录。
- 变更技能包后至少运行 UTF-8 模式的 `quick_validate.py`、解析 `demo.py` 语法，并从 `packages/strategy-service` 运行 `go test -p 1 ./...`、`go build ./...` 和 `go vet ./...`。

## 场景：策略审查闭环与实时状态

### 1. 范围与触发条件

- 修改 `packages/strategy-front` 的审查入口、审查面板或 Redux 同步，修改 `packages/smartx-workflow` 的 reviewer 编排，或修改 `packages/strategy-service` 的审查持久化、MCP 与 WebSocket 时，必须遵守本契约。
- 审查历史按 `workspacePath + worktreePath` 展示；每轮运行态、终态和进度必须额外绑定稳定 `reviewId` 与可信 `sessionId`，避免并发会话串轮次。

### 2. 签名

- 提交意图：`POST /api/model-chain/session/:sessionId/prompt`
- HTTP 保存：`POST /api/workbench/review`
- MCP 保存：`save_review`
- WebSocket 查询：`review.get -> review.got`
- WebSocket 增量：`review.updated`、`progress.updated`
- 服务：`SaveReview(context.Context, ReviewReq) (ReviewRow, error)`
- 存储：`workspace_reviews.review_id`、`workspace_reviews.session_id`；唯一索引作用域为 `(workspace_path, worktree_path, review_id)` 且忽略空 `review_id`。

### 3. 契约

running 与 terminal 保存使用同一结构：

```json
{
  "reviewId": "reviewer-tool-call-id",
  "sessionId": "ses_123",
  "workspacePath": "D:/workspace/example",
  "worktreePath": "D:/workspace/example",
  "state": "failed",
  "summary": "风险控制仍需完善",
  "items": [
    {
      "name": "风险控制",
      "status": "warning",
      "detail": "缺少止损约束",
      "suggestion": "增加最大回撤保护"
    }
  ],
  "suggestions": ["增加最大回撤保护"]
}
```

- workflow 使用 reviewer 的 tool call ID 生成 `reviewId`，使用 hook 上下文注入 `sessionId/workspacePath/worktreePath`；不得信任模型填写的身份字段。
- reviewer 真正启动前先持久化 `running`；远程保存成功后才消费 review request。并发启动必须先占用 session 级运行锁，保存失败时释放锁并保留 request。
- terminal 状态严格按所有 items 聚合：`error > failed/warning > running > passed`。terminal 不允许 `running` item；只有全部 item 为 `passed` 才能保存 `passed`。
- `summary`、`items`、`items[].name`、`items[].detail` 必须非空；未知 item status、空 reviewer 输出和无明确结论均 fail-closed 为 `error`，不得默认通过。
- 同一稳定 `reviewId` 只允许 `running -> terminal`。完全相同的重复请求幂等返回原记录；terminal 不得被修改，也不得回退到 running。
- review row 与对应 progress event 必须在同一 SQLite 事务提交；提交成功后才广播。`review.start/done/error` 只写入触发审查的 `sessionId`。
- 前端提交后立即插入带 `sessionId` 的本地 pending。真实事件或快照只能清理同 session 的 pending；双方都有 `reviewId` 时还必须匹配 `reviewId`。
- 前端只接收当前 `workspacePath + worktreePath` 的事件；同 ID 按 `updatedAt` 单调合并，同时间戳 terminal 优先于 running。当前状态按活动 session 选择，历史仍保留 worktree 全量记录。
- `review.get` 必须携带请求关联 ID；工作区切换后到达的旧 `review.got` 不得覆盖当前数据。
- WebSocket 未注册入站事件必须忽略，不能原样广播；断线后迟到 reply 必须观察 client done/cancel，不能向已关闭 channel 发送。
- passed terminal 保存成功后 workflow 进入 final baseline；dirty 审查和失败修复后的复审必须先刷新 baseline。`refreshing/finalizing` 期间继续阻止写操作。

### 4. 校验与错误矩阵

| 条件 | 结果 | 行为 |
| --- | --- | --- |
| URL session 与 body session 不一致 | HTTP `400` | 不发送 prompt |
| session 不存在或不属于 workspace | HTTP `404` | 不发送 prompt，不泄露其他 workspace |
| summary/items/name/detail 为空，status 非法，或总体 state 与 items 不一致 | HTTP/MCP 参数错误 | 不写 review，不写 progress |
| 相同 reviewId 的完全相同 running/terminal 重试 | 成功 | 返回原记录，不新增 progress |
| terminal 后再修改或回退 running | 参数错误 | 保留原 terminal |
| progress 写入或事务提交失败 | 内部错误 | review 与 progress 一起回滚，不广播半成功事件 |
| 未注册 WebSocket 入站 type | 忽略 | 不调用 handler，不广播 |

### 5. Good / Base / Bad Cases

- Good：同一 `reviewId` 依次保存 running 和 passed；数据库只有一条 review、两条生命周期 progress，前端不会被迟到 running 回滚，随后触发 final baseline。
- Base：两个 session 同时审查并乱序完成；各自 pending、progress 和 terminal 只更新自己的 session，worktree 历史可同时看到两轮。
- Bad：reviewer 文本写“通过”但 item 为 `warning`，或客户端发送伪造 `review.updated`；前者必须聚合为 failed，后者不得被服务端转广播。

### 6. 必需测试

- workflow：覆盖 running 保存失败不消费 request、并发 reviewer 只启动一次、空输出转 error、跨 session pending 隔离、items 聚合只升不降、failed 修复后先刷新、passed 后 final 可达，以及 refreshing/finalizing 写门禁。
- 服务与存储：覆盖旧表增量迁移可重复执行、稳定 ID 幂等、terminal 不可变、双会话乱序、worktree 查询隔离、session 归属、review/progress 故障回滚和提交后广播。
- WebSocket/API/MCP：覆盖关联 ID、未知入站事件不广播、断线迟到 reply 不 panic、URL/body session 错配、workspace/session 错配和 `reviewId/sessionId` schema 映射。
- 前端：覆盖 HTTP 返回后的防重、旧闭包与工作区切换、同 ID 乱序合并、双 session pending 配对、跨 worktree 拒绝、空/非法/聚合不一致数据 fail-closed。
- 变更后从各包目录运行 `bun test`、`bun typecheck`、相关文件 ESLint、`bun run build`、`go test ./...`、`go build ./...` 和 `go vet ./...`；race 测试受当前 Go/Windows 工具链能力约束。

### 7. Wrong vs Correct

错误：

```ts
// HTTP 已返回，但 running 事件还没到；本地没有 pending，用户可重复提交。
await sendReview()
setReviewing(false)
```

正确：提交前按 workspace + session 原子防重并立即插入 pending；请求失败只回滚该 pending，真实同 session 事件到达后再替换。

错误：

```go
saveReview(row)
saveProgress(event) // 第二步失败会留下半成功 review
broadcast(row)
```

正确：在同一 SQLite transaction 中写 review 与 progress，`Commit` 成功后再依次广播持久化后的事件。
