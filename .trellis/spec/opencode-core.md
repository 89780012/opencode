# OpenCode Core

## Ownership

`packages/opencode` owns the local product runtime: CLI, terminal UI, HTTP API server, sessions, agent loop, tools, providers, permissions, config, project state, storage, and process integration.

Reference files:
- `packages/opencode/src/index.ts`
- `packages/opencode/src/cli/cmd/run.ts`
- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/routes/session.ts`
- `packages/opencode/src/session/index.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/opencode/src/tool/tool.ts`
- `packages/opencode/src/provider/provider.ts`
- `packages/opencode/src/config/config.ts`

## Module Pattern

- Core domains are directory-based modules: `session`, `tool`, `provider`, `permission`, `project`, `storage`, `config`, `mcp`, `lsp`, `pty`, and similar folders each own their schemas, services, tests, and adapters.
- Prefer the existing namespace/object style for exported domain APIs. Examples include `Session`, `SessionStatus`, `SessionSummary`, `Provider`, `Config`, and `Database`.
- Keep command boundary code in `src/cli/cmd/*`; commands should parse options and call domain modules rather than embedding business logic.
- Keep prompt text in `.txt` files under the owning module, such as `src/session/prompt/*.txt` and `src/agent/prompt/*.txt`.

## CLI Entrypoint

- `src/index.ts` wires yargs commands, process-level logging, environment markers, and one-time database migration.
- New commands should be separate `*Command` exports under `src/cli/cmd` and registered in `src/index.ts`.
- Reuse `UI`, `Log`, `Installation`, and existing command helpers instead of printing or parsing ad hoc.
- Keep long-running or interactive flows in domain modules or TUI components; avoid growing the top-level entrypoint beyond command registration and global middleware.

## Session And Agent Runtime

- Session code is split by responsibility: `session/index.ts` for public operations, `message-v2.ts` for message storage/shape, `processor.ts` and `llm.ts` for model execution, `compaction.ts`, `retry.ts`, `revert.ts`, `summary.ts`, and `todo.ts` for targeted behavior.
- Add or change IDs and payload schemas in `session/schema.ts` so routes, storage, app, and SDK agree.
- Preserve event/status propagation through `bus`, `server/event.ts`, and `SessionStatus` when changing runtime state.
- Tests under `packages/opencode/test/session` are the trusted examples for session behavior.

## Tools And Permissions

- Tool definitions belong in `src/tool/*`; shared contracts live in `tool.ts` and individual tools such as `bash.ts`, `read.ts`, `write.ts`, `edit.ts`, `grep.ts`, and `webfetch.ts` implement behavior.
- Permission behavior crosses `permission`, `tool`, plugin hooks, and server routes. Search for the permission ID/action before changing prompts or defaults.
- Tests under `packages/opencode/test/tool` and `packages/opencode/test/permission*` cover path traversal, arity, truncation, external directories, and permission flow. Add focused tests there for behavior changes.

## Config And Project State

- Config loading and migration lives in `src/config/config.ts`, `src/config/markdown.ts`, `src/config/paths.ts`, and `src/config/tui*.ts`.
- Project and worktree state live in `src/project` and `src/worktree`; do not duplicate project discovery in CLI or UI callers.
- When adding config fields, update schemas, migration/default handling, docs/tests, and any SDK/API exposure together.

## Effect Usage

- Some newer modules, especially `account`, use `effect` with `Effect.fn`, `Effect.gen`, `Option`, and tagged errors. Continue the local effect style inside those modules.
- Do not convert unrelated promise-based modules to Effect as part of a small change.

## Anti-Patterns

- Do not pass raw route/query/config payloads deep into services; validate at the boundary and pass typed values.
- Do not bypass `Session`, `Database`, `Config`, or `Project` public APIs for convenience.
- Do not add broad `try`/`catch` wrappers around command or service code unless translating an expected error shape.

