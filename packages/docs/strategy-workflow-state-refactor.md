# Strategy Workflow State Refactor

## Goal

- Align strategy detail workflow behavior with the existing workflow chat flow.
- Use workspace workflow state as the source of truth for workflow busy state.
- Avoid relying on missed `session.status` SSE events when entering a page late.

## Checklist

- [x] Add a shared workflow state helper for phase and busy derivation.
- [x] Add a shared workspace chat state hook based on `workspaceChatApi.getState`.
- [x] Keep polling while workflow phase is `running` or `waiting`.
- [x] Sync detail page selected session from `workspace.state.session_id`.
- [x] Derive detail page `busy` from workflow state first, then fall back to chat status.
- [x] Route detail page abort to workflow interrupt when the active workflow run owns the selected session.
- [x] Expose workflow `busy` from `useStrategyWorkflowChat`.
- [x] Update strategy detail chat panel to consume explicit `busy`.
- [x] Update workflow panel todo/live logic to consume workflow `busy`.
- [x] Include workflow state loading in detail page loading overlay.
- [x] Run package typecheck in `strategy-front`.
- [x] Attempt package build validation in `strategy-front`.

## Scope

- `strategy-front/src/lib/workspace-chat.ts`
- `strategy-front/src/hooks/use-workspace-chat-state.ts`
- `strategy-front/src/hooks/use-strategy-session.ts`
- `strategy-front/src/hooks/use-strategy-workflow-chat.ts`
- `strategy-front/src/components/strategy/strategy-chat-panel.tsx`
- `strategy-front/src/components/strategy/strategy-workflow-panel.tsx`
- `strategy-front/src/pages/strategy-detail.tsx`

## Rules

- Treat `workspace.state.status` as the workflow truth.
- Treat chat session `status` as a chat-stream hint only.
- Only report workflow busy when `workspace.state.session_id` matches the selected session.
- Preserve existing non-workflow chat behavior.

## Acceptance

- Opening a strategy detail page during an active workflow run shows `busy` immediately.
- Refreshing a detail page during `running` or `waiting` does not fall back to idle first.
- Abort from the detail page interrupts the workflow run when workflow state owns the selected session.
- Workflow chat page and strategy detail page derive workflow busy the same way.

## Validation

- `bun typecheck` passes in `strategy-front`.
- `bun run build` is attempted in `strategy-front`, but the current environment blocks Vite or esbuild child process spawn with `spawn EPERM`.
