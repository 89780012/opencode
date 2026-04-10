# Strategy Workflow Wait Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `strategy-front` 和 `strategy-service` 的工作流暂停、提问、授权、恢复机制重构为统一的 `wait` 模型，不兼容旧实现，不再保留 `continue` 这类前端驱动恢复语义。

**Architecture:** 工作流引擎只维护四个一等公民对象 `Run / Step / Wait / Reply`。节点执行期间只能通过正式工具输出 `workflow_wait` 或 `workflow_result`，其中 `workflow_wait` 负责把流程挂起为 `waiting`，`Reply` 负责恢复；前端只消费 workflow snapshot，不再自行拼接 `question`、`permission`、`blocked` 等旁路状态。

**Tech Stack:** Go, Gin, Bun, React 19, TypeScript, opencode runtime, local JSON store or equivalent persistent store, SSE/runtime event bridge.

---

## Scope

- 本次改造不兼容旧的 `question + continue`、`permission + continue` 工作流语义。
- 本次改造不支持“模型用普通文本问一句，然后系统自动识别为断点”。
- 本次改造允许清空旧工作流运行态数据。
- 本次改造保留工作流编辑器和策略工作区页面，但重做其运行态模型。

## Non-Goals

- 不做旧 `workflow-runs.json` 和 `workflow-node-runs.json` 的迁移适配。
- 不做新旧状态机双写。
- 不在第一阶段引入数据库；允许先继续用本地 store，只要语义上支持持久恢复。
- 不扩展新的工作流节点种类；本次只重做运行态与人工介入协议。

## Current Problems

- 当前 `strategy-service` 只有在监听到 `question.asked` 和 `permission.asked` 事件时才会把 `Run/NodeRun` 标成 `blocked`，阻塞并不是领域对象，而是运行态字段上的偶发状态。
- 当前恢复流程分成两步：先回答问题或授权，再显式调用 `continue`。这会导致前端必须知道工作流控制语义，模型、服务端、前端三方状态容易漂移。
- 当前节点如果只是输出一段“请用户回复”的自然语言，而没有触发正式工具，服务端不会把它识别为断点，而会在 `resolve()` 阶段按合同错误失败。
- 当前多个节点复用一个 session，`plan / execute / check` 上下文互相污染，人工恢复时更难判定该延续哪个语义链。
- 当前执行器依赖内存中的 `live map + goroutine`，对“等用户几小时再回来回复”的场景不够稳健。

## Final Principles

- 所有人工介入都统一表示为 `Wait`。
- 前端只负责提交 `Reply`，不再负责驱动恢复。
- `Run` 同时最多只能有一个 `open wait`。
- 每个非自动 `Step` 使用独立 session。
- 节点控制输出必须显式工具化，不允许从 assistant 文本里猜流程控制。
- 没有 `workflow_wait` 或 `workflow_result` 的节点输出一律视为合同错误。

## Target Domain Model

### Run

- 表示一次完整工作流执行。
- 状态只允许：
  - `queued`
  - `running`
  - `waiting`
  - `done`
  - `failed`
  - `cancelled`

### Step

- 表示某个工作流节点的一次执行实例。
- 一个 `Run` 会有多个 `Step` 历史记录。
- 状态只允许：
  - `queued`
  - `running`
  - `waiting`
  - `done`
  - `failed`
  - `cancelled`

### Wait

- 表示当前 `Step` 正在等待外部输入。
- 状态只允许：
  - `open`
  - `answered`
  - `rejected`
  - `expired`
  - `cancelled`
  - `consumed`
- 关键字段：
  - `id`
  - `run_id`
  - `step_id`
  - `session_id`
  - `kind`
  - `mode`
  - `title`
  - `prompt`
  - `schema`
  - `required`
  - `source`
  - `source_request_id`
  - `expires_at`
  - `created_at`
  - `answered_at`
  - `consumed_at`

### Reply

- 表示对某个 `Wait` 的一次输入。
- 关键字段：
  - `id`
  - `wait_id`
  - `run_id`
  - `step_id`
  - `actor`
  - `payload`
  - `idempotency_key`
  - `created_at`

## State Machine

### Run

```text
queued -> running
running -> waiting
waiting -> running
running -> done
running -> failed
queued|running|waiting -> cancelled
```

### Step

```text
queued -> running
running -> waiting
waiting -> running
running -> done
running -> failed
queued|running|waiting -> cancelled
```

### Wait

```text
open -> answered
open -> rejected
open -> expired
open -> cancelled
answered -> consumed
```

### Hard Rules

- 没有 `open wait` 时，不允许创建 `Reply`。
- 一个 `Reply` 必须绑定当前 `Run` 的 `open wait`。
- `Wait` 从 `answered` 到 `consumed` 之间，必须由 worker 显式消费，不能隐式跳过。
- `Run waiting` 不能直接变成 `done`，必须先恢复到 `running`。

## Tool Contract

## `workflow_wait`

节点如果需要等待人工输入，必须调用 `workflow_wait`。

```json
{
  "kind": "wait",
  "mode": "text",
  "title": "Clarify target market",
  "prompt": "Please provide the target instruments and holding period.",
  "schema": {
    "type": "object",
    "properties": {
      "answer": {
        "type": "string"
      }
    },
    "required": ["answer"]
  },
  "required": true,
  "resume_hint": "Resume planning after the user provides scope."
}
```

`mode` 建议值：

- `text`
- `form`
- `approval`
- `confirm`

## `workflow_result`

节点完成时必须调用 `workflow_result`。

```json
{
  "kind": "plan",
  "summary": "Split the request into data preparation, signal design, and validation.",
  "handoff": "Execute the plan in the workspace and validate with a minimal smoke test.",
  "steps": [
    "Define the strategy objective and constraints",
    "Implement the core files",
    "Run validation and summarize risks"
  ],
  "deliverables": [
    "Updated workspace files",
    "Validation notes"
  ],
  "risks": [
    "Missing instrument scope can block implementation"
  ]
}
```

## Contract Rules

- 每个非自动 `Step` 最终只能产生一个控制型工具结果。
- `workflow_wait` 和 `workflow_result` 不能在同一个 `Step` 内同时作为终态输出。
- 如果模型只输出普通文本，不调用任一控制工具，按合同错误处理。
- 第一次合同错误允许自动追加隐藏纠偏提示重试。
- 超过重试阈值后，`Step` 失败。

## Runtime Design

### Session Strategy

- `start` 和 `end` 仍然是自动节点，不创建 session。
- 每个 `router / plan / execute / check` `Step` 单独创建一个 session。
- 同一个 `Step` 进入 `waiting` 后，恢复时复用该 `Step session`。
- 下一个 `Step` 不继承上一个 `Step` 的完整对话，只吃结构化 `handoff/result`。

### Queue Strategy

- 删除进程内“只要 run 被 kick 就用 goroutine 挂住”的假设。
- 引入可持久恢复的 runnable queue。
- worker 每次只处理一个 `Run` 当前可执行的 `Step`。
- worker 遇到 `Wait` 时退出，等待未来的 `Reply` 把 `Run` 重新入队。
- 服务重启后，重新扫描 `queued | running | waiting` 的运行态并恢复队列。

### Runtime Event Policy

- 不再把 `question.asked` 和 `permission.asked` 直接当成 workflow 最终阻塞模型。
- 如果底层 runtime 仍然产出这类事件，只能作为 `Wait source adapter` 的输入。
- 对 workflow service 而言，正式状态只有 `Wait`。

## API Contract

## Keep

- `GET /api/workspace/chat-state`
- `POST /api/workspace/chat-state/dispatch`
- `POST /api/workspace/chat-state/interrupt`

## Remove

- `POST /api/workspace/chat-state/continue`
- `POST /api/workflow-runs/:id/continue`

## Add

### `POST /api/workflow-runs`

- 创建并启动一个新的 `Run`。
- 入参：
  - `workflow_id`
  - `workspace_path`
  - `input`

### `GET /api/workflow-runs/:id`

- 返回 `Run` 聚合详情。

### `GET /api/workflow-runs/:id/steps`

- 返回该 `Run` 的 `Step` 历史。

### `GET /api/workflow-runs/:id/waits`

- 返回该 `Run` 的 `Wait` 历史。

### `POST /api/workflow-runs/:id/replies`

- 提交一个 `Reply`。
- 入参：
  - `wait_id`
  - `payload`
  - `idempotency_key`
- 后端收到后必须：
  - 校验 `wait_id` 是否命中当前 `open wait`
  - 持久化 `Reply`
  - 将 `Wait` 标记为 `answered`
  - 让 `Run` 重新入队

### `POST /api/workflow-runs/:id/cancel`

- 取消当前 `Run`。
- 若存在 `open wait`，同时将其标记为 `cancelled`。

### `GET /api/workspace/workflow-state`

- 返回前端使用的聚合快照。
- 出参建议包含：
  - `workspace`
  - `run`
  - `step`
  - `wait`
  - `timeline`
  - `history`

## Frontend Read Model

前端只读取一个 snapshot：

```json
{
  "workspace": {},
  "run": {},
  "current_step": {},
  "open_wait": {},
  "timeline": [],
  "history": []
}
```

### UI Rules

- `open_wait` 存在时，输入框提交语义为 `reply`。
- `open_wait` 不存在时，输入框提交语义为 `start new run`。
- 删除显式 `continue` 按钮。
- 删除独立 `QuestionPanel` 和 `PermissionPanel` 领域概念。
- 新增统一的 `WaitPanel`，按 `mode` 渲染。

## Timeline Events

必须记录：

- `run.started`
- `step.started`
- `wait.opened`
- `reply.received`
- `wait.consumed`
- `step.completed`
- `step.failed`
- `run.completed`
- `run.failed`
- `run.cancelled`

## Storage Cutover

本次不兼容旧数据，允许直接清空下列运行态文件：

- `workflow-runs.json`
- `workflow-node-runs.json`
- `workflow-workspace-states.json`

如果 store 被拆分，建议新建：

- `workflow-runs.json`
- `workflow-steps.json`
- `workflow-waits.json`
- `workflow-replies.json`
- `workflow-timeline.json`
- `workflow-workspace-states.json`

## Task 1: Introduce The New Domain Model

**Files:**

- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/workflow/store.go`
- Add: `packages/strategy-service/internal/workflow/run_store.go`
- Add: `packages/strategy-service/internal/workflow/step_store.go`
- Add: `packages/strategy-service/internal/workflow/wait_store.go`
- Add: `packages/strategy-service/internal/workflow/reply_store.go`
- Add: `packages/strategy-service/internal/workflow/timeline_store.go`

**Checklist:**

1. 用 `Run / Step / Wait / Reply` 替换现有运行态核心模型。
2. 从 `Run` 和 `NodeRun` 中删掉 `block_reason`、`block_request_id` 这类过渡字段。
3. 将 `NodeRun` 领域重命名为 `Step`，或者至少在服务层以 `Step` 语义重建接口。
4. 为 `Wait` 增加唯一约束，保证每个 `run_id` 最多一个 `open wait`。
5. 为 `Reply` 增加 `idempotency_key` 去重。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`

## Task 2: Replace The Runner With A Persistent Queue

**Files:**

- Modify: `packages/strategy-service/internal/workflow/service.go`
- Add: `packages/strategy-service/internal/workflow/queue.go`
- Add: `packages/strategy-service/internal/workflow/worker.go`

**Checklist:**

1. 删除 `live map + kick + goroutine` 作为唯一调度方式的假设。
2. 引入可重建的 runnable queue。
3. worker 每次只执行当前 `Run` 的一个可运行阶段。
4. `Wait opened` 后安全退出 worker。
5. `Reply created` 后重新将 `Run` 放回队列。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`

## Task 3: Replace The Resolver Contract

**Files:**

- Modify: `packages/strategy-service/internal/workflow/resolver.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-service/internal/asset/workspace/.opencode/tools/smartx-workflow.ts`
- Add: `packages/strategy-service/internal/asset/workspace/.opencode/tools/workflow-wait.ts`
- Add: `packages/strategy-service/internal/asset/workspace/.opencode/tools/workflow-result.ts`

**Checklist:**

1. 删除“节点必须调用旧 `tool_id` 才算完成”的旧合同。
2. 引入 `workflow_wait` 和 `workflow_result` 两个正式控制工具。
3. `resolve()` 只识别这两个工具作为终态控制信号。
4. 对纯文本追问或未调用控制工具的输出做合同错误处理。
5. 加入自动纠偏重试逻辑。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`

## Task 4: Rebuild The Wait And Reply API

**Files:**

- Modify: `packages/strategy-service/internal/web/workflow_api.go`
- Modify: `packages/strategy-service/internal/web/workspace_chat_api.go`
- Modify: `packages/strategy-service/internal/web/api.go`
- Add: `packages/strategy-service/internal/workflow/snapshot.go`

**Checklist:**

1. 删除所有 `continue` 相关 API。
2. 新增 `POST /workflow-runs/:id/replies`。
3. 新增 `GET /workflow-runs/:id/waits`。
4. 新增 `GET /workspace/workflow-state` 聚合快照接口。
5. 保证 reply 请求是原子操作，不要求前端再补第二次调用。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/web/... ./internal/workflow/...`

## Task 5: Normalize Runtime Question And Permission Into Wait

**Files:**

- Modify: `packages/strategy-service/internal/workflow/waiter.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Add: `packages/strategy-service/internal/workflow/wait_adapter.go`

**Checklist:**

1. 删除当前“看到 `question.asked` 或 `permission.asked` 就直接把 run 标成 `blocked`”的终态逻辑。
2. 如果底层运行时仍发这类事件，将其转换为 `Wait`。
3. 对 workflow service 暴露统一的 `Wait mode`。
4. 不再对前端暴露 `question` 和 `permission` 两套工作流控制面。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`

## Task 6: Move Session Scope From Run To Step

**Files:**

- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/workflow/store.go`

**Checklist:**

1. 每个非自动节点独立创建 session。
2. `Step` 记录自己的 `session_id` 和 `anchor`。
3. 回复 wait 时复用当前 `Step session`。
4. 下一 `Step` 只吃结构化 `handoff`，不共享完整会话上下文。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`

## Task 7: Rebuild Frontend Types And APIs Around Snapshot

**Files:**

- Modify: `packages/strategy-front/src/types/workflow.ts`
- Modify: `packages/strategy-front/src/types/workspace-chat.ts`
- Add: `packages/strategy-front/src/types/workflow-wait.ts`
- Modify: `packages/strategy-front/src/api/modules/workflow.ts`
- Modify: `packages/strategy-front/src/api/modules/workspace-chat.ts`
- Add: `packages/strategy-front/src/api/modules/workflow-run.ts`

**Checklist:**

1. 移除前端类型里对 `block_reason`、`block_request_id` 的运行态依赖。
2. 新增 `Wait`、`Reply`、`WorkflowSnapshot` 类型。
3. 删除前端对 `continue` API 的调用契约。
4. 统一前端从 snapshot 读取页面状态。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun typecheck`

## Task 8: Replace Question And Permission Panels With WaitPanel

**Files:**

- Delete: `packages/strategy-front/src/hooks/use-chat-question.ts`
- Delete: `packages/strategy-front/src/hooks/use-chat-permission.ts`
- Delete: `packages/strategy-front/src/components/chat/question-panel.tsx`
- Modify: `packages/strategy-front/src/components/chat/permission-panel.tsx`
- Add: `packages/strategy-front/src/components/workflow/wait-panel.tsx`
- Modify: `packages/strategy-front/src/components/strategy/strategy-workflow-panel.tsx`

**Checklist:**

1. 删除 `question` 和 `permission` 作为 workflow 页面独立控制面的实现。
2. 新建统一 `WaitPanel`。
3. `WaitPanel` 按 `mode` 渲染 `text / form / approval / confirm`。
4. 输入提交时只调用 reply API。
5. 页面不再显式处理“答完以后再 continue”。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun typecheck`
- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun run build`

## Task 9: Rebuild The Strategy Workflow Chat Hook

**Files:**

- Modify: `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- Modify: `packages/strategy-front/src/pages/strategy-workflow-chat.tsx`

**Checklist:**

1. 用 snapshot 替换当前 `box + rows + question + permission` 拼接模型。
2. `open_wait` 存在时，输入框行为变成 `reply`。
3. `open_wait` 不存在时，输入框行为变成 `dispatch new run`。
4. 删除 hook 中的 `continue` 公开方法。
5. 删除 `blocked` 的旧派生逻辑。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun typecheck`
- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun run build`

## Task 10: Add End-To-End Workflow Wait Tests

**Files:**

- Modify: `packages/strategy-service/internal/workflow/service_test.go`
- Modify: `packages/strategy-service/internal/workflow/resolver_test.go`
- Modify: `packages/strategy-service/internal/workflow/store_test.go`
- Modify: `packages/strategy-service/internal/workflow/validate_test.go`
- Add: `packages/strategy-front/src/lib/workflow-runtime.test.ts`

**Checklist:**

1. 覆盖 `workflow_wait` 进入 `waiting`。
2. 覆盖 `Reply` 正确恢复 `Run`。
3. 覆盖错误 `wait_id` 被拒绝。
4. 覆盖重复 `idempotency_key` 去重。
5. 覆盖模型纯文本追问导致合同错误。
6. 覆盖服务重启后 `waiting` run 可恢复。

**Verify:**

- `Set-Location 'f:\code\opencode\packages\strategy-service'; go test ./internal/workflow/...`
- `Set-Location 'f:\code\opencode\packages\strategy-front'; bun typecheck`

## Task 11: Cleanup Legacy Code Paths

**Files:**

- Modify: all touched files

**Checklist:**

1. 删除 `blocked + continue` 旧路径。
2. 删除 workflow 页面对 `question`、`permission` store 的依赖。
3. 删除旧 `block_reason`、`block_request_id` 在工作流控制中的使用。
4. 清理文档和提示词中“文本追问也能断点”的暗示。

**Verify:**

- `Set-Location 'f:\code\opencode'; rg -n "continue\\(|block_reason|block_request_id|question\\.asked|permission\\.asked" packages/strategy-front packages/strategy-service`

## Acceptance Criteria

- 工作流暂停统一以 `Wait` 表示，不再以 `blocked reason` 字段拼出来。
- 回复人工输入时，前端只调用一次 reply API。
- `question`、`permission`、`approval`、`free text wait` 都走同一套状态机。
- 节点输出普通文本提问不会被当成合法断点。
- 每个非自动 `Step` 拥有独立 session。
- 服务重启后，`waiting` run 仍可恢复。
- 策略工作区页面不再包含 `continue` 控制逻辑。

## Suggested Commit Order

1. `refactor: introduce workflow run step wait reply model`
2. `refactor: replace workflow runner with persistent queue`
3. `refactor: replace workflow control contract with wait/result tools`
4. `refactor: rebuild workflow reply api and snapshot read model`
5. `refactor: replace workflow question permission ui with wait panel`
6. `test: cover workflow wait reply lifecycle`

## Rollout Notes

- 先完成服务端领域模型、队列、API。
- 再完成前端 snapshot 和 `WaitPanel`。
- 切换前清空旧运行态数据文件。
- 切换后用一个最小 workflow 做 smoke test：
  - `plan` 节点输出 `workflow_wait`
  - 用户回复
  - run 自动恢复
  - 节点输出 `workflow_result`

Plan complete and saved to `docs/plans/2026-04-10-strategy-workflow-wait-refactor-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints
