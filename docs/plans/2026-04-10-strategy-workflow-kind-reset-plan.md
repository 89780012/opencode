# Strategy Workflow Kind Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `strategy-front` 和 `strategy-service` 的工作流模型重构为固定节点大类加可选 agent 的结构，彻底移除旧的 `intent/build/review/judge/gate` 语义，不做兼容。

**Architecture:** 工作流语义层只保留 `start / router / plan / execute / check / end` 六类节点，边条件只保留 `always / plan / execute / check / pass / fail`。前端左侧节点库改为固定模板，右侧属性面板改为“节点类型固定，agent 可选”；后端运行时、校验器、工具协议、默认模板和内置 agents 一起切换到新模型。

**Tech Stack:** React 19, TypeScript, `@xyflow/react`, Bun, Go, Gin, opencode runtime, embedded workspace assets.

---

## Global Rules

- 这次改造不做兼容，不保留旧枚举、旧路由逻辑、旧工具字段兜底。
- 旧工作流和旧运行记录允许直接失效；必要时清空工作流本地数据文件。
- 所有新 agent frontmatter 必须显式声明 `workflow_role`。
- 所有新节点都必须有明确职责：
  - `router` 只做路由
  - `plan` 只做规划
  - `execute` 只做执行
  - `check` 只做检查
- `title` 只做显示文案，不能再承担 `agent` 标识。

## Target Model

### Node Kind

- `start`
- `router`
- `plan`
- `execute`
- `check`
- `end`

### Edge Cond

- `always`
- `plan`
- `execute`
- `check`
- `pass`
- `fail`

### Default Flow

- `start -> router`
- `router(plan) -> plan`
- `router(execute) -> execute`
- `router(check) -> check`
- `plan -> execute`
- `execute -> check`
- `check(pass) -> end`
- `check(fail) -> execute`

### Tool Contract

```json
{
  "kind": "router",
  "summary": "需要先拆计划",
  "handoff": "先整理任务边界和交付物",
  "route": "plan"
}
```

```json
{
  "kind": "plan",
  "summary": "先分三步推进",
  "handoff": "按步骤修改工作区并自测",
  "steps": ["梳理节点模型", "修改前后端映射", "补测试"],
  "deliverables": ["新的工作流模型", "新的默认模板"],
  "risks": ["旧工作流数据需要清理"]
}
```

```json
{
  "kind": "execute",
  "summary": "已完成 execute 节点要求的改动",
  "handoff": "进入检查节点确认边和运行时行为"
}
```

```json
{
  "kind": "check",
  "summary": "执行结果符合要求",
  "handoff": "结束工作流",
  "pass": true,
  "issues": []
}
```

## Cleanup List

### Remove Old Workflow Kinds

- `intent`
- `build`
- `review`
- `judge`
- `gate`

### Remove Old Edge Labels

- `checker`

### Remove Old Default Flow Chain

- `strategy`
- `js-strategy`
- `python-strategy`
- `docs`

### Remove Old Node Components

- `packages/strategy-front/src/components/workflow/workflow-node-intent.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-build.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-review.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-judge.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-gate.tsx`

### Replace With New Components

- `packages/strategy-front/src/components/workflow/workflow-node-router.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-execute.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-check.tsx`

## Task 1: Reset The Core Workflow Types

**Files:**
- Modify: `packages/strategy-front/src/types/workflow.ts`
- Modify: `packages/strategy-service/internal/workflow/model.go`

**Checklist:**

1. 将前端 `WorkflowKind` 改为 `start | router | plan | execute | check | end`。
2. 将前端 `WorkflowEdgeCond` 改为 `always | plan | execute | check | pass | fail`。
3. 删除前端 `judge`、`gate`、`intent`、`build`、`review` 的描述、默认 prompt、默认 agent。
4. 前端 `kindName`、`kindDesc`、`kindPrompt`、`kindAgent` 全部切换到新枚举。
5. 在前端字段定义里新增显式 `agent` 字段。
6. 将后端 `Kind` 改为 `Start / Router / Plan / Execute / Check / End`。
7. 将后端 `Cond` 改为 `Always / PlanTo / ExecuteTo / CheckTo / Pass / Fail`。
8. 后端 `Result` 新增 `Route / Issues / Steps / Deliverables / Risks / Handoff`。
9. 删除后端 `Intent` 字段。
10. 保留 `Pass`，供 `check` 节点路由使用。

**Verify:**

- Frontend grep: `rg -n "\"intent\"|\"build\"|\"review\"|\"judge\"|\"gate\"" packages/strategy-front/src/types/workflow.ts`
- Backend grep: `rg -n "Intent|Build|Review|Judge|Gate" packages/strategy-service/internal/workflow/model.go`

## Task 2: Make Agent A First-Class Node Field

**Files:**
- Modify: `packages/strategy-front/src/types/workflow.ts`
- Modify: `packages/strategy-front/src/lib/workflow-runtime.ts`
- Modify: `packages/strategy-front/src/components/workflow/workflow-node-panel.tsx`

**Checklist:**

1. 在前端 `workflowField` 里新增 `agent`。
2. 在 `fields(kind, seed)` 中加入 agent 选择字段。
3. 在 `WorkflowSeed` 中加入 `agent`。
4. 修改 `makeNode(...)`，默认 title 使用节点名，agent 使用节点 agent。
5. 修改 `runtimeDetail(...)`，读取运行时 `agent` 到节点字段，而不是塞进 `title`。
6. 修改 `fromFlow(...)`，保存时直接从 `agent` 字段写回运行时节点。
7. 删除 `title -> agent` 的反推逻辑。
8. 右侧面板增加 agent 下拉，不再让“节点标题”承担 agent 切换功能。
9. `title` 保留为可选显示名。

**Verify:**

- `rg -n "return node.data.title.trim\\(\\)|title\\(node\\)|kindAgent\\(" packages/strategy-front/src/lib/workflow-runtime.ts`
- 手动检查保存逻辑里 `agent:` 来自 agent 字段而不是 title。

## Task 3: Standardize Workflow Agent Roles

**Files:**
- Modify: `packages/strategy-front/src/types/agent.ts`
- Modify: `packages/strategy-front/src/data/global-data-provider.tsx`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/intent.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/smartx-plan.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/checker.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/strategy.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/js-strategy.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/python-strategy.md`

**Checklist:**

1. 前端 `WorkflowAgentRole` 改为 `router | planner | executor | checker`。
2. `role(...)` 解析逻辑只认这四种角色。
3. 删除 `workflow_kind` 的角色推断逻辑。
4. `intent.md` 改名或保留文件名，但 frontmatter 必须是 `workflow_role: router`。
5. `smartx-plan.md` 设为 `workflow_role: planner`。
6. `checker.md` 设为 `workflow_role: checker`。
7. `strategy.md`、`js-strategy.md`、`python-strategy.md` 全部设为 `workflow_role: executor`。
8. 更新 agent 描述文案，使其和 `router / plan / execute / check` 四类职责一致。
9. 明确写出工具调用要求，全部使用新 `kind`。

**Verify:**

- `rg -n "^workflow_role:" packages/strategy-service/internal/asset/workspace/agents`
- `rg -n "workflow_kind" packages/strategy-service/internal/asset/workspace/agents packages/strategy-front/src/data/global-data-provider.tsx`

## Task 4: Rebuild The Left Workflow Library

**Files:**
- Modify: `packages/strategy-front/src/components/workflow/workflow-library.tsx`

**Checklist:**

1. 左侧节点库改为固定节点模板，不再遍历 agent 列表生成节点种类。
2. 固定分组为：
   - `流程控制`
   - `规划智能体`
   - `执行智能体`
   - `检查智能体`
3. `流程控制` 只显示：
   - `开始`
   - `路由`
   - `结束`
4. `规划智能体` 只显示一个 `plan` 节点模板。
5. `执行智能体` 只显示一个 `execute` 节点模板。
6. `检查智能体` 只显示一个 `check` 节点模板。
7. 拖拽 payload 里只传固定 `kind`，agent 由默认 role 推荐值填充。
8. 搜索只过滤固定模板文案，不再把 agent 本身当节点项。
9. 删除当前 `infer(...)` 逻辑。

**Verify:**

- `rg -n "function infer|workflow_role|item.name|group\\(kind\\)" packages/strategy-front/src/components/workflow/workflow-library.tsx`

## Task 5: Constrain Edge Options By Source Node Type

**Files:**
- Modify: `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- Modify: `packages/strategy-front/src/lib/workflow-runtime.ts`

**Checklist:**

1. 在右侧边栏新增一个“按源节点类型给出条件选项”的函数。
2. 当源节点是 `router`，只显示：
   - `plan`
   - `execute`
   - `check`
3. 当源节点是 `check`，只显示：
   - `pass`
   - `fail`
4. 当源节点是 `start / plan / execute / end`，只显示：
   - `always`
5. 边标签默认文案同步改为：
   - `进入规划`
   - `进入执行`
   - `进入检查`
   - `通过`
   - `失败`
   - `始终`
6. `fromFlow(...)` 中的 `cond` 落库逻辑只允许新条件值。
7. 删除旧的 `checker` 条件判断。

**Verify:**

- `rg -n "\"checker\"|edgeLabel\\(|SelectItem value=|props.edge.data\\?\\.cond" packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx packages/strategy-front/src/lib/workflow-runtime.ts`

## Task 6: Replace Node Components And Node Type Mapping

**Files:**
- Delete: `packages/strategy-front/src/components/workflow/workflow-node-intent.tsx`
- Delete: `packages/strategy-front/src/components/workflow/workflow-node-build.tsx`
- Delete: `packages/strategy-front/src/components/workflow/workflow-node-review.tsx`
- Delete: `packages/strategy-front/src/components/workflow/workflow-node-judge.tsx`
- Delete: `packages/strategy-front/src/components/workflow/workflow-node-gate.tsx`
- Add: `packages/strategy-front/src/components/workflow/workflow-node-router.tsx`
- Add: `packages/strategy-front/src/components/workflow/workflow-node-execute.tsx`
- Add: `packages/strategy-front/src/components/workflow/workflow-node-check.tsx`
- Modify: `packages/strategy-front/src/components/workflow/workflow-node.tsx`

**Checklist:**

1. 新建 `workflow-node-router.tsx`。
2. 新建 `workflow-node-execute.tsx`。
3. 新建 `workflow-node-check.tsx`。
4. 复用现有共享布局，避免再扩展更多 node 组件分支。
5. 更新 `workflowNodeTypes` 映射，只保留：
   - `workflow-start`
   - `workflow-router`
   - `workflow-plan`
   - `workflow-execute`
   - `workflow-check`
   - `workflow-end`
6. 删除旧映射里的 `intent/build/review/judge/gate`。

**Verify:**

- `rg --files packages/strategy-front/src/components/workflow | rg "workflow-node-(intent|build|review|judge|gate|router|execute|check)"`
- `rg -n "workflow-intent|workflow-build|workflow-review|workflow-judge|workflow-gate" packages/strategy-front/src/components/workflow packages/strategy-front/src/types/workflow.ts`

## Task 7: Reset The Default Workflow Template

**Files:**
- Modify: `packages/strategy-front/src/lib/workflow-template.ts`
- Modify: `packages/strategy-front/src/pages/workflows.tsx`

**Checklist:**

1. 默认模板节点只保留：
   - `start`
   - `router`
   - `plan`
   - `execute`
   - `check`
   - `end`
2. `router` 默认 agent 设为路由 agent。
3. `plan` 默认 agent 设为 `smartx-plan`。
4. `execute` 默认 agent 设为 `strategy`。
5. `check` 默认 agent 设为 `checker`。
6. 删除 `strategy -> js -> python -> docs` 这条硬编码链。
7. 页面文案更新为“固定节点类型，节点内选择 agent”。

**Verify:**

- `rg -n "js-strategy|python-strategy|docs|intent|build|review" packages/strategy-front/src/lib/workflow-template.ts packages/strategy-front/src/pages/workflows.tsx`

## Task 8: Rewrite The Tool Contract

**Files:**
- Modify: `packages/strategy-service/internal/asset/workspace/.opencode/tools/smartx-workflow.ts`

**Checklist:**

1. 将工具 description 改成新协议说明。
2. `kind` 只允许：
   - `router`
   - `plan`
   - `execute`
   - `check`
3. 将 `next_prompt` 改名为 `handoff`。
4. 将 `intent` 改名为 `route`。
5. 将 `plan` 改名为 `steps`。
6. 保留 `deliverables`、`risks`、`issues`。
7. `execute` 节点只要求 `summary`，`handoff` 可选。
8. 标题元数据切换到：
   - `工作流路由`
   - `工作流规划`
   - `工作流执行`
   - `工作流检查`

**Verify:**

- `Get-Content -Encoding utf8 packages/strategy-service/internal/asset/workspace/.opencode/tools/smartx-workflow.ts`

## Task 9: Rewrite Agent Prompts To Match The New Tool Contract

**Files:**
- Modify: `packages/strategy-service/internal/asset/workspace/agents/intent.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/smartx-plan.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/checker.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/strategy.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/js-strategy.md`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/python-strategy.md`

**Checklist:**

1. `router` agent 改为返回 `kind: "router"` 和 `route`。
2. `plan` agent 改为返回 `kind: "plan"` 和 `steps`。
3. `checker` agent 改为返回 `kind: "check"` 和 `pass/issues`。
4. `strategy/js/python` agent 改为返回 `kind: "execute"`。
5. 所有 agent 文案都删掉 `next_prompt`、`intent`、`build`、`review` 等旧术语。
6. 所有 agent 都明确要求“不要在助手文本中粘贴 JSON”。

**Verify:**

- `rg -n "next_prompt|intent|kind: \\\"intent\\\"|kind: \\\"build\\\"|kind: \\\"review\\\"|checker" packages/strategy-service/internal/asset/workspace/agents`

## Task 10: Rebuild Resolver Parsing

**Files:**
- Modify: `packages/strategy-service/internal/workflow/resolver.go`

**Checklist:**

1. 将解析结构改为读取：
   - `kind`
   - `summary`
   - `handoff`
   - `route`
   - `pass`
   - `issues`
   - `steps`
   - `deliverables`
   - `risks`
2. `router` 节点要求 `route = "plan" | "execute" | "check"`。
3. `plan` 节点要求 `steps` 至少一项。
4. `check` 节点要求 `pass` 必填。
5. `execute` 节点至少要求 `summary`。
6. `res.Text` 统一取 `summary`。
7. `handoff` 写入 `Result.Handoff`。
8. `route` 写入 `Result.Route`。
9. `issues / steps / deliverables / risks` 写入新结果字段。
10. 删除旧 `Intent` 逻辑。

**Verify:**

- `go test ./internal/workflow/...`

## Task 11: Rewrite Runtime Prompt Contract

**Files:**
- Modify: `packages/strategy-service/internal/workflow/service.go`

**Checklist:**

1. `toolPrompt(...)` 改为新节点说明：
   - `router` 返回 `route`
   - `plan` 返回 `steps`
   - `execute` 返回 `summary`
   - `check` 返回 `pass`
2. 将提示词中的 `next_prompt` 全部改为 `handoff`。
3. 将提示词中的 `intent` 全部改为 `route`。
4. 将提示词中的 `build/review/judge/gate` 全部切换为 `execute/check`。
5. `buildPrompt(...)` 保持结构，但术语更新到新模型。
6. `retryPrompt(...)` 也同步新字段名。

**Verify:**

- `rg -n "next_prompt|intent =|For intent nodes|For plan nodes|For review or judge nodes|build nodes|gate nodes" packages/strategy-service/internal/workflow/service.go`

## Task 12: Rewrite Next-Edge Routing

**Files:**
- Modify: `packages/strategy-service/internal/workflow/service.go`

**Checklist:**

1. `router` 节点按 `Result.Route` 选择：
   - `plan`
   - `execute`
   - `check`
2. `check` 节点按 `Result.Pass` 选择：
   - `pass`
   - `fail`
3. `plan` 和 `execute` 默认只走 `always`。
4. 删除旧 `Intent` 和 `Review/Judge` 路由分支。

**Verify:**

- `go test ./internal/workflow/...`

## Task 13: Harden Validation Around Node And Edge Semantics

**Files:**
- Modify: `packages/strategy-service/internal/workflow/validate.go`
- Modify: `packages/strategy-service/internal/workflow/store.go`

**Checklist:**

1. 非 `start/end` 节点必须有 `tool_id`。
2. `start/end` 节点不允许配置 tool、skills、model、variant。
3. `router` 节点必须至少有一条 `plan/execute/check` 出边。
4. `check` 节点必须至少有一条 `pass/fail` 出边。
5. `plan`、`execute` 节点若有出边，只允许 `always`。
6. `start` 节点若有出边，只允许 `always`。
7. `end` 节点不允许出边。
8. `store.go` 的 `kind(...)` 和 `cond(...)` 只认新枚举。
9. 删除旧 `checker` 条件。
10. 删除旧 `judge/gate/intent/build/review` 归一化。

**Verify:**

- `go test ./internal/workflow/...`
- `rg -n "checker|Judge|Gate|Intent|Build|Review" packages/strategy-service/internal/workflow`

## Task 14: Reset Workflow Runtime Store Semantics

**Files:**
- Modify: `packages/strategy-service/internal/workflow/store.go`

**Checklist:**

1. `cleanNodes(...)` 中新 kind 默认值改为 `Plan` 或 `Execute` 之前先确认，建议改为 `Execute` 以减少误路由。
2. 删除任何旧 kind 映射分支。
3. 删除任何旧 cond 映射分支。
4. 保证存量 JSON 读入旧值时直接落为默认新值，而不是兼容旧语义。
5. 记录一条明确注释：本次重构不做旧工作流兼容。

**Verify:**

- `go test ./internal/workflow/...`

## Task 15: Refresh The Workflow Canvas Runtime Mapping

**Files:**
- Modify: `packages/strategy-front/src/lib/workflow-runtime.ts`
- Modify: `packages/strategy-front/src/components/workflow/workflow-canvas.tsx`

**Checklist:**

1. 新节点类型映射改为：
   - `workflow-start`
   - `workflow-router`
   - `workflow-plan`
   - `workflow-execute`
   - `workflow-check`
   - `workflow-end`
2. `tone(...)` 只按新 kind 着色。
3. `runtimeDetail(...)` 和 `fromFlow(...)` 删除全部旧 kind 分支。
4. 新增 `agent` 字段 round-trip 检查。
5. 新增 source kind 感知，供边面板筛选条件。

**Verify:**

- `bun run build`

**Run:**

```powershell
Set-Location 'f:\code\opencode\packages\strategy-front'
bun run build
```

## Task 16: Update Workflow Summary And Sidepanel Terminology

**Files:**
- Modify: `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- Modify: `packages/strategy-service/internal/workflow/summary.go`

**Checklist:**

1. 统计页节点 kind 展示新名称。
2. 历史日志里 `check` 节点显示 `pass/fail`。
3. `router` 节点日志显示 `route`。
4. 若日志里有 `steps/issues/deliverables/risks`，优先结构化渲染。
5. 删除旧 `review` 解析辅助函数命名，改为通用 `parseCheck` 或 `parseNodeResult`。

**Verify:**

- `bun run build`
- `go test ./internal/workflow/...`

## Task 17: Clear Legacy Data And Embedded Assets

**Files:**
- Modify: `packages/strategy-service/internal/asset/workspace/.opencode/tools/smartx-workflow.ts`
- Modify: `packages/strategy-service/internal/asset/workspace/agents/*.md`

**Checklist:**

1. 确认 embedded workspace 资产已经全部切换到新模型。
2. 删除旧术语后，执行一次 asset grep：
   - `intent`
   - `build`
   - `review`
   - `judge`
   - `gate`
   - `next_prompt`
   - `checker`
3. 本地清理旧 workflow 数据文件：
   - `workflows.json`
   - `workflow-runs.json`
   - `workflow-node-runs.json`
   - `workflow-workspace-states.json`
4. 如需保留工作流 ID，则在清理前导出一份快照。

**Verify:**

- `rg -n "next_prompt|judge|gate|review|intent|checker" packages/strategy-service/internal/asset/workspace packages/strategy-front/src packages/strategy-service/internal/workflow`

## Task 18: Rewrite Tests To The New Model

**Files:**
- Modify: `packages/strategy-service/internal/workflow/validate_test.go`
- Modify: `packages/strategy-service/internal/workflow/resolver_test.go`
- Modify: `packages/strategy-service/internal/workflow/service_test.go`
- Modify: `packages/strategy-service/internal/workflow/store_test.go`

**Checklist:**

1. 删除旧 kind 的测试样例。
2. 新增 `router` 只能走 `plan/execute/check` 的校验测试。
3. 新增 `check` 只能走 `pass/fail` 的校验测试。
4. 新增 `plan/execute` 只能走 `always` 的校验测试。
5. 新增 `router` 解析 `route` 的解析测试。
6. 新增 `plan` 解析 `steps` 的解析测试。
7. 新增 `check` 解析 `pass/issues` 的解析测试。
8. 新增 `next()` 在 `router/check` 下的路由测试。
9. 更新 store 清洗测试，确保旧 cond 不再保留。

**Run:**

```powershell
Set-Location 'f:\code\opencode\packages\strategy-service'
go test ./internal/workflow/...
```

## Task 19: Build And Smoke Test Both Packages

**Files:**
- No code changes required

**Checklist:**

1. 构建 `strategy-front`。
2. 运行 `strategy-service` workflow 相关测试。
3. 用一个新工作流手工检查：
   - 可拖入六类节点
   - 可为 `execute` 选择 `strategy/js/python`
   - `router` 边只显示 `plan/execute/check`
   - `check` 边只显示 `pass/fail`
   - 保存后 agent 不受 title 影响

**Run:**

```powershell
Set-Location 'f:\code\opencode\packages\strategy-front'
bun run build
```

```powershell
Set-Location 'f:\code\opencode\packages\strategy-service'
go test ./internal/workflow/... ./internal/web/...
```

## Task 20: Final Cleanup Pass

**Files:**
- Modify: all touched files

**Checklist:**

1. 全仓 grep 删除旧术语残留：
   - `intent`
   - `build`
   - `review`
   - `judge`
   - `gate`
   - `next_prompt`
   - `checker` 条件
2. 检查前端文案是否全部中文化。
3. 检查工作流画布、侧栏、默认模板、agent、tool 是否语义一致。
4. 检查没有任何地方再靠标题推导 agent。
5. 检查默认模板图是短链路，而不是长代理链。

**Run:**

```powershell
Set-Location 'f:\code\opencode'
rg -n "next_prompt|workflow_kind: intent|workflow-intent|workflow-build|workflow-review|workflow-judge|workflow-gate|\"checker\"|Judge|Gate" packages/strategy-front packages/strategy-service
```

## Suggested Commit Order

1. `refactor: reset workflow core kinds and conds`
2. `refactor: split workflow node agent from title`
3. `refactor: rebuild workflow library and edge constraint ui`
4. `refactor: rewrite workflow tool and embedded agents`
5. `refactor: rewrite workflow runtime routing and validation`
6. `test: replace workflow tests with router-plan-execute-check model`

## Acceptance Criteria

- 左侧节点库永远只有六类固定节点。
- 新增 agent 不会新增节点类型。
- `router` 边栏只显示 `plan / execute / check`。
- `check` 边栏只显示 `pass / fail`。
- `title` 改名不会影响实际执行 agent。
- 默认模板只包含 `start / router / plan / execute / check / end`。
- 后端运行时、工具协议、agent 指令、前端画布语义完全一致。
- 旧 kind、旧 cond、旧工具字段在代码中被移除，而不是兼容。
