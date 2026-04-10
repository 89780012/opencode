# Strategy Single Chat Workflow Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep a single strategy chat window for the user, use the first turn for planning and confirmation, then force all later execution through a persisted workflow loop that can resume after refresh, interruption, or later re-entry.

**Architecture:** Treat the strategy detail page as the only user-facing surface and add a backend workspace orchestration state machine behind it. Planning stays on the visible chat session, workflow execution runs through `strategy-service`, and the frontend merges workflow run progress into the same chat pane so the user never has to open the workflow editor.

**Tech Stack:** React 19 + Redux Toolkit in `strategy-front`, Go + Gin in `strategy-service`, existing opencode session API, existing workflow runtime and run persistence.

---

## Requirements Summary

### Functional requirements

- The user only sees one chat window in the strategy workspace page.
- The first exchange uses `plan` behavior and asks for confirmation before execution.
- After confirmation, execution must follow workflow edges instead of free-form prompt behavior.
- The execution loop must support `build -> review -> build -> review -> end`.
- Refreshing the page or returning later must recover the current planning or workflow state.
- If the user sends another message after planning has been approved, the system must continue along workflow rules instead of falling back to normal chat.

### Non-functional requirements

- The UI must stay friendly and must not force users into `/app/workflows`.
- Workflow state must be persisted on the backend, not only in frontend memory.
- The implementation should minimize changes to the current chat UI where possible.
- The design should avoid leaking raw checker JSON into the user-visible conversation.

## Architecture Decisions

### Decision 1: Keep one visible chat session, but do not force every workflow node into that session

- Planning uses the visible session directly.
- Build nodes can reuse the visible session when helpful.
- Review nodes should stay internal or isolated so raw pass/fail JSON does not pollute the user conversation.
- The frontend should render workflow node progress as synthetic timeline cards inside the same chat pane.

Why:

- This keeps the customer experience clean.
- It avoids coupling the checker output contract to the visible assistant transcript.

### Decision 2: Persist workspace orchestration state separately from workflow runs

Add a new workspace-scoped orchestration record with fields like:

- `workspace_path`
- `phase`
- `session_id`
- `workflow_id`
- `run_id`
- `plan_message_id`
- `plan_summary`
- `updated_at`

Recommended phases:

- `planning`
- `awaiting_confirm`
- `running`
- `blocked`
- `done`

Why:

- The current frontend store is in-memory only.
- Workflow runs already persist, but they do not answer "what should the strategy chat page do next for this workspace?"

### Decision 3: Route all later input through an orchestrator API instead of direct `chatApi.sendPrompt(...)`

- The strategy page should stop deciding locally whether to use chat or workflow.
- The backend should become the source of truth for routing:
  - first prompt -> planning chat
  - confirm -> workflow start
  - later prompt while workflow is active -> workflow-aware resume/revise path

Why:

- This is the only reliable way to support interruption and resume.
- It prevents the frontend from accidentally bypassing the workflow contract.

## High-Level Flow

### First entry

1. Load workspace orchestration state.
2. If no state exists, create or discover a visible session for this workspace.
3. Route the first user message to that session with `agent=plan`.
4. When planning completes, move workspace state to `awaiting_confirm`.

### Confirm and execute

1. User clicks confirm or sends an execution intent.
2. Backend starts the bound workflow for this workspace.
3. Workflow run id is persisted into workspace orchestration state.
4. Workspace state moves to `running`.

### Re-entry or refresh

1. Strategy page reloads workspace orchestration state.
2. If phase is `planning` or `awaiting_confirm`, reload the visible chat session.
3. If phase is `running` or `blocked`, reload the latest workflow run and node runs.
4. Render workflow progress inside the same chat timeline.

### Later user message

1. If phase is `planning`, keep using the plan chat path.
2. If phase is `awaiting_confirm`, treat the message as either plan refinement or execution confirmation.
3. If phase is `running` or `blocked`, do not call raw `prompt_async`; send the message through the orchestrator so it resumes or revises the workflow.

## Task Plan

### Task 1: Add backend workspace orchestration state

**Files:**
- Create: `packages/strategy-service/internal/workflow/workspace_state.go`
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/workflow/store.go`
- Test: `packages/strategy-service/internal/workflow/service_test.go`

**Step 1: Define the persisted state model**

Add a new backend model for the chat/workflow handoff state. Keep it in the workflow package so run data and orchestration data stay together.

Suggested fields:

- `workspace_path`
- `phase`
- `session_id`
- `workflow_id`
- `run_id`
- `plan_message_id`
- `plan_summary`
- `updated_at`

**Step 2: Add store load/save helpers**

Persist this data in a new file:

- `~/.strategy-service/workflow-workspace-states.json`

Follow the same pattern already used for:

- `workflows.json`
- `workflow-runs.json`
- `workflow-node-runs.json`

**Step 3: Add service helpers**

Add methods on `workflow.Service` such as:

- `WorkspaceState(workspacePath string)`
- `PutWorkspaceState(state WorkspaceState)`
- `FindActiveRun(workspacePath string)`

**Step 4: Add backend tests**

Run from `packages/strategy-service`:

```bash
go test ./internal/workflow/...
```

Expected:

- PASS
- New tests prove workspace state persists and can be recovered

### Task 2: Extend workflow start/resume semantics for strategy chat handoff

**Files:**
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-service/internal/web/workflow_api.go`
- Modify: `packages/strategy-service/internal/workflow/validate.go`
- Test: `packages/strategy-service/internal/workflow/service_test.go`

**Step 1: Extend workflow start input**

Add optional fields to start input:

- `root_session_id`
- `workspace_path`
- `source`

`root_session_id` lets the workflow reuse the visible planning session when a node is configured as `shared`.

**Step 2: Initialize run state from start input**

When workflow start receives a `root_session_id`, set:

- `run.RootSessionID = root_session_id`

This keeps build nodes eligible to reuse the visible chat session.

**Step 3: Add a workspace-scoped run lookup**

Support a service method that can answer:

- what is the latest active run for this workspace?

This is needed so the strategy page can restore the correct run without knowing it ahead of time.

**Step 4: Add tests for start with root session reuse**

Run from `packages/strategy-service`:

```bash
go test ./internal/workflow/...
```

Expected:

- PASS
- Tests show `root_session_id` is preserved on the run

### Task 3: Add orchestrator HTTP endpoints for the strategy page

**Files:**
- Create: `packages/strategy-service/internal/web/workspace_chat_api.go`
- Modify: `packages/strategy-service/internal/web/api.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Test: `packages/strategy-service/internal/workflow/service_test.go`

**Step 1: Add read endpoint**

Add an endpoint like:

- `GET /api/workspace/chat-state?workspace_path=...`

Response should include:

- workspace orchestration state
- latest active run summary if present
- latest workflow id if bound

**Step 2: Add planning send endpoint**

Add an endpoint like:

- `POST /api/workspace/chat-state/message`

Behavior:

- if phase is empty or `planning`, send the message to the visible session with `agent=plan`
- if no session exists yet, create one first

**Step 3: Add confirm endpoint**

Add an endpoint like:

- `POST /api/workspace/chat-state/confirm`

Behavior:

- validate that a workflow exists for the workspace
- start a workflow run bound to the current workspace state
- persist `run_id`, `workflow_id`, and `phase=running`

**Step 4: Add resume or revise endpoint**

Add an endpoint like:

- `POST /api/workspace/chat-state/resume`

Behavior:

- if run is blocked, continue it
- if run is done, start the next run from the same workflow
- if a user message is provided while active, attach it as workflow feedback and re-enter the build path

For V1, support blocked resume and completed rerun first. Mid-run revision can stay a follow-up if needed.

**Step 5: Verify API registration**

Run from `packages/strategy-service`:

```bash
go test ./...
```

Expected:

- PASS
- New endpoints are reachable in route registration

### Task 4: Add a dedicated frontend orchestration slice

**Files:**
- Create: `packages/strategy-front/src/types/workspace-chat.ts`
- Create: `packages/strategy-front/src/store/workspace-chat-slice.ts`
- Create: `packages/strategy-front/src/store/workspace-chat-selectors.ts`
- Modify: `packages/strategy-front/src/store/index.ts`
- Modify: `packages/strategy-front/src/api/modules/index.ts`
- Create: `packages/strategy-front/src/api/modules/workspace-chat.ts`
- Test: type coverage via `bun typecheck`

**Step 1: Add frontend types**

Define frontend models for:

- workspace chat phase
- orchestration state
- lightweight workflow run summary
- timeline item type for merged rendering

**Step 2: Add Redux slice**

Keep orchestration state separate from the existing chat session slice. Do not overload `chatSession` with workflow-specific phase data.

Suggested slice fields:

- `byWorkspace`
- `loading`
- `error`
- `runRows`

**Step 3: Add API module**

Wrap the new backend endpoints in:

- `workspaceChatApi.getState(...)`
- `workspaceChatApi.send(...)`
- `workspaceChatApi.confirm(...)`
- `workspaceChatApi.resume(...)`

**Step 4: Verify typecheck**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

Expected:

- PASS

### Task 5: Add a strategy workspace orchestrator hook

**Files:**
- Create: `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- Modify: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Modify: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- Modify: `packages/strategy-front/src/hooks/use-prompt-submit.ts`
- Test: type coverage via `bun typecheck`

**Step 1: Create a single workspace orchestration hook**

The new hook should become the source of truth for the strategy page. It should:

- load orchestration state
- expose the visible session id
- expose active workflow run state
- decide whether submit means `plan`, `confirm`, `resume`, or `rerun`

**Step 2: Replace direct prompt routing in the strategy page**

Today the page uses:

- `useStrategySession(...)`
- `usePromptSubmit(...)`

Change the page so the input bar no longer calls raw chat submission when the workspace is in workflow mode.

**Step 3: Keep the existing chat UI shell**

Do not replace `StrategyChatPanel`. Instead, feed it richer data from the new hook so the page keeps one familiar UI.

**Step 4: Verify typecheck**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

Expected:

- PASS

### Task 6: Merge workflow progress into the chat timeline

**Files:**
- Modify: `packages/strategy-front/src/components/chat-message-list.tsx`
- Create: `packages/strategy-front/src/components/chat/workflow-run-card.tsx`
- Create: `packages/strategy-front/src/lib/workspace-chat-timeline.ts`
- Modify: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- Modify: `packages/strategy-front/src/types/workspace-chat.ts`
- Test: `bun typecheck`

**Step 1: Define a merged timeline model**

Combine:

- visible chat session messages
- workflow node run events
- blocked state banners
- confirm CTA state

into one list for rendering.

**Step 2: Add workflow timeline cards**

Render compact cards for:

- `planning complete, waiting for confirmation`
- `workflow running`
- `current node`
- `review failed, returning to build`
- `workflow blocked`
- `workflow completed`

**Step 3: Keep raw checker JSON out of the main transcript**

Display review summaries and issues from `WorkflowNodeRun.result`, not raw checker JSON.

**Step 4: Verify typecheck**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

Expected:

- PASS

### Task 7: Bind default workflow behavior to strategy workspaces

**Files:**
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-front/src/types/workflow.ts`
- Modify: `packages/strategy-front/src/lib/workflow-runtime.ts`
- Possibly modify: `packages/strategy-service/internal/asset/workspace/agents/strategy.md`
- Test: `go test ./internal/workflow/...`

**Step 1: Pick the default workflow contract**

For V1, define or require a workflow with:

- `start`
- `build`
- `review`
- `end`

Edges:

- `start -> build`
- `build -> review`
- `review(pass) -> end`
- `review(fail) -> build`

**Step 2: Set node session expectations**

Recommended V1:

- `build`: `shared`
- `review`: `isolated`

This gives one friendly visible chat while preserving strict checker behavior.

**Step 3: Decide workflow binding rules**

Recommended rule:

- each workspace can bind one preferred `workflow_id`
- if absent, show a clear error on confirm
- do not silently invent a workflow in the backend

### Task 8: Support interruption and resume behavior explicitly

**Files:**
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-service/internal/web/workspace_chat_api.go`
- Modify: `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- Modify: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- Test: `go test ./internal/workflow/...` and `bun typecheck`

**Step 1: Define interruption semantics**

V1 semantics should be explicit:

- if a run is `blocked`, user input triggers `resume`
- if a run is `running`, disable free-form submit and offer `stop and revise` later
- if a run is `done`, user input starts a new workflow run using the same bound workflow

This is enough to satisfy "re-enter and keep following workflow" without building full mid-node revision support.

**Step 2: Persist recovery state**

Whenever run status changes, update workspace orchestration state:

- `running`
- `blocked`
- `done`

This ensures page refresh recovery is deterministic.

**Step 3: Expose resume CTA in the chat panel**

Show a visible action in the same pane when the run is blocked or ready for the next execution pass.

### Task 9: Add end-to-end verification passes

**Files:**
- Test existing backend files in `packages/strategy-service/internal/workflow/...`
- Verify frontend compilation in `packages/strategy-front`

**Step 1: Backend workflow tests**

Run from `packages/strategy-service`:

```bash
go test ./internal/workflow/...
go test ./internal/web/...
```

Expected:

- PASS

**Step 2: Frontend typecheck**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

Expected:

- PASS

**Step 3: Frontend build smoke test**

Run from `packages/strategy-front`:

```bash
bun run build
```

Expected:

- PASS

**Step 4: Service build smoke test**

Run from `packages/strategy-service`:

```bash
go test ./...
```

Expected:

- PASS

## Delivery Order

### Milestone 1: Single-page orchestration skeleton

- Task 1
- Task 2
- Task 3
- Task 4

Outcome:

- backend knows workspace phase
- frontend can load one workspace orchestration record

### Milestone 2: Real strategy page handoff

- Task 5
- Task 6

Outcome:

- first turn plans
- confirm starts workflow
- same page shows workflow progress

### Milestone 3: Reliable resume behavior

- Task 7
- Task 8
- Task 9

Outcome:

- users can leave and come back
- later messages keep following workflow rules

## Risks And Mitigations

### Risk 1: Visible chat and workflow status drift apart

Mitigation:

- make backend workspace orchestration state the only routing source
- do not let the frontend infer phase from local message count

### Risk 2: Review output leaks raw JSON into the user chat

Mitigation:

- keep review nodes isolated in V1
- render structured review summaries as timeline cards

### Risk 3: Users expect mid-run free-form interruption

Mitigation:

- ship V1 with explicit rules for `blocked`, `running`, and `done`
- add `stop and revise` only after resume behavior is stable

### Risk 4: Workflow binding is ambiguous per workspace

Mitigation:

- require an explicit `workflow_id` binding before confirm
- expose clear empty-state copy when a strategy has no bound workflow

## File Checklist

### Backend

- `packages/strategy-service/internal/workflow/model.go`
- `packages/strategy-service/internal/workflow/store.go`
- `packages/strategy-service/internal/workflow/service.go`
- `packages/strategy-service/internal/workflow/validate.go`
- `packages/strategy-service/internal/workflow/workspace_state.go`
- `packages/strategy-service/internal/web/api.go`
- `packages/strategy-service/internal/web/workspace_chat_api.go`
- `packages/strategy-service/internal/web/workflow_api.go`

### Frontend

- `packages/strategy-front/src/types/workspace-chat.ts`
- `packages/strategy-front/src/api/modules/workspace-chat.ts`
- `packages/strategy-front/src/api/modules/index.ts`
- `packages/strategy-front/src/store/workspace-chat-slice.ts`
- `packages/strategy-front/src/store/workspace-chat-selectors.ts`
- `packages/strategy-front/src/store/index.ts`
- `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- `packages/strategy-front/src/pages/strategy-detail.tsx`
- `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- `packages/strategy-front/src/components/chat-message-list.tsx`
- `packages/strategy-front/src/components/chat/workflow-run-card.tsx`
- `packages/strategy-front/src/lib/workspace-chat-timeline.ts`

## Out Of Scope For V1

- full workflow canvas embedding inside the strategy page
- arbitrary user editing of workflow nodes from the chat page
- true mid-node human interruption with patch-and-replay
- projecting every hidden workflow session message into the main transcript
- replacing `/app/workflows` as the advanced editor

## Final Recommendation

Do not try to solve this by making the prompt "more strict".

The right implementation is:

- one visible strategy chat page
- one backend workspace orchestration record
- first turn routed to `plan`
- confirmed execution routed to workflow
- workflow progress rendered back into the same chat timeline
- later re-entry driven by persisted `phase`, `workflow_id`, and `run_id`

This gives you the customer-friendly single window you want and the hard workflow constraint you actually need.
