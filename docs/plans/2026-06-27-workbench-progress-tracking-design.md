# Workbench Progress Tracking Design

**目标**：为 `strategy-service` / `strategy-front` 增加一套“基于当前会话”的进度追踪能力。所有关键动作都要落到 SQLite，并通过 websocket 推送给前端展示。

**范围**：需求分析、保存工作区、生成流程图、审查、项目状态保存/恢复/校验，以及必要的会话级补充事件。

**约束**：

- 以当前 `session_id` 为主键语义，不以 `worktree_path` 作为唯一标识。
- 事件必须可追溯，且能恢复出当前进度快照。
- 保持现有 `analysis / flowchart / review / session / question` 的接口风格。
- 前端进度区先接入真实数据，再考虑补更细的节点级事件。

---

## 现状判断

### 后端

`strategy-service` 已经具备：

- SQLite 持久化入口：`packages/strategy-service/internal/db/store.go`
- workbench 业务层：`packages/strategy-service/internal/workbench/service.go`
- websocket 广播层：`packages/strategy-service/internal/web/socket_handler.go`
- 已有广播事件：`analysis.updated`、`flowchart.updated`、`review.updated`、`session.created`

但当前这些数据都是“点状状态”，没有统一的 session 进度账本。

### 前端

`strategy-front` 已经具备：

- websocket 订阅基础：`packages/strategy-front/src/lib/socket-bus.ts`
- workbench 订阅 hook：`use-workbench-session-sync.ts`
- 需求面板：`packages/strategy-front/src/components/workbench/features/side/requirements-tab.tsx`
- 进度时间线目前是静态生成：`createTimeline()` 在 `packages/strategy-front/src/components/workbench/data.ts`

所以前端缺的是“真实进度源”，不是 UI 框架。

### smartx-workflow

`smartx-workflow` 已经识别了关键动作类型：

- `analyze`
- `chart`
- `review`
- `save`
- `refresh`
- `project_*`

这意味着后续可把插件动作进一步映射为进度事件，但第一阶段不依赖它。

---

## 设计原则

1. 事件先落库，再广播。
2. 进度快照由事件表归纳生成，不手写一份独立逻辑。
3. `session_id` 是核心维度，`workspace_path` 是查询范围。
4. 先覆盖高价值动作，再扩展细粒度动作。
5. 前端先做“真实可用”，再做“更细致的视觉层级”。

---

## 数据模型

推荐两张表：

### 1. `session_progress_events`

存每一次动作事件，负责历史可追溯。

建议字段：

- `id`：主键，字符串
- `workspace_path`：工作区路径
- `session_id`：会话 ID
- `kind`：事件类型
- `state`：事件状态，`start / done / error / skipped`
- `title`：展示标题
- `detail`：补充描述
- `source`：来源，`service / mcp / workflow / ui`
- `payload`：JSON 文本
- `created_at`：时间戳

建议索引：

- `(workspace_path, session_id, created_at desc)`
- `(workspace_path, created_at desc)`

### 2. `session_progress_state`

存当前会话的聚合快照，前端直接读。

建议字段：

- `workspace_path`
- `session_id`
- `title`
- `phase`
- `state`
- `current`
- `next`
- `summary`
- `dirty`
- `last_kind`
- `last_event_id`
- `updated_at`

主键建议：

- `(workspace_path, session_id)`

---

## 事件类型

建议先固定一套最小事件字典：

- `session.created`
- `requirements.identified`
- `workspace.state.init`
- `workspace.state.resume`
- `workspace.state.save`
- `workspace.state.validate`
- `analysis.start`
- `analysis.done`
- `analysis.error`
- `flowchart.start`
- `flowchart.done`
- `flowchart.error`
- `review.start`
- `review.done`
- `review.error`
- `question.append`
- `question.delete`

如果后续要接 `smartx-workflow`，可再补：

- `workflow.analyze`
- `workflow.chart`
- `workflow.review`
- `workflow.debug`
- `workflow.final`

---

## 事件写入规则

### 统一写入点

所有事件写入建议放在 `strategy-service/internal/workbench/service.go` 的业务层，而不是只放在 HTTP handler。

原因：

- HTTP / MCP 都能复用
- 更容易保证落库与广播顺序一致
- 更适合后续补测试

### 触发映射

1. `session.create`
   - 写 `session.created`
   - 同时初始化 `session_progress_state`

2. `requirements/identify`
   - 写 `requirements.identified`
   - payload 保存识别结果摘要

3. `save_analysis`
   - 写 `analysis.start` 或直接写 `analysis.done`
   - 如果 `state = running`，写开始态
   - 如果 `state = done`，写完成态

4. `refresh_workspace`
   - 写 `analysis.start`
   - 写 `flowchart.start`
   - 返回后写对应 done/error

5. `save_flowchart`
   - 写 `flowchart.done` 或 `flowchart.error`

6. `save_review`
   - 写 `review.start`
   - 保存完后写 `review.done` 或 `review.error`

7. `init_project_state / resume_project_state / save_project_state / validate_project_state`
   - 分别写对应 `workspace.state.*`

8. `question.append / question.delete`
   - 写补充事件，可选
   - 这部分对进度面板不是必须，但有利于完整审计

### session_id 获取规则

优先级建议：

1. 请求显式传入 `sessionId`
2. 当前 `ProjectStateRow.SessionID`
3. 无法确定时不写 session 级快照，只写 workspace 级历史事件

这条规则很关键，避免把“工作区级动作”错误挂到旧会话上。

---

## API 设计

### HTTP

建议新增：

- `GET /api/workbench/progress`
- `POST /api/workbench/progress`

推荐用途：

- `GET`：取某个 workspace + session 的事件列表和快照
- `POST`：手工补写或插件补写进度事件

### websocket

建议新增 socket 事件：

- `progress.get`
- `progress.list`
- `progress.append`
- `progress.updated`
- `progress.got`
- `progress.listed`
- `progress.appended`

广播规则：

- 任一 progress 写入成功后，广播 `progress.updated`
- 前端首次进入页面时，发 `progress.get` 或 `progress.list`

### 请求体建议

```json
{
  "workspacePath": "/path/to/workspace",
  "sessionId": "ses_xxx",
  "kind": "analysis.done",
  "state": "done",
  "title": "完成工作区分析",
  "detail": "识别到 5 条需求",
  "source": "service",
  "payload": {}
}
```

---

## 后端实现顺序

### 第 1 步：加表

修改：

- `packages/strategy-service/internal/db/store.go`
- `packages/strategy-service/internal/db/store_test.go`

先加 `session_progress_events` 和 `session_progress_state`。

### 第 2 步：加 workbench 进度服务

修改：

- `packages/strategy-service/internal/workbench/types.go`
- `packages/strategy-service/internal/workbench/service.go`

新增：

- progress 事件入库方法
- progress 快照更新方法
- progress 查询方法

### 第 3 步：接入现有业务动作

修改：

- `packages/strategy-service/internal/web/workbench_api.go`
- `packages/strategy-service/internal/web/mcp_api.go`

把分析、流程图、审查、项目状态动作挂上事件写入。

### 第 4 步：补 socket 广播

修改：

- `packages/strategy-service/internal/web/api.go`
- `packages/strategy-service/internal/web/session_socket.go`
- 新增 `progress` 处理函数

让前端可订阅实时更新。

---

## 前端实现顺序

### 第 1 步：新增 progress store

修改：

- `packages/strategy-front/src/store/workbench-slice.ts`

增加：

- progress events
- progress snapshot
- progressPath / sessionPath

### 第 2 步：新增 progress sync hook

新增：

- `packages/strategy-front/src/components/workbench/hooks/use-workbench-progress.ts`

职责：

- socket open 时拉取 progress
- 监听 `progress.updated`
- 归并到 redux

### 第 3 步：替换静态 timeline

修改：

- `packages/strategy-front/src/components/workbench/data.ts`
- `packages/strategy-front/src/components/workbench/hooks/use-workbench.ts`

把 `createTimeline()` 的静态数据替换为真实 progress 映射。

### 第 4 步：接入需求面板

修改：

- `packages/strategy-front/src/components/workbench/features/side/requirements-tab.tsx`

建议做法：

- 上半部分保留“需求理解”
- 下半部分改为“进度追踪”
- 直接显示事件列表、状态、更新时间

### 第 5 步：接入时间线页

修改：

- `packages/strategy-front/src/components/workbench/features/stage/timeline-stage.tsx`
- `packages/strategy-front/src/components/workbench/features/stage/timeline-parts.tsx`

时间线组件继续复用，但数据源切成真实 progress。

---

## 与 smartx-workflow 的关系

第一阶段不强依赖 `smartx-workflow` 改动。

推荐顺序：

1. 先由 `strategy-service` 记录所有已知后端动作
2. 前端先看到真实进度
3. 再把 `smartx-workflow` 的动作映射成更细的 progress 事件

如果要做更细的上报，建议直接在工作流/服务代码里调用 `POST /api/workbench/progress`，不要再让模型绕 MCP 工具做二次上报。

---

## 测试计划

### 后端测试

修改：

- `packages/strategy-service/internal/db/store_test.go`
- `packages/strategy-service/internal/workbench/service_test.go`
- `packages/strategy-service/internal/web/mcp_api_test.go`

覆盖：

- progress 表创建成功
- 同一 session 的事件可多次追加
- 快照能被正确更新
- progress 查询可返回按时间排序的事件
- 写入失败时不会广播错误数据

### 前端测试

新增或修改：

- `packages/strategy-front/src/components/workbench/hooks/*.test.ts`
- `packages/strategy-front/src/components/workbench/features/side/*.test.tsx`

覆盖：

- socket 收到 progress.updated 后能刷新列表
- 需求面板能显示真实事件
- timeline 数据源不再依赖静态 mock

---

## 验收标准

1. 需求分析、保存工作区、生成流程图、审查等动作能落到 SQLite。
2. 同一 `workspace_path + session_id` 下能查询到完整事件列表。
3. 前端进度区展示的不是静态假数据。
4. websocket 推送后，前端能实时刷新。
5. 现有 `analysis / flowchart / review / session` 行为不回退。

---

## 建议执行顺序

1. 先加 SQLite 表
2. 再加 workbench 进度服务
3. 接入现有 HTTP / MCP 写入点
4. 加 websocket 广播
5. 前端接入 progress store 和 hook
6. 替换需求面板和 timeline 的静态数据
7. 最后补测试
