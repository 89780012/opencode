# 需求面板编辑与持久化 - 技术设计

## 架构边界

本次沿用现有三层边界，不引入新的状态库、数据表或生成式 SDK：

1. `strategy-front` 的需求编辑子组件维护编辑态草稿、校验错误和保存状态。
2. `strategy-front/src/api/modules/workbench.ts` 通过现有 Axios 客户端调用需求保存接口。
3. `strategy-service` 的 Gin 路由调用 workbench 服务，在现有 SQLite `workspace_requirements` 表中按 `(workspace_path, session_id)` 覆盖保存。
4. 保存成功后，前端用服务端返回的规范化列表更新 Redux 中对应会话；刷新或重新进入页面仍由现有 `session.list` 链路加载。

## 前端交互

- “需求理解”默认保持当前的有序只读列表，标题区提供新增和编辑图标按钮；新增按钮会进入编辑态并创建一个待填写条目。
- 进入编辑态后，每条需求使用从单行起步、随内容自动增高的文本输入，保留稳定编号；每行提供删除图标按钮，输入框不允许手动缩放。
- 底部只保留紧凑排列的“取消”“保存”操作；删除全部条目后保存按钮仍可用。
- 只包含空白字符的条目属于校验错误，保存按钮禁用并显示错误；用户可以填写该条目或删除它。
- 保存按钮展示保存中状态并阻止重复提交。失败时保持编辑态和全部草稿，显示错误并允许重试；成功时回到只读态并提示保存成功。
- 当前会话变化时，编辑器以新会话的服务端数据重新初始化，避免把会话 A 的草稿提交到会话 B。

## API 契约

新增接口：

```text
PUT /api/workbench/requirements
```

请求和响应数据：

```json
{
  "workspacePath": "D:/workspace/example",
  "sessionId": "ses_123",
  "requirements": ["第一条需求", "第二条需求"]
}
```

语义：

- `requirements` 是当前会话的完整权威列表，每次请求执行整组覆盖，不追加旧条目。
- `[]` 是合法值，表示清空当前会话的需求。
- 数组不能缺失或为 `null`；非空数组中的每一项去除首尾空白后必须仍为非空字符串。
- 列表顺序和重复文本原样保留；重复提交同一列表是幂等操作。
- 响应沿用现有 `{ code, msg, data }` envelope，`data` 返回规范化后的 `workspacePath`、`sessionId` 和 `requirements`。
- 读取继续使用现有 `session.list` 数据流，不增加重复的前端读取请求。

## 后端保存

- 新增 `RequirementsSave` 输入类型和 `SaveRequirements` 服务方法。
- 先规范化并校验 `workspacePath`、`sessionId` 和列表项，再开启事务。
- 在事务内查询 `sessions`，确认会话存在且精确属于请求中的工作区；校验通过后复用现有 JSON 序列化与 upsert 逻辑。
- 只更新 `workspace_requirements.updated_at`，不修改 `sessions.updated_at`，避免需求编辑导致会话列表意外重排。
- 不创建进度事件，不调用 `submit`，不重新触发 AI、分析、流程图或回测。

## 状态与竞争

- 前端保存请求携带触发时的工作区和会话 ID；即使用户随后切换会话，响应也只更新目标会话。
- 单机应用保持 last-write-wins，不增加版本号或冲突对话框；多人实时协同已明确不在范围内。
- 前端不做乐观持久化。只有后端成功返回后才更新 Redux 的服务端状态，失败时只保留本地草稿。

## 兼容与回滚

- 不修改 SQLite schema，已有数据库无需迁移。
- 不修改创建会话、列出会话、MCP `get_requirements` 或 `session.update` 标题更新的既有契约。
- 回滚时删除新增 PUT 路由、服务方法、前端 API 和编辑组件即可；已有需求数据格式不受影响。

## 取舍

- 选择独立 HTTP PUT，而不是扩展 WebSocket `session.update`。HTTP Promise 能自然表达保存中、成功、失败与重试；同时避免标题更新契约中“字段缺失”和“空数组”的兼容歧义。
- 不新增 GET 调用，因为 `session.list` 已经从同一数据库返回当前会话需求。额外读取会造成重复请求和会话切换竞态，却不增加持久化能力。
- 不自动去重文本，避免把用户有意保留的相似需求静默合并；完整列表覆盖已经保证重复点击保存不会额外追加条目。
