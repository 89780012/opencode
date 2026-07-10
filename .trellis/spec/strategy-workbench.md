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
- 前端测试：断言 reducer 只更新工作区和会话均匹配的记录。
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
dispatch(setRequirements(data))
if (active.current !== token || request.current !== gen) return
// 只有当前编辑器才更新草稿和提示。
```

错误：

```go
// 把所有服务错误都报告成 400，并暴露内部持久化错误。
bad(c, err)
```

正确：参数错误映射 `400`，资源缺失或归属错配映射 `404`，未知持久化错误映射通用 `500`。

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
