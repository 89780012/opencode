# Solid Frontend

## Ownership

Solid UI code primarily lives in `packages/app/src`, with shared primitives in `packages/ui/src`. Desktop wrappers import the app and add runtime-specific shell behavior.

Reference files:
- `packages/app/src/app.tsx`
- `packages/app/src/entry.tsx`
- `packages/app/src/pages/layout.tsx`
- `packages/app/src/pages/session.tsx`
- `packages/app/src/context/global-sdk.tsx`
- `packages/app/src/context/command.tsx`
- `packages/app/src/context/file.tsx`
- `packages/app/src/utils/server.ts`
- `packages/ui/src/components/message-file.ts`

## Directory Pattern

- `components` holds reusable app components and feature dialogs.
- `context` holds Solid providers, state machines, SDK wiring, command/keybind state, file/content state, and sync logic.
- `pages` holds routed layouts and page-level composition.
- `utils` holds pure browser/runtime helpers, adapters, and focused tests.
- `i18n` holds per-locale translation files plus parity tests.
- `testing` holds app-side test helpers; keep test-only builders out of runtime folders unless already colocated with the feature.

## State And Effects

- Prefer existing contexts for cross-component state. Add fields to the owning context rather than creating parallel global signals.
- Keep SDK/server access behind `global-sdk`, `client`, `server`, or existing context helpers so components stay mostly presentational.
- Use Solid primitives idiomatically: `createSignal`, `createMemo`, `createEffect`, `createResource`, context providers, and cleanup hooks where existing files use them.
- Keep persistence and local storage behavior in existing utilities such as `utils/persist.ts` or the owning context.

## Components

- Keep page components thin: compose contexts, dialogs, and reusable components; move reusable behavior to a context or utility with tests.
- Follow existing component file naming with kebab-case filenames and TSX for Solid components.
- Keep runtime-specific desktop behavior in desktop packages or app runtime adapters, not scattered through generic UI components.

## SDK And Server Coupling

- App server calls should use generated `@opencode-ai/sdk` clients or existing wrappers, not handwritten fetches for SDK-visible OpenCode API routes.
- When server route response shapes change, regenerate the SDK and update app contexts/tests in the same change.
- Do not cast SDK response payloads locally to avoid updating route schemas or generated types.

## Tests

- App unit tests run with Happydom preload: `cd packages/app; bun test --preload ./happydom.ts ./src/...`.
- Use nearby tests as models: `context/command.test.ts`, `context/global-sync.test.ts`, `utils/server-health.test.ts`, `components/file-tree.test.ts`, and `i18n/parity.test.ts`.
- Prefer testing pure helpers, context behavior, and user-visible state transitions over duplicating component internals.

## Anti-Patterns

- Do not add duplicate caches for file content, server health, command state, or SDK client state before checking existing contexts.
- Do not put app-wide state in a leaf component because it is convenient for one UI flow.
- Do not introduce browser-only globals into shared UI package code unless the package already abstracts them.
