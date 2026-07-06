# SDK, Plugin, And Script Packages

## JavaScript SDK

The JS SDK lives in `packages/sdk/js`. Generated clients and types are produced from the OpenCode API schema; handwritten wrappers provide ergonomic entrypoints.

Reference files:
- `packages/sdk/openapi.json`
- `packages/sdk/js/script/build.ts`
- `packages/sdk/js/src/client.ts`
- `packages/sdk/js/src/server.ts`
- `packages/sdk/js/src/index.ts`
- `packages/sdk/js/src/gen/**`
- `packages/sdk/js/src/v2/gen/**`

Rules:
- Do not hand-edit `src/gen/**` or `src/v2/gen/**`.
- Keep handwritten client behavior in `client.ts`, `server.ts`, or `index.ts`.
- Regenerate with `./packages/sdk/js/script/build.ts` after SDK-visible route/schema changes.
- Preserve the `directory` header behavior in `createOpencodeClient`; app and desktop flows depend on it.

## Plugin API

The public plugin contract lives in `packages/plugin/src`.

Reference files:
- `packages/plugin/src/index.ts`
- `packages/plugin/src/tool.ts`
- `packages/plugin/src/shell.ts`
- `packages/plugin/src/example.ts`
- `packages/opencode/src/plugin`
- `packages/opencode/test/plugin`

Rules:
- Treat exported hook names and types as public API. Search all plugin tests and docs before renaming fields.
- Use `tool()` from `plugin/src/tool.ts` for plugin tool definitions so arguments remain Zod-backed.
- Keep shell-related types in `shell.ts`; do not duplicate Bun shell abstractions in plugins.
- Changes to hooks such as `chat.message`, `chat.params`, `permission.ask`, `tool.execute.before`, and auth hooks need core runtime tests.

## Script Package

`packages/script/src/index.ts` centralizes Bun version validation, release channel/version calculation, and team-member loading for release scripts.

Rules:
- Preserve root `packageManager` validation and semver range behavior.
- Prefer `Bun.file()` and Bun shell APIs, as existing script code does.
- Do not copy release channel/version logic into package-local scripts; import or extend `@opencode-ai/script`.
- Treat env vars such as `OPENCODE_CHANNEL`, `OPENCODE_BUMP`, `OPENCODE_VERSION`, and `OPENCODE_RELEASE` as public script inputs.

## Anti-Patterns

- Do not use `any` in public SDK/plugin types unless it matches an existing generated or intentionally extensible boundary.
- Do not patch generated SDK output to make frontend code compile.
- Do not add a package-specific Bun version check that diverges from `@opencode-ai/script`.

