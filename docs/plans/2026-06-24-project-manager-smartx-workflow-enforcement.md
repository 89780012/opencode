# Project Manager + SmartX Workflow Enforcement Plan

**Goal:** Promote `project-manager` from a prompt-level convention into a mandatory workflow gate so SmartX sessions must restore workspace memory before sustained work and must save handoff state before final wrap-up.

**Architecture:** Keep `smartx-helper` as the human-readable orchestrator, but move enforcement into `smartx-workflow` and expose `project-manager` through verifiable MCP tools. The system should treat workspace baseline state and project memory state as two separate axes, then combine them at runtime for gating.

**Tech Stack:** Bun/TypeScript plugin hooks, Go workbench service, Gin MCP API, workspace file state under `.project-state/`

---

## Objectives

1. Preserve `.project-state/` as the durable workspace memory.
2. Make project memory restoration a hard prerequisite for sustained SmartX work.
3. Make project memory saving a hard prerequisite for final wrap-up when the session produced new progress.
4. Keep current workspace analysis / flowchart / review constraints intact.
5. Avoid relying on whether the model merely mentioned `project-manager`; enforce based on observed tool execution.

## Non-Goals

1. Do not merge project memory state into the existing workspace baseline lifecycle.
2. Do not replace `progress.md`, `feature-list.json`, or `session-log.md` with a database-only design.
3. Do not make every one-shot Q&A require project state initialization.
4. Do not weaken existing `workspace-analyzer -> flowchart -> review/debug/finalize` ordering.

## Current Problems

1. [`smartx-helper`](F:/code/opencode/packages/strategy-service/internal/asset/workspace/agents/smartx-helper.md:42) already says sustained tasks should restore context through `project-manager`, but this is only a prompt convention.
2. [`project-manager`](F:/code/opencode/packages/strategy-service/internal/asset/workspace/skills/project-manager/SKILL.md:53) defines start/end protocols, but `smartx-workflow` cannot verify they were actually executed.
3. [`smartx-workflow`](F:/code/opencode/packages/smartx-workflow/README.md:5) currently enforces only:
   - session ordering
   - workspace baseline ordering
4. Because there is no machine-verifiable `project-manager` action, the agent can skip memory restore/save and still continue implementation.

---

## Design Summary

The recommended design adds a third enforcement axis:

1. **Session ordering constraints**
2. **Workspace baseline constraints**
3. **Project memory constraints**

`smartx-helper` remains the top-level operating guide, but `smartx-workflow` becomes the hard gatekeeper. `project-manager` should expose explicit MCP tools so the plugin can verify whether project memory was restored or saved.

Recommended default flow:

```text
resume/init project state
-> initialize/refresh workspace baseline when required
-> smartx-develop
-> smartx-debug
-> save project state
-> final wrap-up
```

---

## State Model

### A. Workspace Baseline State

Keep the current `smartx-workflow` lifecycle unchanged:

- `idle`
- `booting`
- `ready`
- `dirty`
- `refreshing`
- `finalizing`

This axis answers: "Is the code snapshot analysis/flowchart state complete and current?"

### B. Project Memory State

Add a separate project memory lifecycle:

- `missing`: `.project-state/` does not exist
- `ready`: project memory was restored or initialized for the current sustained task
- `stale`: the session made meaningful progress after the last restore/save
- `saving`: handoff state is being persisted
- `invalid`: state exists but is incomplete or malformed

This axis answers: "Has the session restored project context, and has it saved its latest progress?"

### C. Combined Enforcement Rules

1. If project memory is `missing` or `invalid`:
   - allow read/search/list
   - block write/exec/develop/debug/review/finalize
2. If project memory is `ready`:
   - allow normal workspace baseline flow
3. If project memory is `stale`:
   - allow continued implementation and debugging
   - block final wrap-up until project state is saved
4. If workspace baseline is not ready:
   - keep current baseline gates unchanged

This separation keeps the system understandable:

- workspace baseline protects code understanding
- project memory protects continuity and handoff

---

## Project State Contract

### A. Files Under `.project-state/`

Keep the current human-facing files:

- `.project-state/feature-list.json`
- `.project-state/progress.md`
- `.project-state/session-log.md`

Add a machine-facing file:

- `.project-state/state.json`

### B. Recommended `state.json` Shape

```json
{
  "phase": "implementation",
  "status": "in-progress",
  "current": "Finish signal routing for strategy review gate",
  "next": [
    "Run smartx-debug verification",
    "Refresh workspace baseline before review"
  ],
  "risks": [
    "Missing runtime credential for remote debug"
  ],
  "verified": false,
  "dirty": true,
  "session_id": "ses_xxx",
  "updated_at": 1782240000000
}
```

### C. Source of Truth Rules

1. `state.json` is the machine-readable source for plugin and service checks.
2. `progress.md` is the human-readable summary.
3. `feature-list.json` tracks task status using:
   - `pending`
   - `in-progress`
   - `done`
   - `blocked`
4. `session-log.md` is append-only handoff history.

---

## MCP Tool Contract

`project-manager` should no longer be enforced by skill name alone. Add explicit MCP tools:

1. `init_project_state`
2. `resume_project_state`
3. `get_project_state`
4. `save_project_state`
5. `validate_project_state` (optional but recommended)

### A. `init_project_state`

Purpose:

- create `.project-state/`
- copy or generate template files
- initialize `state.json`

Required inputs:

- `workspacePath`
- optional `worktreePath`
- optional seed fields such as `phase`, `current`, `next`

### B. `resume_project_state`

Purpose:

- read existing `.project-state/`
- return current phase, current task, next step, risk summary
- repair missing template files when possible

Required inputs:

- `workspacePath`
- optional `worktreePath`
- optional `sessionId`

### C. `save_project_state`

Purpose:

- update `progress.md`
- update `feature-list.json`
- append `session-log.md`
- refresh `state.json`

Required inputs:

- `workspacePath`
- optional `worktreePath`
- `summary`
- `current`
- `next`
- `risks`
- `status`
- `verified`

### D. `get_project_state`

Purpose:

- read current machine/human state without mutation

### E. `validate_project_state`

Purpose:

- verify directory shape and required file completeness
- surface malformed state explicitly

---

## Service-Layer Refactor Plan

### Task 1: Add Project State Types

**Files:**
- Modify: `packages/strategy-service/internal/workbench/types.go`

Add types such as:

- `ProjectStateGet`
- `ProjectStateInitReq`
- `ProjectStateSaveReq`
- `ProjectStateRow`
- `ProjectStateResumeRow`

Suggested `ProjectStateRow` fields:

- `WorkspacePath`
- `WorktreePath`
- `Phase`
- `Status`
- `Current`
- `Next`
- `Risks`
- `Verified`
- `Dirty`
- `SessionID`
- `UpdatedAt`

### Task 2: Implement File-Based Project State Service

**Files:**
- Modify: `packages/strategy-service/internal/workbench/service.go`

Add service methods:

1. `InitProjectState`
2. `ResumeProjectState`
3. `GetProjectState`
4. `SaveProjectState`
5. `ValidateProjectState`

Responsibilities:

1. Resolve `.project-state/` from workspace root.
2. Create missing files from templates when allowed.
3. Read/write `state.json`.
4. Keep markdown/json files in sync.
5. Avoid destructive overwrite of existing human content.

Implementation notes:

1. Reuse existing template files under `project-manager/templates`.
2. Centralize path resolution helpers instead of scattering file rules.
3. Keep write behavior idempotent where possible.

### Task 3: Expose MCP Operations

**Files:**
- Modify: `packages/strategy-service/internal/web/mcp_api.go`
- Modify: `packages/strategy-service/internal/web/workbench_api.go` if HTTP endpoints are also desired

Add MCP registrations for:

- `init_project_state`
- `resume_project_state`
- `get_project_state`
- `save_project_state`
- `validate_project_state`

Update MCP instructions to mention project memory enforcement alongside:

- `save_analysis`
- `save_flowchart`
- `save_review`
- `refresh_workspace`

### Task 4: Optional Persistence Mirror

Do not make the database the source of truth for project memory in phase one. If later search/history needs arise, add a mirror table after the file protocol is stable.

---

## Plugin Refactor Plan

### Task 5: Extend SmartX Workflow README

**Files:**
- Modify: `packages/smartx-workflow/README.md`

Update the document from two constraints to three:

1. session ordering constraints
2. workspace baseline constraints
3. project memory constraints

Document:

- when restore is required
- when save is required
- which tool names satisfy the gate

### Task 6: Add Project Memory State To Plugin Logic

**Files:**
- Modify: `packages/smartx-workflow/src/state.ts`
- Modify: `packages/smartx-workflow/src/workspace.ts`

Add:

1. project memory state types
2. prompt helpers:
   - `noteResumeProject()`
   - `noteSaveProject()`
3. view composition that combines:
   - workspace baseline state
   - project memory state

### Task 7: Recognize New Tool Kinds

**Files:**
- Modify: `packages/smartx-workflow/src/workspace.ts`

Extend `kind()` to classify:

- `init_project_state`
- `resume_project_state`
- `get_project_state`
- `save_project_state`
- `validate_project_state`

This must work the same way existing logic recognizes:

- `refresh_workspace`
- `save_analysis`
- `save_flowchart`
- `save_review`

### Task 8: Add Hard Gates

**Files:**
- Modify: `packages/smartx-workflow/src/workspace.ts`

Extend `gate()` with project memory checks:

1. **Before restore/init**
   - allow: read/search/list
   - block: write/exec/review/debug/finalize
2. **After successful write/exec**
   - mark project memory `stale`
3. **Before final summary / close**
   - if memory is `stale`, inject save-project reminder and block exit path until saved

Recommended behavior:

- do not block continued coding just because state is `stale`
- only require save before final wrap-up

### Task 9: Update System Prompt Injection

**Files:**
- Modify: `packages/smartx-workflow/src/state.ts`
- Modify: `packages/smartx-workflow/src/workspace.ts`

Add prompt text that tells the model exactly what to do next:

1. call `resume_project_state` or `init_project_state`
2. continue workspace baseline flow
3. call `save_project_state` before final wrap-up if progress exists

These prompts should be as concrete as the existing:

- `noteBoot()`
- `noteRefresh()`
- `noteFinal()`
- `noteClose()`

### Task 10: Preserve Existing Ordering Constraints

Do not regress current rules for:

- `smartx_start -> smartx_logs`
- `smartx-develop -> smartx-debug`
- `workspace-analyzer -> save_analysis -> flowchart -> save_flowchart`
- review save-first flow

Project memory must be added as an additional gate, not a replacement.

---

## Agent And Skill Documentation Changes

### Task 11: Update `smartx-helper`

**Files:**
- Modify: `packages/strategy-service/internal/asset/workspace/agents/smartx-helper.md`

Revise the current guidance so it clearly states:

1. sustained project work must begin with project memory restore/init
2. implementation is not complete until handoff state is saved when new progress exists

Recommended default flow text:

```text
project-manager (resume/init)
-> workspace baseline bootstrap/refresh when required
-> smartx-develop
-> smartx-debug
-> project-manager (save)
```

### Task 12: Update `project-manager` Skill

**Files:**
- Modify: `packages/strategy-service/internal/asset/workspace/skills/project-manager/SKILL.md`

Refactor the skill from a descriptive convention into a tool-backed protocol:

1. start protocol must call `resume_project_state` or `init_project_state`
2. end protocol must call `save_project_state`
3. validation may call `validate_project_state`

Keep the skill as the human-readable contract, but anchor every mandatory step to explicit MCP tool names.

---

## Test Plan

### Task 13: Workbench Service Tests

**Files:**
- Modify: `packages/strategy-service/internal/workbench/service_test.go`
- Modify: `packages/strategy-service/internal/web/mcp_api_test.go`

Add coverage for:

1. `init_project_state` creates all required files
2. `resume_project_state` reads and summarizes existing state
3. missing template files are repaired without overwriting existing content
4. malformed `state.json` returns a clear error or `invalid` state
5. `save_project_state` updates all four files coherently

### Task 14: SmartX Workflow Tests

**Files:**
- Modify: `packages/smartx-workflow/test/analysis.test.ts`

Add coverage for:

1. write blocked when project memory is `missing`
2. review/debug blocked when project memory is `missing`
3. restore/init clears the project-memory gate
4. successful write marks project memory `stale`
5. final wrap-up with `stale` memory injects save-project instructions
6. successful `save_project_state` returns memory to `ready`

### Task 15: Validation Commands

Run after implementation:

From `packages/smartx-workflow`:

```bash
bun typecheck
bun test
bun run build
```

From `packages/strategy-service`:

```bash
go test ./...
```

Do not run tests from repo root.

---

## Rollout Plan

### Phase 1: Contract First

1. Define `state.json`
2. Add workbench types
3. Add MCP tool schemas
4. Update skill docs

### Phase 2: Service Implementation

1. Implement init/resume/get/save/validate in `strategy-service`
2. Verify file behavior with tests

### Phase 3: Soft Plugin Integration

1. Add project memory awareness to `smartx-workflow`
2. Inject reminders first
3. Confirm the model follows the new prompts

### Phase 4: Hard Enforcement

1. Turn restore into a hard precondition for sustained work
2. Turn save into a hard precondition for final wrap-up
3. Expand regression coverage

This rollout reduces risk by ensuring the tool layer exists before the plugin starts enforcing against it.

---

## Acceptance Criteria

1. A sustained SmartX implementation session cannot write code before project memory has been restored or initialized.
2. A session that already restored project memory can still enter the current workspace baseline flow and continue normal work.
3. Any successful write/exec that advances the task marks project memory stale.
4. If the user asks for final summary or wrap-up while project memory is stale, the workflow requires `save_project_state` before allowing completion.
5. After save succeeds, final wrap-up is allowed.
6. `.project-state/state.json`, `progress.md`, `feature-list.json`, and `session-log.md` remain coherent.
7. Existing SmartX review/debug/baseline ordering still passes unchanged except for the added restore/save gates.

---

## Open Decisions

1. Should `resume_project_state` auto-initialize when `.project-state/` is missing, or should `init_project_state` remain explicit?
   - Recommendation: keep them explicit in phase one for clearer plugin behavior.
2. Should simple one-shot analysis-only tasks bypass project memory enforcement?
   - Recommendation: yes, when the task is clearly read-only and does not start a sustained workflow.
3. Should project memory eventually be mirrored into the database for UI inspection?
   - Recommendation: postpone until file protocol and plugin behavior are stable.

## Recommended Next Implementation Order

1. `project-manager` file contract and `state.json`
2. workbench service methods
3. MCP tool registration
4. `smartx-workflow` state and gate changes
5. `smartx-helper` prompt updates
6. tests and rollout verification
