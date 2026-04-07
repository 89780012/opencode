# Strategy Single Workspace Workflow Design

## Summary

This document defines a workflow runtime for `packages/strategy-front` and `packages/strategy-service` that orchestrates multiple agent nodes against a single workspace.

The core constraint is that `opencode` is not a short synchronous LLM call. A prompt sent to a session may run for a long time, emit intermediate events, request permissions or answers, and only later return to an idle state. Because of that, workflow orchestration must be built around session lifecycle events rather than request/response timing.

The design in this document treats:

- one `workspace` as the single code context for a workflow
- one `session` as the execution context for a node
- one `node` as a configured agent invocation
- one `workflow run` as a durable state machine that advances when sessions reach terminal states

This design supports:

- shared session nodes such as `plan` and `build`
- isolated session nodes such as `review`
- review feedback loops back into the shared build session
- long-running session monitoring via event-based completion

## Goals

- Support workflows that operate on a single workspace path
- Allow each node to pick an agent, skills, prompt, timeout, and session mode
- Reuse `opencode` session APIs and event streams instead of building a second execution engine
- Reliably determine when a long-running node is complete
- Support `review -> build` repair loops
- Persist workflow definitions and workflow run state in `strategy-service`
- Expose workflow run status to `strategy-front`

## Non-Goals

- Multi-workspace orchestration in the first version
- Arbitrary plugin execution inside workflow nodes
- Automatic merge between separate workspaces
- Generic DAG condition language in the first version
- Fully autonomous permission answering in the first version

## Current Repository Context

### Frontend

`packages/strategy-front` already has the right building blocks for a workflow UI, but the current workflow pages are still demo-oriented.

Relevant files:

- [workflow detail page](/f:/code/opencode/packages/strategy-front/src/pages/workflow-detail.tsx)
- [workflow shell](/f:/code/opencode/packages/strategy-front/src/components/workflow/workflow-shell.tsx)
- [workflow canvas](/f:/code/opencode/packages/strategy-front/src/components/workflow/workflow-canvas.tsx)
- [workflow types](/f:/code/opencode/packages/strategy-front/src/types/workflow.ts)
- [workflow demo data](/f:/code/opencode/packages/strategy-front/src/data/workflow-demo.ts)

The real runtime path in the frontend is the chat/session stack:

- [chat API](/f:/code/opencode/packages/strategy-front/src/api/modules/chat.ts)
- [prompt submit hook](/f:/code/opencode/packages/strategy-front/src/hooks/use-prompt-submit.ts)
- [workspace event hook](/f:/code/opencode/packages/strategy-front/src/hooks/use-chat-events.ts)
- [chat types](/f:/code/opencode/packages/strategy-front/src/types/chat.ts)
- [chat event reducer](/f:/code/opencode/packages/strategy-front/src/lib/chat-event-reducer.ts)

### Backend

`packages/strategy-service` already manages workspace metadata and the managed `opencode` runtime, but it does not yet have a workflow executor.

Relevant files:

- [API router](/f:/code/opencode/packages/strategy-service/internal/web/api.go)
- [opencode management API](/f:/code/opencode/packages/strategy-service/internal/web/opencode_api.go)
- [opencode manager](/f:/code/opencode/packages/strategy-service/internal/oprun/manager.go)
- [workspace service](/f:/code/opencode/packages/strategy-service/internal/workspace/service.go)
- [global agent docs](/f:/code/opencode/packages/strategy-service/internal/opdoc/agent.go)

## Product Model

### Core Rule

A workflow runs against one workspace path. All node execution uses that same workspace path. The workflow runtime changes the session context per node, not the workspace context.

### Why This Model Fits `opencode`

`opencode` is already built around:

- `directory` as workspace scope
- `session` as conversation scope
- asynchronous prompt submission
- event streams for long-running execution

The workflow layer should therefore orchestrate `workspace + session + prompt`, not replace them.

## Concepts

### Workflow

A workflow is a graph of configured nodes that always target the same workspace path.

### Workflow Node

A workflow node is one agent step with:

- a node kind
- an agent
- optional skills
- a session mode
- a prompt template
- timeout and retry policy

### Workflow Run

A workflow run is the durable execution record for one attempt to run a workflow against one workspace.

### Node Run

A node run is the durable execution record for one concrete node invocation. It captures:

- which session was used
- when execution started
- what input was sent
- how completion was detected
- what output was produced

## Session Strategy

### Shared Session

`shared` nodes reuse the workflow root session.

Use cases:

- `plan`
- `build`
- `fix`
- `refactor`

Benefits:

- conversational continuity
- fewer repeated instructions
- natural handoff from planning into implementation

Costs:

- context grows over time
- poor review output can pollute the implementation chain

### Isolated Session

`isolated` nodes create a new session for the same workspace.

Use cases:

- `review`
- `security review`
- `test analysis`
- `release checklist`

Benefits:

- does not pollute the shared implementation session
- easier to constrain output format
- easier to reason about as a separate task

Costs:

- requires explicit input synthesis
- loses shared conversational memory

### Recommended First Version

- `plan`: `shared`
- `build`: `shared`
- `review`: `isolated`

## Completion Model For Long-Running Sessions

### Problem

`prompt_async` does not mean the work is complete. A node may run for a long time and emit:

- intermediate text
- retries
- todo updates
- permission requests
- question requests
- final completion

The workflow engine cannot advance to the next node based on HTTP completion.

### Rule

A node is complete only when its session reaches a terminal event after the node prompt has been submitted.

### Session Events That Matter

From the existing chat event model:

- `session.status`
- `session.idle`
- `session.error`
- `permission.asked`
- `question.asked`

Interpretation:

- `session.status = busy` means running
- `session.status = retry` means still running
- `session.idle` means the node is complete
- `session.error` means the node failed
- `permission.asked` or `question.asked` means the node is blocked

### Important Constraint

The workflow runtime must not use only the current session status because sessions are long-lived. It must correlate completion to the current node execution window.

That requires an execution anchor.

## Execution Anchor

Before submitting a node prompt, the runner records an anchor:

- prompt start timestamp
- current last message id in the session, if any

After the session reaches a terminal state, the runner fetches messages again and only treats messages after that anchor as the node output.

This prevents:

- accidentally reading old idle state
- confusing historical messages with the current node run

## Runtime State Machines

### Workflow Run State

```text
pending -> running -> done
pending -> running -> failed
pending -> running -> blocked
blocked -> running
```

### Node Run State

```text
pending -> running -> done
pending -> running -> failed
pending -> running -> blocked
pending -> running -> timeout
blocked -> running
```

### Node State Semantics

- `pending`: not started
- `running`: prompt was submitted and execution is active
- `blocked`: waiting for permission or question response
- `failed`: session reported failure
- `timeout`: node exceeded timeout without terminal event
- `done`: session returned to idle after this node invocation

## Backend Architecture

Create a new workflow module in `strategy-service`.

Suggested layout:

```text
packages/strategy-service/internal/workflow/
  model.go
  store.go
  runner.go
  waiter.go
  resolver.go
  prompt.go
  graph.go
  session.go
```

### Responsibilities

#### `model.go`

Defines:

- workflow definitions
- workflow run records
- node run records
- node result payloads

#### `store.go`

Persists:

- workflows
- workflow runs
- node runs

The first version can use a file-backed JSON store similar to other local metadata in `strategy-service`.

#### `session.go`

Provides:

- root session creation
- isolated session creation
- session selection based on `session_mode`

#### `prompt.go`

Builds final node input from:

- user input
- prior node result summaries
- review feedback
- node prompt template
- session mode specific context

#### `waiter.go`

Waits for one session to reach a terminal result after a node prompt is sent.

#### `resolver.go`

Extracts:

- newly generated assistant text
- diffs
- structured review output

#### `graph.go`

Determines next node transitions.

The first version should support only:

- `always`
- `pass`
- `fail`

#### `runner.go`

Coordinates the full run:

- selects the next node
- picks the session
- sends prompt
- waits for terminal state
- resolves output
- records state
- loops to the next node

## Backend Data Model

### Workflow

```go
type Workflow struct {
	ID            string
	Name          string
	WorkspacePath string
	RootNodeID    string
	Nodes         []WorkflowNode
	Edges         []WorkflowEdge
	UpdatedAt     int64
}
```

### Workflow Node

```go
type WorkflowNode struct {
	ID          string
	Kind        NodeKind
	Title       string
	Agent       string
	Skills      []string
	SessionMode SessionMode
	Prompt      string
	TimeoutMS   int64
	RetryLimit  int
}
```

### Workflow Edge

```go
type WorkflowEdge struct {
	ID    string
	From  string
	To    string
	Cond  string
	Label string
}
```

### Workflow Run

```go
type WorkflowRun struct {
	ID            string
	WorkflowID    string
	WorkspacePath string
	RootSessionID string
	Status        RunStatus
	CurrentNodeID string
	Loop          int
	StartedAt     int64
	EndedAt       int64
	Error         string
}
```

### Node Run

```go
type NodeRun struct {
	ID        string
	RunID     string
	NodeID    string
	SessionID string
	Status    NodeStatus
	Turn      int
	Input     string
	Output    string
	Error     string
	StartedAt int64
	EndedAt   int64
	Anchor    Anchor
	Result    NodeResult
}
```

### Anchor

```go
type Anchor struct {
	StartedAt     int64
	LastMessageID string
}
```

### Node Result

```go
type NodeResult struct {
	Text       string
	Structured string
	Pass       *bool
	NextPrompt string
}
```

## Waiter Design

### Purpose

`WaitSession()` is the mechanism that turns a long-running `opencode` session into a schedulable workflow task.

### Result Type

```go
type WaitResult struct {
	Kind      WaitKind
	SessionID string
	Reason    string
	Error     string
	RequestID string
}
```

### State Mapping

- `session.idle` -> `done`
- `session.error` -> `failed`
- `permission.asked` -> `blocked`
- `question.asked` -> `blocked`
- timeout -> `timeout`

### Waiter Rules

- subscribe by workspace path
- filter by session id
- ignore historical events before the anchor timestamp
- ignore `busy` and `retry` as non-terminal
- return on the first terminal event for this node execution window

### Notes

The waiter should live in `strategy-service`, not only in the frontend. Workflow execution must continue even when no browser page is open.

## Session Selection

### Root Session

Each workflow run creates one root session up front. That id is stored on the workflow run.

The root session is used by all `shared` nodes.

### Isolated Session

Each `isolated` node execution creates a new session in the same workspace.

This is especially useful for `review`, because review findings can be fed back into the build path without polluting the main implementation session.

## Prompt Composition

### General Structure

Each node prompt should be built from a fixed set of sections rather than raw freeform concatenation.

Suggested composition:

1. user objective
2. workflow context
3. upstream summary
4. loop feedback if present
5. node-specific instructions
6. output format contract

### Example Sections

```text
User objective:
<original prompt>

Workflow context:
You are running node <title> in a single-workspace workflow.

Upstream summary:
<summary of previous node result>

Review feedback:
<next_prompt from review, if any>

Node instructions:
<node prompt template>

Output contract:
<required shape for this node kind>
```

### Why Summaries Matter

Node-to-node handoff should use summary output by default, not the full raw transcript. Otherwise the shared session and node prompts will bloat quickly.

## Output Resolution

### Goal

After a node reaches `done`, extract only the new result created by this node run.

### Resolver Inputs

- workspace path
- session id
- node anchor
- node kind

### Resolver Outputs

- aggregated new assistant text
- relevant diff summary
- optional structured payload

### Review Node Output

Review nodes should output machine-readable JSON.

Recommended contract:

```json
{
  "pass": false,
  "summary": "Found one build error and one typing issue.",
  "issues": [
    {
      "level": "error",
      "path": "src/main.ts",
      "message": "Type mismatch in config handling."
    }
  ],
  "next_prompt": "Fix the typing issue in src/main.ts and re-run the implementation without changing the public API."
}
```

The resolver should parse this JSON and place:

- `pass`
- `summary`
- `next_prompt`

into `NodeResult`.

## Graph Semantics

The first version should keep graph semantics intentionally small.

Supported edge conditions:

- `always`
- `pass`
- `fail`

Typical workflow:

```text
plan --always--> build
build --always--> review
review --pass--> end
review --fail--> build
```

This is enough to support the main implementation loop without needing a full condition language.

## Example Execution

### User Intent

Run a workflow against workspace `a`.

Node sequence:

1. `plan`
2. `build`
3. `review`

Behavior:

- `plan` and `build` share one root session
- `review` uses an isolated session
- if review fails, feedback is routed back to `build`

### Run Timeline

#### Start Workflow

- create root session for workspace `a`
- create workflow run with `root_session_id`
- set current node to `plan`

#### Run `plan`

- build prompt from user objective and node instructions
- submit to root session
- wait for `session.idle`
- resolve node output

#### Run `build`

- use the same root session
- append build instructions after plan context
- wait for `session.idle`
- resolve node output and current diffs

#### Run `review`

- create isolated review session in the same workspace
- provide the original objective, build summary, and diff context
- require JSON output
- wait for `session.idle`
- parse structured review result

#### Review Failed

- take `review.next_prompt`
- store it as loop feedback
- transition back to `build`
- submit a new build prompt to the shared root session

#### Review Passed

- mark workflow run as `done`

## Blocked Nodes

### Why Blocking Happens

During node execution, `opencode` may request:

- permission
- structured answers

This means the node cannot complete autonomously.

### First Version Behavior

When the waiter sees:

- `permission.asked`
- `question.asked`

it marks the node run as `blocked` and stops advancing the workflow.

The workflow run also becomes `blocked`.

### Resume Behavior

After the user resolves the request, the workflow can be resumed with a `continue` action.

The simplest first version is:

- user handles the session request in the normal chat UI
- user clicks `continue workflow run`
- runner re-enters wait or advances to the next node based on the updated session state

## Timeouts And Retry

### Timeouts

Each node can set `timeout_ms`.

If a node exceeds its timeout without terminal state:

- mark node run `timeout`
- mark workflow run `failed`

### Retry

Node-level retry should exist as a configuration field, but the first version can defer automatic retry policy and only store the setting.

The `session.status = retry` event from `opencode` is not a workflow retry. It is still part of one running node execution.

## API Design

Suggested additions under `/api`:

- `GET /api/workflows`
- `POST /api/workflows`
- `PUT /api/workflows/:id`
- `GET /api/workflows/:id`
- `POST /api/workflows/:id/start`
- `GET /api/workflow-runs/:id`
- `GET /api/workflow-runs/:id/nodes`
- `POST /api/workflow-runs/:id/continue`
- `POST /api/workflow-runs/:id/abort`

### Suggested Response Shapes

Workflow list:

```json
{
  "items": [
    {
      "id": "wf_1",
      "name": "Plan Build Review",
      "workspace_path": "F:/code/a",
      "updated_at": 1775550000000
    }
  ]
}
```

Workflow run detail:

```json
{
  "run": {
    "id": "run_1",
    "workflow_id": "wf_1",
    "workspace_path": "F:/code/a",
    "root_session_id": "sess_root",
    "status": "running",
    "current_node_id": "build",
    "started_at": 1775550000000
  }
}
```

Node runs:

```json
{
  "items": [
    {
      "id": "nr_1",
      "node_id": "plan",
      "session_id": "sess_root",
      "status": "done",
      "output": "Implementation plan summary"
    },
    {
      "id": "nr_2",
      "node_id": "review",
      "session_id": "sess_review_1",
      "status": "done",
      "result": {
        "pass": false,
        "next_prompt": "Fix the type error in src/main.ts"
      }
    }
  ]
}
```

## Frontend Changes

### Workflow Types

Replace the current demo-only workflow node schema with a runtime-oriented config model.

Suggested node fields:

- `kind`
- `title`
- `agent`
- `skills`
- `session_mode`
- `prompt`
- `timeout_ms`
- `retry_limit`

### Workflow UI

Workflow canvas should continue to handle node and edge layout, but the right panel should become a true node configuration editor.

Each node editor should support:

- node type
- agent picker
- skills picker
- session mode toggle
- prompt template
- timeout
- retry count

### Workflow Run UI

Add a run panel showing:

- workflow run status
- current node
- each node run status
- session id per node
- review structured output
- blocked state and continue action

### Session Navigation

Each node run row should link to its backing session:

- shared node runs open the root session
- isolated node runs open the isolated review session

This will make workflow debugging much easier.

## Suggested Frontend File Touch Points

- [workflow types](/f:/code/opencode/packages/strategy-front/src/types/workflow.ts)
- [workflow shell](/f:/code/opencode/packages/strategy-front/src/components/workflow/workflow-shell.tsx)
- [workflow canvas](/f:/code/opencode/packages/strategy-front/src/components/workflow/workflow-canvas.tsx)
- [workflow detail page](/f:/code/opencode/packages/strategy-front/src/pages/workflow-detail.tsx)
- [workflows page](/f:/code/opencode/packages/strategy-front/src/pages/workflows.tsx)

## Suggested Backend File Touch Points

- [API router](/f:/code/opencode/packages/strategy-service/internal/web/api.go)
- new handlers near [opencode management API](/f:/code/opencode/packages/strategy-service/internal/web/opencode_api.go)
- workflow runner under a new `internal/workflow` package

## MVP Scope

The recommended first implementation should support only:

- one workspace per workflow
- `plan`, `build`, and `review` nodes
- `shared` and `isolated` session modes
- event-driven completion using `session.idle` and `session.error`
- `blocked` state using `permission.asked` and `question.asked`
- structured JSON review output
- one loop pattern: `review -> build`
- maximum review loop count of 3

This is enough to prove the architecture and provide immediate product value.

## Risks

### Session Pollution

If review is allowed to run in the shared session, the implementation session may become noisy or contradictory.

Mitigation:

- default review to `isolated`
- feed back only the structured `next_prompt`

### Infinite Review Loop

If review repeatedly fails, the workflow may cycle forever.

Mitigation:

- cap review loop count
- move run to `blocked` or `failed` after the cap

### Ambiguous Completion

If completion is not anchored to the current prompt execution window, the runner may read stale session state.

Mitigation:

- record anchor timestamp
- record last message id
- resolve output only after the anchor

### Blocked Runs Without UI Support

If blocked nodes are not surfaced clearly, runs will appear stuck.

Mitigation:

- explicit `blocked` state in run UI
- session deep-link from node run row

## Implementation Order

1. Add workflow models and store in `strategy-service`
2. Add workflow run and node run persistence
3. Add root session and isolated session helpers
4. Add `sendPrompt` integration for workflow nodes
5. Add `waitSession()` based on session events
6. Add output resolver
7. Add `plan -> build -> review` linear flow
8. Add `review -> build` loop
9. Add workflow run APIs
10. Replace demo workflow data in `strategy-front`
11. Add node configuration UI
12. Add workflow run monitoring UI

## Recommendation

The architecture should be implemented as a scheduler layered on top of existing `opencode` sessions, not as a new execution engine.

The key technical decision is:

- a node does not finish when an HTTP call returns
- a node finishes when the target session reaches a terminal event after the node prompt was submitted

Everything else in the workflow system should build on top of that rule.
