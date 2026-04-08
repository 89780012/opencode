# Strategy Workflow Run Gap Plan

## Summary

This document turns the current `/app/workflows` analysis into an execution plan.

The current workflow system already has:

- a workflow list page and detail page in `strategy-front`
- a workflow model, workflow run model, and node run model in `strategy-service`
- a basic executor that can create sessions, send prompts, wait for completion, and advance to the next node
- frontend grouping for flow control, planner agents, executor agents, and checker agents

The main problem is that the current system is only partially runnable. It can demo a workflow, but it is not yet robust enough for a real single-workspace multi-agent loop such as:

`writer -> checker -> repair -> checker -> runtime-check -> repair -> end`

The missing pieces are mostly in the runtime contract and orchestration behavior, not in the canvas UI itself.

## Current Runtime Model

### What is already true

- One workflow targets one workspace path.
- Each node runs in either a `shared` or `isolated` session.
- The executor creates a session, submits a prompt, waits for the session to finish, resolves assistant output, and picks the next edge.
- `review` and `judge` nodes are the only nodes that currently participate in `pass/fail` branching.

### Important clarification

Node completion is not decided directly from `session.busy`.

The real completion signal is:

- session enters busy state in `opencode`
- workflow executor waits on event stream
- node is treated as done when `session.idle` is received for that session

This means workflow progression is event-driven, not request-response driven.

## Main Gaps

### Gap 1: Checker output is not safe enough

`review` and `judge` require JSON output with `pass`, `summary`, `issues`, and `next_prompt`.

Current problem:

- if the checker returns invalid JSON, the backend silently falls back to plain text
- branch resolution then defaults to the `pass` path unless `pass === false`

Impact:

- malformed checker output can incorrectly advance the workflow as if the check passed

This is the most important blocker.

### Gap 2: Blocked requests do not have a full workflow UX

The runtime already detects:

- `permission.asked`
- `question.asked`

Current problem:

- workflow run becomes `blocked`
- the waiter captures `RequestID`
- but that request id is not persisted into workflow models
- the frontend cannot show which request is blocking the run

Impact:

- the workflow can stop, but the user has little insight into why it stopped

### Gap 3: Node config exists in schema but does not fully affect execution

The node schema already contains:

- `skills`
- `timeout_ms`
- `retry_limit`

Current problem:

- frontend runtime conversion still writes `timeout_ms: 0` and `retry_limit: 0`
- prompt submission only sends `agent` and `parts`
- node-level `model` and `variant` are not part of workflow node config
- `skills` are stored but not executed in any real way

Impact:

- the canvas suggests more control than the runtime actually supports

### Gap 4: Loop and retry behavior is hardcoded

Current loop behavior only increments when:

- current node is `review` or `judge`
- next node is `build`
- result is `pass === false`

Current problem:

- this only supports one special case
- `retry_limit` is not used
- loop protection is hardcoded to a global count of 3

Impact:

- generic repair loops are not truly supported yet

### Gap 5: Session model is still too narrow for generic multi-agent workflows

Current session choices:

- `shared`
- `isolated`

This is enough for:

- one shared writer context
- one-off isolated checker runs

This is not enough for:

- a persistent writer lane
- a persistent syntax checker lane
- a persistent runtime checker lane

Impact:

- the system can do "one shared context plus temporary checks"
- it cannot yet do "multiple long-lived agent contexts inside one workspace"

### Gap 6: Validation and observability are still thin

Current problems:

- graph save path does not strongly validate workflow structure
- right panel does not show enough blocked or execution detail
- some workflow UI copy is still garbled
- raw checker output is not preserved clearly

Impact:

- debugging workflow runs is harder than it should be

## PR Plan

## PR 1: Make The Minimal Workflow Loop Reliable

### Goal

Make `/app/workflows` reliably run a minimal chain:

`start -> planner -> executor -> checker -> pass/fail branch`

### Scope

- make checker nodes fail closed
- preserve raw checker output
- clean up workflow page copy and panel labels
- add basic workflow graph validation

### Changes

#### 1. Make checker parsing fail closed

Files:

- `packages/strategy-service/internal/workflow/resolver.go`
- `packages/strategy-service/internal/workflow/service.go`

Required behavior:

- if node kind is `review` or `judge` and structured JSON is required
- and JSON cannot be parsed
- do not silently treat the node as a successful pass

Recommended implementation:

- return a structured parse error from `resolve()`
- mark node run as `failed`
- fail the workflow run with a clear message such as `review output must be valid JSON`

Alternative:

- mark node `blocked`
- expose a manual continue path only after user intervention

The `failed` path is simpler for the first version.

#### 2. Preserve raw output and structured summary separately

Files:

- `packages/strategy-service/internal/workflow/service.go`
- `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- `packages/strategy-front/src/types/workflow.ts`

Required behavior:

- `row.output` should contain the raw assistant text
- `row.result.text` should contain summary text after structured parsing
- `row.result.structured` should keep the JSON body for checker nodes

Reason:

- the current UI says "view raw output" but backend currently replaces it with summary text

#### 3. Fix workflow page and panel text

Files:

- `packages/strategy-front/src/pages/workflows.tsx`
- `packages/strategy-front/src/components/workflow/workflow-shell.tsx`
- `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-library.tsx`
- `packages/strategy-front/src/types/workflow.ts`

Required behavior:

- remove garbled strings
- keep labels aligned with current product language:
  - `流程控制`
  - `规划智能体`
  - `执行智能体`
  - `检查智能体`
  - `路由判断`

#### 4. Add basic graph validation

Files:

- `packages/strategy-service/internal/workflow/store.go`
- `packages/strategy-service/internal/web/workflow_api.go`

Required validation:

- `workspace_path` must exist
- `root_node_id` must exist in nodes
- all edges must point to real nodes
- at least one node must exist
- if a node is `review` or `judge`, it must have at least one outgoing edge
- `pass/fail` edge conditions must be legal

Optional first-step validation:

- enforce that a workflow has at least one reachable terminal path

### Acceptance

- malformed checker JSON no longer advances the workflow as pass
- raw checker output can be inspected from the right panel
- workflow page copy is readable again
- invalid graphs fail fast on save or start

## PR 2: Wire Blocked State And Real Node Execution Config

### Goal

Make workflow execution controllable and observable at the node level.

### Status Update

Implemented in the current pass:

- persist `block_reason` and `block_request_id` on both workflow run and node run
- clear blocked metadata when a blocked run is resumed
- show blocked reason, request id, and blocked node in `/app/workflows` side panel
- make node `timeout_ms` editable in the workflow canvas and preserve it on save/start
- add node-level `model` and `variant` overrides
- give selected `skills` an explicit short-term runtime behavior by injecting them into the node prompt

### Scope

- persist blocked request information
- expose blocked state in the UI
- wire `timeout_ms`
- add node-level `model` and `variant`
- decide the short-term behavior of `skills`

### Changes

#### 1. Persist blocked request metadata

Files:

- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/waiter.go`
- `packages/strategy-service/internal/workflow/service.go`
- `packages/strategy-front/src/types/workflow.ts`

Add fields to `Run` and `NodeRun`:

- `block_reason`
- `block_request_id`

Required behavior:

- when `permission.asked` occurs, persist `block_reason = permission`
- when `question.asked` occurs, persist `block_reason = question`
- carry `block_request_id` from waiter result into node run and workflow run

#### 2. Show blocked details in the side panel

Files:

- `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- `packages/strategy-front/src/components/workflow/workflow-shell.tsx`

Required behavior:

- show whether the run is blocked by permission or question
- show request id
- show current blocked node
- keep the existing `continue` action

Note:

- this does not need full permission-answer UI in the first pass
- it only needs to make the blocked state understandable

#### 3. Make `timeout_ms` real

Files:

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-node-shared.tsx`
- `packages/strategy-service/internal/workflow/model.go`

Required behavior:

- workflow node editor can view and edit timeout
- runtime conversion preserves timeout instead of hardcoding zero
- backend continues to use `timeout(node)` exactly as now

#### 4. Add node-level model and variant

Files:

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-node-shared.tsx`
- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/web/workflow_api.go`
- `packages/strategy-service/internal/workflow/service.go`

Add fields to workflow node:

- `model_provider_id`
- `model_id`
- `variant`

Required behavior:

- node config can optionally override model
- `sendPrompt()` includes model and variant when present

This is already supported by the underlying opencode prompt input, so this is mostly workflow plumbing.

#### 5. Define short-term `skills` behavior

Files:

- `packages/strategy-service/internal/workflow/service.go`

Short-term recommendation:

- do not pretend `skills` are a hard runtime capability yet
- either:
  - inject selected skills into the workflow prompt text as guidance
  - or clearly treat them as metadata only

For the first runnable version, prompt injection is enough if the UI needs visible effect.

### Acceptance

- blocked runs expose enough detail to debug and continue
- node timeout is editable and preserved
- node can optionally choose a different model or variant
- selected skills have a defined and explicit behavior

## PR 3: Generalize Loops And Session Lanes

### Goal

Move from a hardcoded `plan-build-review` loop to a generic single-workspace multi-agent workflow engine.

### Status Update

Implemented in the current pass:

- remove the hardcoded `review/judge -> build` loop counter
- enforce `retry_limit` from repeated entry count per node
- add a global workflow step cap as the final cycle safety net
- add `keyed` session mode plus `session_key`
- reuse named session lanes inside one workflow run

### Scope

- remove hardcoded repair loop logic
- make `retry_limit` real
- support multiple persistent session lanes in one workspace
- keep `judge` as flow control and use checker agents for pass/fail inspection

### Changes

#### 1. Replace hardcoded loop counting

Files:

- `packages/strategy-service/internal/workflow/service.go`

Current logic:

- only increments on `review/judge -> build` with `pass === false`

Required behavior:

- loop counting should be driven by actual node transitions
- repeated entry into the same node should be counted per run
- retry limits should not depend on node kind names

Recommended approach:

- count visits per node id inside a run
- fail when a node exceeds its configured `retry_limit`
- keep a separate global safety cap as a final fallback

#### 2. Make `retry_limit` effective

Files:

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-node-shared.tsx`
- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/service.go`

Required behavior:

- node editor can configure retry limit
- save path preserves retry limit
- runtime enforces retry limit for repeated node entry

#### 3. Introduce keyed session lanes

Files:

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/components/workflow/workflow-node-shared.tsx`
- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/service.go`

Current modes:

- `shared`
- `isolated`

Proposed extension:

- `shared`
- `isolated`
- `keyed`

Add:

- `session_key`

Semantics:

- `shared`: use workflow root session
- `isolated`: create a fresh session every time
- `keyed`: reuse the same named session for nodes with the same key in one run

Examples:

- writer node: `keyed`, `session_key = writer`
- syntax checker node: `keyed`, `session_key = syntax`
- runtime checker node: `keyed`, `session_key = runtime`
- repair node: `keyed`, `session_key = writer`

This is the key step that makes "multiple agents in one workspace" truly generic.

#### 4. Keep `judge` and checker agents separate

Files:

- `packages/strategy-front/src/components/workflow/workflow-library.tsx`
- `packages/strategy-front/src/types/workflow.ts`

Required product rule:

- checker agents are custom nodes that inspect state and output `pass/fail`
- `judge` is a built-in flow-control node used for routing

This keeps product semantics clear:

- checkers inspect
- judge routes

### Acceptance

- repair loops can target arbitrary nodes, not only `build`
- retry policy is configured per node
- one workflow run can maintain several persistent agent contexts inside one workspace

## Recommended Order

### First

Implement PR 1.

Reason:

- it removes the biggest false-positive path
- it makes the current demo trustworthy enough to run

### Second

Implement PR 2.

Reason:

- after the minimal loop is reliable, the next blocker is observability and node-level control

### Third

Implement PR 3.

Reason:

- this is where the workflow engine becomes truly generic
- it is also the most structural change

## Recommended File Checklist

### Primary backend files

- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/service.go`
- `packages/strategy-service/internal/workflow/resolver.go`
- `packages/strategy-service/internal/workflow/waiter.go`
- `packages/strategy-service/internal/workflow/store.go`
- `packages/strategy-service/internal/web/workflow_api.go`

### Primary frontend files

- `packages/strategy-front/src/types/workflow.ts`
- `packages/strategy-front/src/lib/workflow-runtime.ts`
- `packages/strategy-front/src/pages/workflows.tsx`
- `packages/strategy-front/src/components/workflow/workflow-shell.tsx`
- `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`
- `packages/strategy-front/src/components/workflow/workflow-node-shared.tsx`
- `packages/strategy-front/src/components/workflow/workflow-library.tsx`

## Out Of Scope For This Plan

- full human approval UI for permission and question requests
- multi-workspace workflows
- autonomous approval policies
- plugin execution as first-class workflow nodes
- arbitrary expression language for edge conditions

## Final Recommendation

The current `/app/workflows` work should not be treated as a canvas problem anymore.

The canvas is already good enough to support the next stage. The real priority is to harden the runtime contract so that:

- checker nodes cannot accidentally pass
- blocked runs are diagnosable
- node config actually affects execution
- loop behavior is generic instead of hardcoded
- multi-agent execution inside one workspace can evolve from `shared|isolated` into persistent named lanes

Once those pieces are in place, your custom node system can remain generic and the example roles such as `writer`, `syntax-checker`, and `runtime-checker` can stay user-defined rather than baked into product semantics.
