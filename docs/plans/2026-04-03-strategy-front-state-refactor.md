# Strategy Front State Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce state sprawl in `packages/strategy-front` by clarifying ownership boundaries, removing repeated page orchestration logic, and converting the heaviest local state machines into explicit reducers/hooks.

**Architecture:** Keep existing user-visible behavior stable while refactoring in four PRs. First extract repeated business orchestration from pages into dedicated hooks, then convert the workspace editor into a reducer-driven state machine, then unify chat async process state inside Redux, and finally simplify the global resource cache/provider.

**Tech Stack:** React, TypeScript, Redux Toolkit, existing app hooks/providers, Bun typecheck, Vite frontend package structure.

---

## Constraints And Ground Rules

- Work only inside `packages/strategy-front` unless a shared type/helper must move.
- Preserve current routes, API contracts, and visible UX unless a bug is discovered.
- Follow repo conventions from `AGENTS.md`:
  - Prefer single-word local names where clear.
  - Avoid `any`.
  - Keep helpers small and colocated unless reused.
  - Run checks from package directories, never from repo root.
- Prefer behavior-preserving refactors before structural changes.
- Each PR must be independently shippable.

## Baseline Validation Before Any PR

### Task 0: Capture Current Baseline

**Files:**
- Read: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Read: `packages/strategy-front/src/pages/strategy-multi.tsx`
- Read: `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`
- Read: `packages/strategy-front/src/data/global-data-provider.tsx`
- Read: `packages/strategy-front/src/store/chat-session-slice.ts`

**Step 1: Run package typecheck before changes**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

Expected: typecheck passes, or existing failures are recorded before refactor work starts.

**Step 2: Do a manual baseline smoke check**

Verify these flows in the running app:

1. Strategy list page opens and can navigate to detail.
2. Strategy detail page loads workspace and session list.
3. Creating a new chat session works.
4. Session switching works.
5. Multi-strategy page opens with 2-3 strategies.
6. Workspace editor can open a file, edit it, and save it.

**Step 3: Record any pre-existing issues**

Write down failures before refactoring so they are not mistaken as regressions later.

---

## PR1: Extract Strategy Page Orchestration

### Goal

Remove repeated `agent/model/variant/session` orchestration from pages and centralize it in dedicated hooks so page components become layout-driven instead of business-flow-driven.

### Task 1: Add `useStrategyComposer`

**Files:**
- Create: `packages/strategy-front/src/hooks/use-strategy-composer.ts`
- Read: `packages/strategy-front/src/hooks/use-project-composer.ts`
- Read: `packages/strategy-front/src/data/global-data-provider.tsx`
- Read: `packages/strategy-front/src/lib/chat-composer.ts`
- Read: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Read: `packages/strategy-front/src/pages/strategy-multi.tsx`

**Step 1: Define hook API**

Create a hook that accepts either:

```ts
useStrategyComposer(scope: string | undefined, kind?: string)
```

and returns:

- `agent`
- `model`
- `variant`
- `variants`
- `agents`
- `models`
- `load`
- `setAgent`
- `setModel`
- `setVariant`
- `composer`

**Step 2: Move repeated orchestration into the hook**

Inside the hook:

- call `useProviderList()`
- call `useAgentList(kind)`
- call `useProjectComposer(scope)`
- call `resolveComposer(...)`
- expose validated setters for:
  - agent name
  - `providerID/modelID`
  - variant normalization (`"default"` -> `null`)

**Step 3: Keep validation behavior stable**

Preserve current guards from pages:

- invalid agent selections no-op
- invalid model selections no-op
- default variant maps to `null`

**Step 4: Run typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

Expected: no new type errors.

### Task 2: Add `useStrategySession`

**Files:**
- Create: `packages/strategy-front/src/hooks/use-strategy-session.ts`
- Read: `packages/strategy-front/src/hooks/use-chat-sessions.ts`
- Read: `packages/strategy-front/src/hooks/use-chat-session-detail.ts`
- Read: `packages/strategy-front/src/api/modules/chat.ts`
- Read: `packages/strategy-front/src/pages/strategy-detail.tsx`

**Step 1: Define hook responsibilities**

Create a hook that accepts:

```ts
useStrategySession(path: string)
```

and returns:

- `sessions`
- `selectedSessionId`
- `sessionLoading`
- `detailLoading`
- `creating`
- `messages`
- `status`
- `eventErr`
- `busy`
- `ensure`
- `selectSession`
- `createSession`
- `abortSession`

**Step 2: Centralize default-session behavior**

Move this behavior out of the page:

- ensure sessions on mount
- auto-select first session when no current selection exists

**Step 3: Centralize abort behavior**

Move `chatApi.abortSession(...)` behind the hook and keep:

- no-op when idle
- no-op when there is no selected session

**Step 4: Keep toast ownership in the page**

The hook should expose async methods and state. The page can still decide whether to show a toast for failures if needed.

**Step 5: Run typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

Expected: no new type errors.

### Task 3: Refactor `strategy-detail.tsx` to use new hooks

**Files:**
- Modify: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Read: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`

**Step 1: Replace inline composer/session orchestration**

Remove page-local logic for:

- `resolveComposer(...)`
- `setAgent`
- `setModel`
- `setVariant`
- `ensureSessions`
- first-session selection
- `onAbort`

Replace them with `useStrategyComposer(...)` and `useStrategySession(...)`.

**Step 2: Leave UI-only state local**

Keep only these page-local states:

- detail pane `open`
- selected `file`
- selected detail `tab`
- refresh spinner if still needed

**Step 3: Verify the page still drives children correctly**

Confirm props passed to `StrategyChatPanel` and `WorkspaceDetailPane` are unchanged or intentionally renamed.

**Step 4: Manual smoke test**

Verify:

1. Opening strategy detail still selects the workspace.
2. Existing first session auto-select still works.
3. Creating a session still focuses the new session.
4. Abort still works when the session is busy.
5. Opening a diff still opens the right detail pane tab.

### Task 4: Refactor `strategy-multi.tsx` to use new hooks

**Files:**
- Modify: `packages/strategy-front/src/pages/strategy-multi.tsx`
- Read: `packages/strategy-front/src/components/workspace/multi-workspace-chat-panel.tsx`

**Step 1: Replace page-local repeated composer logic in `Panel`**

Use `useStrategyComposer(props.workspace.path)` inside the inner panel component instead of manually wiring:

- provider list
- agent list
- project composer
- composer resolution
- setter validation

**Step 2: Keep page-local layout state local**

Keep only:

- `wide`
- `spin`
- `tab`
- multi-panel loading map if still needed

**Step 3: Reduce `Panel` surface area**

Ensure `Panel` mostly becomes:

- hook calls
- `MultiWorkspaceChatPanel` prop mapping
- loading overlay

**Step 4: Manual smoke test**

Verify:

1. 2-panel and 3-panel views still render.
2. Agent/model/variant switching still works per workspace.
3. Mobile tab mode still switches correctly.
4. Busy overlay still behaves correctly while loading.

### Task 5: PR1 final verification

**Files:**
- Review: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Review: `packages/strategy-front/src/pages/strategy-multi.tsx`
- Review: `packages/strategy-front/src/hooks/use-strategy-composer.ts`
- Review: `packages/strategy-front/src/hooks/use-strategy-session.ts`

**Step 1: Run package typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

**Step 2: Review for naming cleanup**

Shorten any newly introduced identifiers that violate repo naming conventions.

**Step 3: Commit**

```bash
git add packages/strategy-front/src/pages/strategy-detail.tsx packages/strategy-front/src/pages/strategy-multi.tsx packages/strategy-front/src/hooks/use-strategy-composer.ts packages/strategy-front/src/hooks/use-strategy-session.ts
git commit -m "refactor: extract strategy page orchestration"
```

---

## PR2: Convert Workspace Editor To Reducer State Machine

### Goal

Replace the large cluster of local `useState` calls in the workspace editor with a single reducer-driven state machine so state transitions become explicit and easier to reason about.

### Task 6: Design editor state and actions

**Files:**
- Create: `packages/strategy-front/src/lib/workspace-editor-reducer.ts`
- Optional Create: `packages/strategy-front/src/types/workspace-editor.ts`
- Read: `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`

**Step 1: Define a single state shape**

Include at least:

- `workspace`
- `tree`
- `open`
- `active`
- `files`
- `drafts`
- `dirty`
- `busy`
- `saving`
- `errs`
- `loading`
- `error`

**Step 2: Define reducer actions**

Create typed actions for:

- `workspace_changed`
- `files_loaded`
- `files_load_failed`
- `tab_opened`
- `tab_closed`
- `active_set`
- `file_load_started`
- `file_load_succeeded`
- `file_load_failed`
- `draft_changed`
- `save_started`
- `save_succeeded`
- `save_failed`

**Step 3: Encode current behavior in reducer rules**

Make reducer preserve current semantics:

- workspace switch resets editor data
- refresh removes missing files
- dirty drafts survive refresh when intended
- closing active tab picks the next sensible tab

### Task 7: Refactor `workspace-editor-pane.tsx`

**Files:**
- Modify: `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`
- Read: `packages/strategy-front/src/api/modules/workspace.ts`

**Step 1: Replace most `useState` calls with `useReducer`**

Keep only truly external refs if needed for async race protection. Remove state duplication where possible.

**Step 2: Move reset/filter logic into reducer**

Specifically remove ad hoc reset chains like:

- `setPaths([])`
- `setFiles({})`
- `setDrafts({})`
- `setDirty({})`
- `setBusy({})`
- `setSaving({})`
- `setErrs({})`
- `setOpen([])`
- `setActive(null)`

and make them reducer outcomes.

**Step 3: Convert `load`, `read`, `change`, and `save` to dispatch-driven transitions**

The async functions should:

1. dispatch start
2. await API
3. dispatch success or failure

**Step 4: Derive view state from reducer state**

Compute:

- active file
- active file error
- active file loading
- active file saving
- current editor value
- readonly lock
- dirty count

with memo or direct reads, not extra state.

**Step 5: Preserve current child component API**

Avoid changing:

- `WorkspaceFileTabs`
- `WorkspaceCodeEditor`
- `WorkspaceFileTree`

unless a small prop cleanup is clearly beneficial and low risk.

### Task 8: Validate editor behaviors manually

**Files:**
- Review: `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`
- Review: `packages/strategy-front/src/lib/workspace-editor-reducer.ts`

**Step 1: Manual regression checklist**

Verify:

1. Opening a workspace with a default file still opens the correct file.
2. Clicking a file in the tree opens a tab and loads file content.
3. Closing the active tab selects the next expected tab.
4. Editing marks the tab dirty.
5. Saving clears dirty state.
6. Refresh keeps dirty draft behavior unchanged.
7. Unsupported file preview still shows the current error behavior.

**Step 2: Run package typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

**Step 3: Commit**

```bash
git add packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx packages/strategy-front/src/lib/workspace-editor-reducer.ts
git commit -m "refactor: convert workspace editor to reducer"
```

---

## PR3: Unify Chat Async Process State In Redux

### Goal

Move chat async process flags into Redux so chat data state and chat request lifecycle state live under one owner instead of being split between store and local hook state.

### Task 9: Extend chat slice with async process state

**Files:**
- Modify: `packages/strategy-front/src/store/chat-session-slice.ts`
- Read: `packages/strategy-front/src/lib/chat-event-reducer.ts`

**Step 1: Add async process fields**

Add state maps such as:

- `sessionLoading`
- `sessionCreating`
- `detailLoading`

Use workspace/session keyed records to match current patterns.

**Step 2: Add reducers for process transitions**

Add actions like:

- `setWorkspaceSessionLoading`
- `setWorkspaceSessionCreating`
- `setSessionDetailLoading`

Keep names short and consistent with existing slice style.

**Step 3: Keep existing chat event reducers intact**

Do not combine this with event reducer rewrites in the same PR.

### Task 10: Refactor chat hooks to dispatch process state

**Files:**
- Modify: `packages/strategy-front/src/hooks/use-chat-sessions.ts`
- Modify: `packages/strategy-front/src/hooks/use-chat-session-detail.ts`

**Step 1: Remove local `useState` process flags**

Delete hook-local:

- `loading`
- `creating`

from `use-chat-sessions.ts`

Delete hook-local:

- `loading`

from `use-chat-session-detail.ts`

**Step 2: Replace with store-backed transitions**

Dispatch process actions before/after API calls.

**Step 3: Keep hook return shape stable where possible**

Continue returning the same outward fields so consumers need minimal changes.

### Task 11: Add selectors for common chat derived state

**Files:**
- Create: `packages/strategy-front/src/store/chat-session-selectors.ts`
- Read: `packages/strategy-front/src/store/index.ts`
- Read: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Read: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`

**Step 1: Add selector helpers**

Create selectors for:

- workspace sessions
- selected session id
- session detail bundle
- session busy state

**Step 2: Use selectors in hooks or consumers**

Prefer one place for deriving:

- `busy`
- `eventErr`
- loaded/hydrated state

### Task 12: Verify chat flow

**Files:**
- Review: `packages/strategy-front/src/hooks/use-chat-sessions.ts`
- Review: `packages/strategy-front/src/hooks/use-chat-session-detail.ts`
- Review: `packages/strategy-front/src/store/chat-session-slice.ts`

**Step 1: Manual regression checklist**

Verify:

1. Session list still refreshes correctly.
2. Creating a session still selects it.
3. Hydrating message history still works.
4. SSE-driven busy/idle transitions still render correctly.
5. Event error vs message error precedence still works.

**Step 2: Run package typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

**Step 3: Commit**

```bash
git add packages/strategy-front/src/store/chat-session-slice.ts packages/strategy-front/src/store/chat-session-selectors.ts packages/strategy-front/src/hooks/use-chat-sessions.ts packages/strategy-front/src/hooks/use-chat-session-detail.ts
git commit -m "refactor: unify chat async state in store"
```

---

## PR4: Simplify Global Resource Provider

### Goal

Reduce the custom state-machine complexity in `global-data-provider.tsx` without breaking public hooks like `useWorkspaceList`, `useAgentList`, and `useProviderList`.

### Task 13: Separate provider responsibilities

**Files:**
- Modify: `packages/strategy-front/src/data/global-data-provider.tsx`
- Read: `packages/strategy-front/src/components/system/system-provider.tsx`
- Read: `packages/strategy-front/src/components/project/project-composer-provider.tsx`

**Step 1: Clarify provider ownership**

Keep this provider responsible for:

- resource fetch/cache state
- ensure/refresh/invalidate behavior

Avoid expanding it further into page navigation state.

**Step 2: Decide what to do with selected workspace**

Preferred direction:

- stop treating selected workspace as long-lived global app state
- keep route-driven pages route-driven
- keep list-page selection only if it still has a real consumer

If removal is too risky, keep the API but isolate it from the resource cache logic.

### Task 14: Convert provider internals to reducer-driven resource state

**Files:**
- Modify: `packages/strategy-front/src/data/global-data-provider.tsx`

**Step 1: Replace ad hoc `setState` transitions with reducer actions**

Introduce actions like:

- `load_start`
- `load_success`
- `load_fail`
- `invalidate`
- `workspace_select`
- `workspace_clear`

**Step 2: Preserve request dedupe and race protection**

Keep the current good behaviors:

- one in-flight request per key when not forcing refresh
- latest request wins

but make state transitions easier to read.

**Step 3: Keep public hooks stable**

Continue supporting:

- `useAgentList`
- `useProviderList`
- `useWorkspaceList`
- `useGlobalData`

to avoid a broad call-site migration in the same PR.

### Task 15: Verify provider consumers

**Files:**
- Review: `packages/strategy-front/src/data/global-data-provider.tsx`
- Review: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Review: `packages/strategy-front/src/pages/strategy-multi.tsx`
- Review: `packages/strategy-front/src/pages/strategies.tsx`
- Review: `packages/strategy-front/src/components/agent/agent-page.tsx`

**Step 1: Manual regression checklist**

Verify:

1. Workspace list still loads and refreshes.
2. Provider list still loads and model visibility still works.
3. Agent list still loads and filtering by scope still works.
4. Detail page still finds a workspace by path.
5. Global agent page still refreshes and reloads data properly.

**Step 2: Run package typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

**Step 3: Commit**

```bash
git add packages/strategy-front/src/data/global-data-provider.tsx
git commit -m "refactor: simplify global resource provider"
```

---

## Final Verification

### Task 16: Run final package validation

**Files:**
- Review: `packages/strategy-front/src/pages/strategy-detail.tsx`
- Review: `packages/strategy-front/src/pages/strategy-multi.tsx`
- Review: `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`
- Review: `packages/strategy-front/src/store/chat-session-slice.ts`
- Review: `packages/strategy-front/src/data/global-data-provider.tsx`

**Step 1: Run package typecheck**

Run:

```powershell
cmd /c bun typecheck
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

**Step 2: Run lint if package already supports it**

Run:

```powershell
cmd /c bun run lint
```

Workdir:

```text
f:\code\opencode\packages\strategy-front
```

Expected: pass, or document pre-existing failures if the script or package does not support lint cleanly.

**Step 3: Perform final manual smoke test**

Verify these end-to-end flows:

1. Strategy list -> detail page
2. Detail page session create/select/abort
3. Diff open -> detail pane review tab
4. Multi-strategy page with 2 strategies
5. Multi-strategy page with 3 strategies
6. Workspace file open/edit/save/refresh
7. Agent/provider data still visible where expected

---

## Notes For The Implementer

- Do not combine PR2 and PR3. The editor refactor and chat-state refactor touch different state models and are easier to validate separately.
- Do not rewrite `chat-event-reducer.ts` unless a concrete bug is found. This plan is about state ownership first, not event semantics redesign.
- Do not add a new dependency like TanStack Query in this pass unless PR4 clearly stalls without it. Prefer internal cleanup first.
- Keep route behavior and component props stable whenever possible.
- After each PR, review touched lines and shorten newly introduced identifiers to match the repo naming style.

## Suggested Branch / Commit Rhythm

1. `refactor/strategy-front-page-hooks`
2. `refactor/strategy-front-editor-reducer`
3. `refactor/strategy-front-chat-state`
4. `refactor/strategy-front-global-data`

Frequent commits are preferred if a PR needs to be split into preparatory cleanup and the main change.

---

## Progress Log

### 2026-04-03 PR1 Completed

**Status:** done

**Implemented:**

- Added `packages/strategy-front/src/hooks/use-strategy-composer.ts`
- Added `packages/strategy-front/src/hooks/use-strategy-session.ts`
- Refactored `packages/strategy-front/src/pages/strategy-detail.tsx` to use the new hooks
- Refactored `packages/strategy-front/src/pages/strategy-multi.tsx` to use the new composer hook
- Refactored `packages/strategy-front/src/components/workspace/multi-workspace-chat-panel.tsx` to use the new session hook

**Behavior preserved intentionally:**

- Strategy detail still owns layout-only state such as code pane open/close, active detail tab, and selected diff file
- Multi-strategy page still owns wide/mobile layout switching and multi-panel loading overlay
- Chat submission, session selection, and abort flow still keep toast ownership in the component/page layer

**Validation run:**

- `cmd /c npx eslint src/pages/strategy-detail.tsx src/pages/strategy-multi.tsx src/components/workspace/multi-workspace-chat-panel.tsx src/hooks/use-strategy-composer.ts src/hooks/use-strategy-session.ts`
- Result: pass

**Blocked package-wide validation:**

- `cmd /c bun run build`
- Result: failed on a pre-existing unrelated error in `packages/strategy-front/src/pages/strategies.tsx`
- Error: `TS6133: 'Boxes' is declared but its value is never read.`

**Notes for PR2:**

- `StrategyChatPanel` still consumes externally supplied session/composer props and is already thinner after PR1
- `MultiWorkspaceChatPanel` had a duplicate chat-session orchestration path and is now aligned with the new shared hook

### 2026-04-03 PR2 Completed

**Status:** done

**Implemented:**

- Added `packages/strategy-front/src/lib/workspace-editor-reducer.ts`
- Refactored `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx` from many local `useState` calls to `useReducer`
- Moved editor transitions for:
  - workspace file list loading
  - tab open/close
  - active file switching
  - file content loading
  - draft changes
  - save start/success/failure

**Behavior preserved intentionally:**

- `WorkspaceFileTabs`, `WorkspaceCodeEditor`, and `WorkspaceFileTree` public props were kept stable
- dirty draft counting and active tab behavior remain in the editor pane layer
- async race protection for workspace switching still uses a `ref`

**Validation run:**

- `cmd /c npx eslint src/components/workspace/workspace-editor-pane.tsx src/lib/workspace-editor-reducer.ts`
- Result: pass

**Blocked package-wide validation:**

- `cmd /c bun run build`
- Result: still blocked by the same pre-existing unrelated error in `packages/strategy-front/src/pages/strategies.tsx`
- Error: `TS6133: 'Boxes' is declared but its value is never read.`

**Notes for PR3:**

- editor state is now concentrated enough that chat async state can be cleaned up separately without overlapping too much with file editing behavior
- reducer currently handles the heaviest reset/prune logic that used to be spread across `load`, `read`, and `save`

### 2026-04-03 PR3 Completed

**Status:** done

**Implemented:**

- Extended `packages/strategy-front/src/lib/chat-event-reducer.ts` state shape with:
  - `sessionLoading`
  - `sessionCreating`
  - `detailLoading`
- Extended `packages/strategy-front/src/store/chat-session-slice.ts` with process actions for workspace/session loading state
- Added `packages/strategy-front/src/store/chat-session-selectors.ts`
- Refactored `packages/strategy-front/src/hooks/use-chat-sessions.ts` to read process state from Redux instead of local `useState`
- Refactored `packages/strategy-front/src/hooks/use-chat-session-detail.ts` to read detail loading state from Redux instead of local `useState`

**Behavior preserved intentionally:**

- `useChatSessions` still returns `loading`, `creating`, `sessions`, `selectedSessionId`, `ensureSessions`, `refreshSessions`, `createSession`, `selectSession`
- `useChatSessionDetail` still returns `loading`, `messages`, `status`, `eventErr`, `messageErr`, `refresh`
- current consumers such as sidebars and strategy pages do not need a broad prop/API migration

**Validation run:**

- `cmd /c npx eslint src/lib/chat-event-reducer.ts src/store/chat-session-slice.ts src/store/chat-session-selectors.ts src/hooks/use-chat-sessions.ts src/hooks/use-chat-session-detail.ts`
- Result: pass

**Blocked package-wide validation:**

- `cmd /c bun run build`
- Result: still blocked by the same pre-existing unrelated error in `packages/strategy-front/src/pages/strategies.tsx`
- Error: `TS6133: 'Boxes' is declared but its value is never read.`

**Notes for PR4:**

- chat session data and chat async process state now share the same owner, so the global resource provider can be simplified without also needing to absorb chat request lifecycle flags

### 2026-04-03 PR4 Completed

**Status:** done

**Implemented:**

- Reworked `packages/strategy-front/src/data/global-data-provider.tsx` into a clean reducer-driven resource cache implementation
- Kept the public API stable for:
  - `useGlobalData`
  - `useAgentList`
  - `useProviderList`
  - `useWorkspaceList`
- Preserved request dedupe and latest-request-wins behavior via the existing `wait` and `seq` refs
- Simplified selected workspace handling so provider state stores the selected workspace path and derives the selected workspace object from current workspace data

**Behavior preserved intentionally:**

- resource loading still uses `ensure`, `refresh`, `refreshMany`, and `invalidate`
- pages consuming provider data do not need an API migration
- workspace selection semantics remain available to list/sidebar consumers

**Validation run:**

- `cmd /c bun run build`
- Result: provider refactor did not introduce new TypeScript errors
- Remaining package-wide blocker is still the same pre-existing unrelated error in `packages/strategy-front/src/pages/strategies.tsx`
- Error: `TS6133: 'Boxes' is declared but its value is never read.`

**Lint note:**

- `cmd /c npx eslint src/data/global-data-provider.tsx`
- Result: still reports `react-refresh/only-export-components`
- Reason: the file continues to export both the provider component and shared hooks, which is an older file-structure pattern not changed in this pass to avoid a broad import migration

---

## Review Defect Checklist

### 2026-04-04 Review Notes For PR1 To PR4

**Status:** review completed

**Defects found:**

1. **PR3: chat loading state can become incorrect under concurrent requests**
   - Status: fixed on 2026-04-04
   - Severity: medium
   - Files:
     - `packages/strategy-front/src/hooks/use-chat-sessions.ts`
     - `packages/strategy-front/src/hooks/use-chat-session-detail.ts`
     - `packages/strategy-front/src/hooks/use-strategy-session.ts`
     - `packages/strategy-front/src/components/chat/session-sidebar-panel.tsx`
   - Problem:
     - `sessionLoading`, `sessionCreating`, and `detailLoading` were moved into Redux as shared booleans, but there is no request dedupe, request token, or in-flight counter for these async paths.
     - When two consumers trigger the same workspace/session load at nearly the same time, the earlier-finishing request can set the shared loading flag back to `false` while another request is still running.
   - Risk:
     - loading indicators can disappear too early
     - submit controls can leave the loading state early
     - pages and sidebars can render inconsistent request state
   - Suggested fix:
     - add request dedupe in the hook layer, or
     - track in-flight request counts / request ids in store instead of plain booleans

2. **PR2: workspace editor reloads workspace files twice when switching workspace**
   - Status: fixed on 2026-04-04
   - Severity: medium
   - Files:
     - `packages/strategy-front/src/components/workspace/workspace-editor-pane.tsx`
     - `packages/strategy-front/src/lib/workspace-editor-reducer.ts`
   - Problem:
     - `load` depends on `state.ws`
     - on workspace switch, `dispatch({ type: "load_start" })` updates reducer state first
     - that state change recreates `load`, which retriggers the `useEffect(() => void load(), [load])`
   - Risk:
     - duplicate `getWorkspaceFiles(...)` requests when changing workspace
     - extra loading flicker and unnecessary network work
   - Suggested fix:
     - decouple the effect trigger from reducer state changes, or
     - compute workspace-switch reset from refs / props rather than from a callback dependency on `state.ws`

3. **PR1: strategy detail refresh failure toast contains garbled text**
   - Status: fixed on 2026-04-04
   - Severity: low
   - File:
     - `packages/strategy-front/src/pages/strategy-detail.tsx`
   - Problem:
     - the refresh error toast text is currently `鍒锋柊澶辫触`
   - Risk:
     - users see broken UI text on refresh failure
   - Suggested fix:
     - restore the intended Chinese copy, likely `刷新失败`

4. **Validation process gap: plan requires package typecheck, but package has no `typecheck` script**
   - Status: fixed on 2026-04-04
   - Severity: low
   - File:
     - `packages/strategy-front/package.json`
   - Problem:
     - the implementation plan repeatedly says to run `cmd /c bun typecheck`
     - this package only provides `build` and `lint`; `typecheck` does not exist
   - Risk:
     - review / implementation notes can claim a check that was never actually run
     - future PR validation may follow an invalid command path
   - Suggested fix:
     - either add a real `typecheck` script, or
     - update the plan to use the actual package validation command

**Fix validation after remediation:**

- `cmd /c bun run typecheck`
- Result: pass
- `cmd /c bun run build`
- Result: pass
- `cmd /c npx eslint src/pages/strategy-detail.tsx src/components/workspace/workspace-editor-pane.tsx src/hooks/use-chat-sessions.ts src/hooks/use-chat-session-detail.ts src/pages/strategies.tsx`
- Result: pass

**Additional cleanup during validation:**

- Removed the unused `Boxes` import in `packages/strategy-front/src/pages/strategies.tsx`
- This cleared the old TypeScript blocker so package-wide validation can now complete
