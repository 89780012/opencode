# Testing And Quality

## Command Rules

- Never run tests from the repository root. The root `test` script intentionally fails with `do not run tests from root`.
- Always run `bun typecheck` from the package directory you changed.
- Use targeted tests first, then broaden only when the change affects shared contracts or multiple packages.

Reference files:
- `package.json`
- `packages/opencode/package.json`
- `packages/app/package.json`
- `packages/console/core/package.json`
- `packages/opencode/test`
- `packages/app/src/**/*.test.ts`
- `packages/ui/src/**/*.test.ts`

## OpenCode Core Tests

- Use `packages/opencode/test/<domain>` for core behavior. Examples include `session`, `tool`, `provider`, `server`, `storage`, `config`, `permission`, `project`, `mcp`, `lsp`, and `util`.
- Run focused tests from `packages/opencode`, for example `bun test test/session/session.test.ts`.
- Prefer real implementations and fixtures over mocks. Existing tests cover filesystem, storage, tool execution, and server routes directly.

## App Tests

- Run app tests with Happydom preload from `packages/app`: `bun test --preload ./happydom.ts ./src/context/command.test.ts`.
- Keep tests near the feature under `src`, such as context tests beside context files and utility tests beside utility files.
- Use existing helpers under `packages/app/src/testing` before adding new test scaffolding.

## Console Tests And Type Checks

- Console packages lean on type checks and domain/service boundaries. Run the package-local `bun typecheck` command for the console package you changed.
- Use SST shell/database scripts only when the change requires cloud resource context; do not run destructive maintenance scripts for ordinary type checks.

## Style Checks

- Follow root Prettier settings: no semicolons and `printWidth` 120.
- Keep code consistent with `AGENTS.md`: short identifiers, `const`, early returns, no unnecessary destructuring, and minimal `try`/`catch`.
- Prefer functional array methods and type guards over manual loops when they fit the local code.

## Cross-Layer Verification

For changes that cross API, SDK, app, and storage layers:

- Run the owning package's focused tests.
- Regenerate the SDK when route/OpenAPI schemas changed.
- Typecheck every touched package that imports the changed contract.
- Search for operation IDs, event names, config keys, and schema fields across the repo.

## Anti-Patterns

- Do not duplicate implementation logic inside tests to calculate the same result.
- Do not add broad mocks for filesystem, database, or SDK behavior when existing tests exercise real code.
- Do not fix unrelated failing tests as part of a focused spec or feature change; report them separately.

