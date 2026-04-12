# Workflow Session Agent/Model Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make workflow-session behavior semantically correct: workflow chat should be driven by workflow nodes for `agent`, while `model` remains a workspace-level default that comes from creation-time binding and can be changed later for future workflow runs.

**Architecture:** Treat workflow chat as a thin trigger surface over a bound workflow. The chat page should only collect user input plus workspace-level runtime defaults. Execution-specific `agent` stays on workflow nodes and is sent by the workflow service when dispatching each node prompt. Workspace binding becomes the single source of truth for workflow default model/variant, with clear UI copy and backward-compatible persistence cleanup.

**Tech Stack:** React, TypeScript, Go, Gin, local JSON store

---

### Task 1: Freeze The Product Semantics

**Files:**
- Modify: `packages/strategy-front/src/pages/strategy-workflow-chat.tsx`
- Modify: `packages/strategy-front/src/components/strategy/strategy-workflow-panel.tsx`
- Modify: `packages/strategy-front/src/types/workspace-chat.ts`
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/web/workspace_chat_api.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`

**Step 1: Define the two runtime concepts explicitly**

Document and align code comments / names around:

- `workflow node agent`: chosen in workflow editor, effective per node
- `workspace default model`: chosen when binding a workflow to a workspace, effective only when a node has no model override
- `workspace default variant`: same scope as workspace default model

Do not introduce a workflow-session-level `agent` field unless product explicitly wants “single-agent workflow mode”.

**Step 2: Confirm the intended user-facing rules**

Rules to enforce:

- Workflow chat input never chooses the executor agent directly.
- Workflow node `agent` always wins because it is the only agent value actually sent by the workflow engine.
- Workflow chat model selector edits the workspace default model for subsequent workflow runs.
- Node-level model override still wins over workspace default model.

**Step 3: Write the acceptance criteria**

Acceptance criteria:

- Opening workflow chat never suggests the user can switch agent for the current run.
- Changing the workflow chat model changes the next run’s fallback model.
- The default model shown in workflow chat is the one stored when the workflow was bound during creation, not an unrelated local composer fallback.
- A node configured with its own model override ignores the workspace default model.

### Task 2: Remove The Misleading Agent Selector From Workflow Chat

**Files:**
- Modify: `packages/strategy-front/src/pages/strategy-workflow-chat.tsx`
- Modify: `packages/strategy-front/src/components/strategy/strategy-workflow-panel.tsx`
- Modify: `packages/strategy-front/src/components/chat/prompt-bar.tsx`

**Step 1: Stop passing a fake workflow-chat agent**

Remove the current workflow-page logic that derives a page-level agent like:

- prefer `plan`
- else fall back to composer-selected agent

That value is not part of workflow dispatch and currently only feeds the input bar.

**Step 2: Hide or replace the agent selector in workflow mode**

Preferred implementation:

- Make `PromptBar` support `showAgent?: boolean`
- In workflow chat, set `showAgent={false}`
- Replace the empty space with a read-only hint such as `Agent: workflow-controlled`

Alternative if reuse is harder:

- Create a small workflow-only wrapper around `PromptBar`
- Omit agent UI entirely there

**Step 3: Add clarity text near the model selector**

Add lightweight help text:

- “This model is the workflow default.”
- “Node model overrides still take precedence.”
- “Agent comes from workflow nodes.”

### Task 3: Make Workflow Editor The Only Place To Configure Execution Agent

**Files:**
- Modify: `packages/strategy-front/src/components/workflow/workflow-node-panel.tsx`
- Modify: `packages/strategy-front/src/lib/workflow-runtime.ts`
- Modify: `packages/strategy-front/src/types/workflow.ts`
- Optional: `packages/strategy-front/src/components/workflow/workflow-sidepanel.tsx`

**Step 1: Preserve node-level agent editing**

Keep node `agent` editing in the workflow editor. This is the real effective configuration and is already persisted into runtime nodes.

**Step 2: Improve labeling**

Rename labels/copy where needed so the user sees:

- `Node Agent`
- `Node Model Override`
- `Node Variant Override`

Avoid generic labels that look like chat-level controls.

**Step 3: Surface override summary**

Add a small summary in the workflow inspector or sidepanel:

- workflow uses node agents
- workflow uses workspace default model unless node override exists
- count of nodes with model overrides

This turns the mental model into visible UI instead of hidden implementation detail.

### Task 4: Make Workspace Binding The Single Source Of Truth For Workflow Default Model

**Files:**
- Modify: `packages/strategy-front/src/components/workspace/workspace-create-dialog.tsx`
- Modify: `packages/strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- Modify: `packages/strategy-front/src/pages/strategy-workflow-chat.tsx`
- Modify: `packages/strategy-front/src/components/project/project-composer-provider.tsx`
- Modify: `packages/strategy-front/src/lib/chat-composer.ts`

**Step 1: Keep creation-time model binding**

Retain the existing behavior where workflow creation binds:

- `workflow_id`
- selected default `model`
- selected default `variant`

This is correct and should remain the workflow-session default source.

**Step 2: Stop silently backfilling workflow chat from composer state**

Remove or sharply constrain the current page effect that calls `chat.setModel(composer.model)` when workflow chat has no model.

Recommended rule:

- If workspace binding already exists, display only the bound model from workspace state.
- Do not auto-write composer state into workflow binding during page load.

Optional recovery path:

- Only backfill once when migrating legacy records that have `workflow_id` but no stored default model, and only after explicit user action like “Use current model as workflow default”.

**Step 3: Decide whether to seed path-scoped composer state after creation**

Optional but useful:

- After successful workflow creation, also write the selected model/variant into the path-scoped composer bucket

Reason:

- Prevent unrelated UI from showing a different model if some shared component still reads composer state

This is secondary. The primary fix is to stop using composer state as the workflow default source.

### Task 5: Clean Up Backend Naming And Contract

**Files:**
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/web/workspace_chat_api.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-front/src/types/workspace-chat.ts`
- Modify: `packages/strategy-front/src/api/modules/workspace-chat.ts`

**Step 1: Rename workspace binding fields for clarity**

Preferred rename:

- `model_provider_id` -> `default_model_provider_id`
- `model_id` -> `default_model_id`
- `variant` -> `default_variant`

Why:

- Current names look like per-run or per-message fields
- These values are actually workspace-bound workflow defaults

**Step 2: Keep backward compatibility**

Migration strategy:

- Read old persisted JSON fields if present
- Normalize them into the new names when loading
- Write only the new names after first successful save

If changing on-disk JSON is too large for one pass, first add new JSON tags or compatibility mapping, then do the UI cleanup, then a follow-up storage migration.

**Step 3: Keep `Run` semantics separate**

`Run` can continue to store resolved model/variant actually used as workflow fallback for that run.

Do not add `Run.Agent` unless product introduces a genuine run-level agent override concept.

### Task 6: Add Explicit Runtime Introspection

**Files:**
- Modify: `packages/strategy-service/internal/workflow/model.go`
- Modify: `packages/strategy-service/internal/workflow/service.go`
- Modify: `packages/strategy-front/src/types/workflow.ts`
- Modify: `packages/strategy-front/src/components/strategy/strategy-workflow-panel.tsx`

**Step 1: Return enough data for the UI to explain behavior**

Add one of the following:

- `workspace default model` on workspace snapshot using explicit names
- `effective_agent` and `effective_model` on current node run
- or a lightweight run summary endpoint that resolves those values

**Step 2: Show “what is running” in the workflow chat UI**

Recommended read-only chips:

- current node title
- current node agent
- current model source: `workspace default` or `node override`

This reduces future confusion without adding new controls.

### Task 7: Preserve Multi-Agent Workflow Capability

**Files:**
- Modify: `packages/strategy-service/internal/workflow/service_test.go`
- Modify: `packages/strategy-service/internal/workflow/validate_test.go`
- Optional: add new tests under `packages/strategy-front/src`

**Step 1: Add backend tests that prove node agent is real**

Add tests for:

- workflow body uses `node.Agent`
- switching nodes with different agents still sends the correct agent per node
- reusing the same session does not erase node-specific agent dispatch

**Step 2: Add backend tests that prove model fallback rules**

Add tests for:

- workspace-bound default model is copied into run fallback
- node model override wins over run fallback
- variant follows the same precedence

**Step 3: Add storage compatibility tests**

Add tests for:

- legacy workspace state with old model fields still loads
- save path rewrites or preserves data as intended

### Task 8: Frontend Regression Coverage

**Files:**
- Add/Modify: frontend test files near `packages/strategy-front/src/components/strategy`
- Add/Modify: frontend test files near `packages/strategy-front/src/hooks`

**Step 1: Add UI regression tests**

Cover:

- workflow chat does not render an editable agent selector
- workflow chat renders editable model selector
- changing model triggers workspace bind update

**Step 2: Add state-source tests**

Cover:

- workflow page uses workspace-bound default model when present
- composer local state does not overwrite workflow-bound model on page load

### Task 9: Migration Rollout

**Files:**
- Modify: `packages/strategy-service/internal/workflow/store.go`
- Modify: `packages/strategy-service/README.md`
- Optional: add a short internal note under `docs/`

**Step 1: Decide migration depth**

Option A, safer:

- keep wire format mostly stable
- clean UI semantics first
- add compatibility aliases internally

Option B, cleaner:

- rename API and storage fields in one pass
- include compatibility read path for old data

Recommendation:

- Use Option A first if this feature is already in active use
- Use Option B only if workflow chat data volume is still small

**Step 2: Document operator impact**

Document:

- old workflow sessions keep working
- default model semantics are preserved
- no migration needed for node agents because they already live on workflow nodes

### Task 10: Verification Checklist

**Files:**
- Test: `packages/strategy-service/internal/workflow/service_test.go`
- Test: `packages/strategy-service/internal/workflow/validate_test.go`
- Test: frontend workflow-chat related tests

**Step 1: Manual verification**

1. Create a workflow strategy with model A.
2. Open workflow chat and confirm the displayed default model is model A.
3. Confirm there is no editable agent selector in workflow chat.
4. Run the workflow and verify node agent comes from workflow node config.
5. Change workflow chat model to model B.
6. Start another run and verify nodes without overrides now use model B.
7. Add a node-level model override and verify that node ignores model B.

**Step 2: Backend verification**

Run from `packages/strategy-service`:

```bash
bun typecheck
go test ./internal/workflow/...
```

Expected:

- all workflow tests pass
- new fallback/compatibility tests pass

**Step 3: Frontend verification**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

If frontend tests exist in the package, run the relevant test target as well.

## Notes For Implementation

- Current workflow editor agent selection is meaningful and should be retained.
- Current workflow chat agent selection is misleading and should be removed or made read-only.
- Current workflow creation already persists the selected model into workflow binding, which is the right foundation.
- The main behavioral bug is semantic drift between workflow binding state and generic composer state.
