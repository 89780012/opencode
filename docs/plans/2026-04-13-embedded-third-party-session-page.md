# Embedded Third-Party Session Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single third-party entry page that accepts a workspace path on open, prepares the workspace for immediate chat usage, checks and initializes Git when needed, defaults the agent to `smartx-helper`, and moves model configuration into a top-right gear menu without reusing the main sidebar layout.

**Architecture:** Add a backend `workspace attach` bootstrap flow that validates the incoming directory, ensures `opencode` is available, detects existing Git state, initializes Git only when missing, and registers the workspace as an `external` source. Add a dedicated frontend `/embed/session` route outside `/app`, backed by a new layout without sidebar, which bootstraps from `?path=...`, auto-selects or creates a session, fixes the agent to `smartx-helper`, and reuses the existing chat and code panels with a lightweight settings dialog in the header.

**Tech Stack:** React, React Router, TypeScript, Go, Gin, local JSON store, existing opencode proxy/session APIs

---

### Task 1: Freeze The External Entry Contract

**Files:**
- Modify: `packages/strategy-front/src/routes/index.tsx`
- Modify: `packages/strategy-front/src/types/workspace.ts`
- Modify: `packages/strategy-front/src/api/modules/workspace.ts`
- Modify: `packages/strategy-service/internal/workspace/model.go`
- Modify: `packages/strategy-service/internal/web/workspace_api.go`

**Step 1: Define the public route contract**

Use one stable entry:

```text
/embed/session?path=<absolute-path>
```

Rules:

- `path` is required.
- `path` must point to a directory.
- The page should not depend on prior strategy registration.
- The page should be usable as the only externally exposed UI.

**Step 2: Define the backend bootstrap contract**

Add a new API:

```http
POST /api/workspace/attach
Content-Type: application/json

{
  "path": "C:\\code\\demo",
  "type": "smartx"
}
```

Response shape:

```json
{
  "workspace": {},
  "git": {
    "repo": true,
    "initialized": false,
    "available": true,
    "source": "system"
  },
  "runtime": {
    "opencode_ready": true
  }
}
```

**Step 3: Extend the workspace type contract**

Add a new `source` value:

- `external`

This allows the backend to persist attached directories without polluting the main strategy list semantics.

### Task 2: Add Backend Workspace Attach And Runtime Bootstrap

**Files:**
- Modify: `packages/strategy-service/internal/workspace/service.go`
- Modify: `packages/strategy-service/internal/web/workspace_api.go`
- Modify: `packages/strategy-service/internal/web/api.go`
- Modify: `packages/strategy-service/internal/workspace/model.go`
- Modify: `packages/strategy-service/internal/oprun/manager.go`

**Step 1: Add a dedicated attach method**

Implement a new service method instead of overloading `Import`:

```go
func (s *Service) Attach(ctx context.Context, path string, typ string) (AttachResult, error)
```

Responsibilities:

- trim and validate `path`
- confirm the target exists and is a directory
- ensure `opencode` is reachable through the existing manager or proxy path
- inspect Git state
- initialize Git only if missing and runtime Git is available
- upsert the workspace row with `source = "external"`

**Step 2: Reuse existing workspace normalization**

Keep shared logic in helpers instead of branching across `Import`, `Open`, and `Attach`.

Refactor toward helpers such as:

- `inspectDir(path string) (Local, error)`
- `upsert(row Local) error`
- `ensureGit(ctx context.Context, dir string) (GitState, error)`

Avoid copying the existing `Import` logic into a second near-identical branch.

**Step 3: Make `attach` the only path that prepares runtime**

Do not add `opencode` startup calls in the frontend.

`Attach` should fail early with explicit errors like:

- `path is required`
- `path is not a directory`
- `opencode is unavailable`
- `git runtime is unavailable`

### Task 3: Detect Git Before Initializing It

**Files:**
- Modify: `packages/strategy-service/internal/workspace/service.go`
- Modify: `packages/strategy-service/internal/workspace/model.go`
- Modify: `packages/strategy-service/internal/runtime/service.go`

**Step 1: Add explicit Git inspection**

Add a helper that checks for an existing repository without mutating state.

Preferred rule:

- treat `.git` directory or file as an existing repo marker
- return `repo = true` and skip `git init`

**Step 2: Return structured Git outcome**

Add a backend result model such as:

```go
type GitState struct {
    Repo        bool   `json:"repo"`
    Initialized bool   `json:"initialized"`
    Available   bool   `json:"available"`
    Source      string `json:"source,omitempty"`
}
```

Expected outcomes:

- already a repo: `repo=true`, `initialized=false`
- missing repo but Git available: `repo=true`, `initialized=true`
- missing repo and Git unavailable: error

**Step 3: Keep `initGit` focused**

`initGit` should remain the mutating shell execution path.

Do not let callers guess whether `git init` is needed. Make them call the new inspection helper and only init through one branch.

### Task 4: Register External Workspaces Without Polluting Main Strategy UX

**Files:**
- Modify: `packages/strategy-service/internal/workspace/store.go`
- Modify: `packages/strategy-service/internal/workspace/model.go`
- Modify: `packages/strategy-front/src/types/workspace.ts`
- Modify: `packages/strategy-front/src/data/global-data-provider.tsx`
- Modify: `packages/strategy-front/src/pages/strategies.tsx`

**Step 1: Persist `external` source cleanly**

Update backend `source()` normalization to accept:

- `default_plugin`
- `user_created`
- `imported`
- `external`

Keep all other values rejected.

**Step 2: Preserve external workspace compatibility in frontend types**

Extend the union in `LocalWorkspace`:

```ts
source?: "default_plugin" | "user_created" | "imported" | "external"
```

**Step 3: Filter `external` from the main strategies page**

In the strategies list page, exclude `source === "external"` by default.

This keeps third-party attached paths out of the primary product list while still allowing the embed page to reuse the same backend workspace registry.

### Task 5: Add A Dedicated Embed Layout And Route

**Files:**
- Add: `packages/strategy-front/src/pages/embed-layout.tsx`
- Add: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/routes/index.tsx`
- Modify: `packages/strategy-front/src/pages/app-shell.tsx`

**Step 1: Mount the embed route outside `/app`**

Recommended route tree:

```tsx
{
  path: "/embed",
  element: <EmbedLayoutPage />,
  children: [
    {
      path: "session",
      element: <EmbedSessionPage />,
    },
  ],
}
```

This must not render:

- `AppSidebar`
- `LayoutPage`
- `SystemSidebarPanel`

**Step 2: Keep the new layout intentionally small**

`EmbedLayoutPage` should only provide:

- full-height container
- background
- `Outlet`

Do not reintroduce app navigation chrome through shared wrappers.

**Step 3: Keep `AppShellPage` unchanged for existing pages**

Do not route the embed page through:

- `ProjectComposerProvider`
- `GlobalDataProvider`
- main sidebar shell

unless the embed page truly needs those providers locally. If needed, wrap only the embed route content, not the shared app shell.

### Task 6: Bootstrap The Embed Page From Query Path

**Files:**
- Add: `packages/strategy-front/src/hooks/use-embed-entry.ts`
- Add: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/api/modules/workspace.ts`
- Modify: `packages/strategy-front/src/lib/strategy-path.ts`

**Step 1: Read `path` from query**

Use `useSearchParams()` in the embed page and require:

```ts
const path = query.get("path")?.trim() ?? ""
```

If missing:

- show a full-page empty/error state
- do not mount chat hooks yet

**Step 2: Create a bootstrap hook**

`useEmbedEntry(path)` should own:

- attach API call
- loading state
- attach error state
- resolved `workspace`
- last successful path guard

Return shape:

```ts
{
  load: boolean
  err: string
  workspace: LocalWorkspace | null
  git: AttachGitState | null
  ready: boolean
  refresh: () => Promise<void>
}
```

**Step 3: Avoid depending on the global workspace list**

The embed page should use the `workspace` returned by attach directly.

Do not wait for `useWorkspaceList()` to catch up before rendering chat or file panes.

### Task 7: Auto-Prepare Session State For Immediate Use

**Files:**
- Modify: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/hooks/use-strategy-session.ts`
- Modify: `packages/strategy-front/src/hooks/use-chat-sessions.ts`
- Modify: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`

**Step 1: Reuse existing chat/session hooks**

Once `workspace.path` is ready, use:

- `useStrategySession(workspace.path)`
- existing `StrategyChatPanel`
- existing `WorkspaceDetailPane`

Avoid creating a second chat stack for the embed page.

**Step 2: Auto-create a session only when needed**

In the embed page, add a guarded effect:

```ts
if (ready && !chat.sessionLoading && !chat.creating && chat.sessions.length === 0) {
  void chat.createSession()
}
```

This gives the user an immediately usable page without adding backend session bootstrap complexity.

**Step 3: Keep the code pane optional**

Default the code pane to closed.

The page should still expose:

- open code
- diff review
- refresh

but the default visual priority should be chat first.

### Task 8: Fix The Embed Composer Rules

**Files:**
- Add: `packages/strategy-front/src/hooks/use-embed-composer.ts`
- Modify: `packages/strategy-front/src/components/project/project-composer-provider.tsx`
- Modify: `packages/strategy-front/src/lib/chat-composer.ts`
- Modify: `packages/strategy-front/src/data/global-data-provider.tsx`

**Step 1: Force the default agent to `smartx-helper`**

Embed-page composer rules:

- if `smartx-helper` exists, use it
- if not, fall back to the current first valid agent

Do not change the default ordering for the regular strategy pages.

**Step 2: Keep model fallback compatible with existing catalog rules**

Model selection order for embed page:

1. path-scoped saved model
2. provider config default
3. recent model
4. connected provider default
5. first visible model

Only the agent should be force-biased for embed mode.

**Step 3: Scope composer persistence to the external path**

Persist embed page model choices to the same path bucket used by the current project composer provider so reopening the same external path keeps the last chosen model.

### Task 9: Move Model Configuration Into A Top-Right Gear

**Files:**
- Add: `packages/strategy-front/src/components/chat/composer-settings-dialog.tsx`
- Modify: `packages/strategy-front/src/components/chat/prompt-bar.tsx`
- Modify: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx`

**Step 1: Add `PromptBar` visibility switches**

Extend `PromptBar` with:

- `showAgent?: boolean`
- `showModel?: boolean`

Defaults should preserve current behavior for existing pages.

**Step 2: Build a small header settings dialog**

Create a focused dialog or sheet triggered by a gear icon in the embed page header.

Dialog contents:

- read-only agent value: `smartx-helper`
- editable model selector
- optional variant selector when the model exposes variants
- lightweight helper copy about settings applying to future messages in this workspace

**Step 3: Remove duplicate controls from the embed input bar**

In embed mode, render:

- `showAgent={false}`
- `showModel={false}`

The input bar should only handle:

- text input
- image attachments
- submit / abort

### Task 10: Assemble The Embed Session Page UI

**Files:**
- Add: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/components/workspace/workspace-detail-pane.tsx`
- Modify: `packages/strategy-front/src/components/chat/chat-empty-state.tsx`
- Modify: `packages/strategy-front/src/components/chat-message-list.tsx`

**Step 1: Build the new header**

Header elements:

- workspace name
- truncated path
- Git badge
- session switcher
- new session button
- code pane toggle
- refresh button
- gear button

Do not add:

- breadcrumb to main app
- sidebar toggle
- extra navigation tabs

**Step 2: Add explicit bootstrap states**

The page must have four clear states:

1. missing path
2. attaching / preparing
3. attach failed
4. ready

Use a full-page status shell for the first three.

**Step 3: Keep empty chat copy focused on immediate use**

The empty state should say the workspace is ready and the user can start directly, without mentioning strategy list or workspace registration.

### Task 11: Add Backend Test Coverage

**Files:**
- Add/Modify: `packages/strategy-service/internal/workspace/service_test.go`
- Add/Modify: `packages/strategy-service/internal/workspace/store_test.go`
- Add/Modify: `packages/strategy-service/internal/web/workspace_api_test.go`

**Step 1: Add attach-path validation tests**

Cover:

- missing path
- non-existent path
- file path instead of directory

**Step 2: Add Git behavior tests**

Cover:

- existing repo skips init
- missing repo initializes when Git is available
- missing repo returns error when Git is unavailable

**Step 3: Add source persistence tests**

Cover:

- attach stores `source = external`
- external rows survive store reload
- existing rows are updated instead of duplicated

**Step 4: Run backend verification**

Run from `packages/strategy-service`:

```bash
go test ./...
```

Expected:

- workspace and web tests pass
- no regression in existing workflow/runtime packages

### Task 12: Add Frontend Verification And Manual QA

**Files:**
- Modify: `packages/strategy-front/src/pages/embed-session.tsx`
- Modify: `packages/strategy-front/src/components/chat/prompt-bar.tsx`
- Optional: add frontend tests if the package already has a test harness

**Step 1: Typecheck the frontend package**

Run from `packages/strategy-front`:

```bash
bun typecheck
```

Expected:

- all new route, hook, and dialog types pass
- no regressions in existing strategy pages

**Step 2: Manual verification checklist**

1. Open `/embed/session?path=<existing-non-git-dir>`.
2. Confirm the page shows preparation state first.
3. Confirm Git badge ends in initialized/ready state.
4. Confirm no sidebar is visible.
5. Confirm the first session is auto-created.
6. Confirm the agent is `smartx-helper` without an inline selector.
7. Open the gear and confirm model selection is available there.
8. Send a message and confirm chat works.
9. Open the code pane and confirm files load.
10. Reopen the same path and confirm the selected model persists.

**Step 3: Regression checklist**

1. Open `/app/strategies`.
2. Confirm externally attached workspaces do not show in the main list.
3. Open a normal strategy detail page.
4. Confirm its prompt bar still shows the original inline agent/model controls.

## Notes For Implementation

- Prefer adding one clean `attach` API instead of making `import` and `open` smarter through flags.
- Keep Git detection on the backend; the frontend should only display the result.
- Reuse `StrategyChatPanel` and `WorkspaceDetailPane` rather than cloning the chat stack.
- Keep the embed route outside the main app shell so the single-page external exposure stays true.
- Avoid refactoring unrelated pages unless needed to share a small, focused component such as the composer settings dialog.
