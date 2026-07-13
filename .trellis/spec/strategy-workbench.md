# Strategy Workbench

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
