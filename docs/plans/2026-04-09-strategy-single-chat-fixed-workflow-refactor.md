# Strategy Single Chat Fixed Workflow Refactor

## Goal

将“策略工作区里的固定工作流 chat”重构为单窗口、强约束、同 session 多 run 的执行模型：

- `普通创建` 保持现状
- `工作流创建` 仍然走原来的引导式表单
- 引导结果不再发到普通 chat，而是作为一次工作流 `run input`
- 用户始终只看到一个 chat 窗口
- 用户每次新发自然语言消息，都会在同一个 session 上触发一轮新的 workflow run
- 当前 run 若被问题或权限阻塞，用户回复继续当前 run
- 当前 run 若在运行中被打断，系统中断旧 run，再基于新消息启动新 run
- 工作流首个有效智能体改为 `intent`，负责把输入路由到 `plan` 或 `build`

## Product Model

### 普通创建

- 仍然创建 workspace
- 仍然进入普通策略 chat
- 仍然直接通过 `chatApi.sendPrompt(...)` 发送首条引导消息

### 工作流创建

- 仍然使用原有引导式表单采集需求
- 最终生成的文本作为本次 workflow run 的 `input`
- 创建后直接绑定固定 workflow，并立刻发起第一轮 run
- 第一条 assistant 消息来自 workflow 节点，而不是普通 chat

### 固定工作流 chat

- 路由为 `/app/strategies/:strategyID/workflow-chat`
- 不再从 URL 传 `workflowID`
- workspace 绑定哪个 workflow，由后端 workspace state 决定
- 同一个 chat 窗口只维护一个共享 session
- 同一个 session 上可以顺序产生多轮 workflow run

## Core Decisions

### 1. session 不变，run 可重启

- `session` 表示用户在这个策略上的连续对话上下文
- `run` 表示一次工作流执行实例
- 用户打断后，不在同一个 run 里回跳
- 正确做法是：中断旧 run，在同一个 session 上开启新 run

原因：

- run 内已经带有当前节点、重试次数、分支状态
- 在同一个 run 内“重跑”会让状态机语义变脏
- “同 session，新 run”既保留上下文，又能保持工作流状态干净

### 2. 工作流不再绑定 workspace

- `workflow` 是纯模板
- `workspace` 通过 workspace chat state 绑定固定 workflow
- 删除 `workflow.workspace_path`

原因：

- 工作流应当表达流程，不应混入具体工作区实例
- 绑定关系应该由策略 chat 入口维护，而不是 workflow 自身存储

### 3. 工作流节点不再配置 session_mode

- 删除节点上的 `session_mode`
- 删除节点上的 `session_key`
- 固定 workflow chat 只使用 workspace 维度的单一共享 session

原因：

- 当前需求明确要求“从 chat 绑定固定工作流开始”
- 会话控制不应该由 workflow 设计器决定，而应该由固定 chat orchestrator 决定

### 4. 新增 intent 节点

- 新增节点类型 `intent`
- `intent` 负责识别当前用户输入更适合去 `plan` 还是 `build`
- 输出 JSON：

```json
{
  "intent": "plan",
  "summary": "需要先澄清目标和约束",
  "next_prompt": "请先整理一个实现计划"
}
```

- 当 `intent` 输出非法值时，默认回退到 `plan`

原因：

- 用户在同一窗口中可能会提出“新需求”“继续实现”“修 bug”“重新规划”
- 必须有一个工作流内的首节点来做硬路由

## Target Data Model

### Workflow

- 保留：
  - `id`
  - `name`
  - `root_node_id`
  - `nodes`
  - `edges`
  - `updated_at`
- 删除：
  - `workspace_path`

### Node

- 保留：
  - `id`
  - `kind`
  - `title`
  - `agent`
  - `skills`
  - `prompt`
  - `timeout_ms`
  - `retry_limit`
  - `model_provider_id`
  - `model_id`
  - `variant`
- 删除：
  - `session_mode`
  - `session_key`

### New Kind

- `intent`

### Edge Cond

- 保留：
  - `always`
  - `pass`
  - `fail`
- 新增：
  - `plan`
  - `build`

### Run

- 保留：
  - `id`
  - `workflow_id`
  - `workspace_path`
  - `session_id`
  - `status`
  - `current_node_id`
  - `block_reason`
  - `block_request_id`
  - `input`
  - `loop`
  - `started_at`
  - `ended_at`
  - `error`
- 删除：
  - `root_session_id`
  - `lanes`
- 新增状态：
  - `interrupted`

### NodeRun

- 保留现有结构
- 新增状态：
  - `interrupted`

### WorkspaceState

- 保留：
  - `workspace_path`
  - `workflow_id`
  - `session_id`
  - `run_id`
  - `updated_at`
- 新增：
  - `status`
- 删除：
  - `phase`
  - `plan_message_id`
  - `plan_summary`

## API Changes

### Keep

- `GET /api/workspace/chat-state`
- `POST /api/workspace/chat-state/continue`

### Replace

- 删除 `PUT /api/workspace/chat-state`
- 删除 `POST /api/workspace/chat-state/start`

### Add

- `POST /api/workspace/chat-state/bind`
  - 绑定 workspace 和固定 workflow
- `POST /api/workspace/chat-state/dispatch`
  - 用户在固定 workflow chat 中提交新消息
  - 若当前 run 在运行中，先中断旧 run
  - 然后在同 session 上创建新 run
- `POST /api/workspace/chat-state/interrupt`
  - 显式中断当前 run

## Execution Rules

### dispatch

1. 读取 workspace state
2. 必须存在 `workflow_id`
3. 若不存在 `session_id`，创建一个 session
4. 若当前 run 是 `running` 或 `blocked`，先标记为 `interrupted`
5. 用当前输入在同一个 `session_id` 上启动新 run
6. 新 run 从 workflow 根节点进入

### continue

- 仅用于权限或问题阻塞恢复
- 不启动新 run
- 不创建新 session

### interrupt

- 将当前 `Run` 和当前 `NodeRun` 标为 `interrupted`
- workspace state 清空 `run_id`
- `session_id` 保留

## Workflow Contract

固定 workflow 至少应具备：

- `start`
- `intent`
- `plan`
- `build`
- `review` 或 `judge`
- `end`

推荐边：

- `start -> intent`
- `intent(plan) -> plan`
- `intent(build) -> build`
- `plan -> build`
- `build -> review`
- `review(pass) -> end`
- `review(fail) -> build`

## Frontend Refactor

### Remove

- 固定 workflow chat 中“先规划再点击启动工作流”的逻辑
- URL 中携带 `workflowID`
- workflow 编辑页中的 workspace 输入
- workflow 节点侧边栏中的 session 配置

### Add

- 工作流创建模式下的“工作流输入”预览
- workspace 绑定固定 workflow 的动作
- 输入框统一走 `dispatch`
- 停止按钮统一走 `interrupt`
- block 状态下继续按钮走 `continue`

## File-Level Checklist

### Backend

- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/store.go`
- `packages/strategy-service/internal/workflow/service.go`
- `packages/strategy-service/internal/workflow/validate.go`
- `packages/strategy-service/internal/workflow/resolver.go`
- `packages/strategy-service/internal/web/api.go`
- `packages/strategy-service/internal/web/workspace_chat_api.go`
- `packages/strategy-service/internal/web/workflow_api.go`

### Frontend

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/types/workspace-chat.ts`
- `packages/strategy-front/src/api/modules/workflow.ts`
- `packages/strategy-front/src/api/modules/workspace-chat.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-library.tsx`
- `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- `packages/strategy-front/src/components/workflow/workflow-shell.tsx`
- `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- `packages/strategy-front/src/components/strategy/strategy-workflow-panel.tsx`
- `packages/strategy-front/src/components/workspace/workspace-create-dialog.tsx`
- `packages/strategy-front/src/pages/strategy-workflow-chat.tsx`
- `packages/strategy-front/src/routes/index.tsx`

## Cleanup Policy

这次改造不做兼容：

- 删除旧的 planning phase 流程
- 删除 workflow 级别 workspace 绑定
- 删除节点级会话模式
- 删除带 `:workflowID` 的旧路由
- 删除与旧语义相关的 UI 和 API

历史运行态数据建议清空：

- `workflow-runs.json`
- `workflow-node-runs.json`
- `workflow-workspace-states.json`

必要时可重建 `workflows.json`，避免旧字段残留。

## Delivery Order

1. 先改后端模型、状态与 API
2. 再改 frontend types 和固定 workflow chat hook
3. 再改策略创建流程
4. 最后清理 workflow editor 里的旧字段与旧入口
5. 完成前后端验证
