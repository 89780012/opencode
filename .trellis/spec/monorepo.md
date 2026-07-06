# Monorepo

## Workspace Shape

OpenCode is a Bun workspace with packages under `packages/*`, `packages/console/*`, `packages/sdk/js`, and `packages/slack`. The root `package.json` pins `bun@1.3.10`, centralizes dependency versions in `workspaces.catalog`, and exposes convenience scripts only for development orchestration.

Reference files:
- `package.json`
- `bun.lock`
- `packages/opencode/package.json`
- `packages/app/package.json`
- `packages/console/core/package.json`
- `packages/sdk/js/package.json`

## Package Boundaries

- Keep product runtime changes in `packages/opencode` unless the change is strictly UI, SDK, plugin, or cloud-console specific.
- Keep Solid browser UI in `packages/app/src` and reusable primitives in `packages/ui/src`.
- Keep cloud console domain/data logic in `packages/console/core/src`; function entrypoints in `packages/console/function/src` should call core services instead of duplicating domain logic.
- Keep release/versioning helpers in `packages/script/src/index.ts` and scripts under the package that owns the artifact.
- Keep generated SDK output under `packages/sdk/js/src/gen` and `packages/sdk/js/src/v2/gen`; handwritten SDK code belongs in `client.ts`, `server.ts`, `index.ts`, or the generator script.

## Imports

- Follow aliases configured in package-local `tsconfig.json`. `packages/opencode` commonly imports internal modules with `@/...` and relative paths in route/service files.
- Use workspace package names for cross-package APIs, such as `@opencode-ai/sdk`, `@opencode-ai/ui`, `@opencode-ai/util`, and `@opencode-ai/console-core`.
- Do not reach into another package's private `src` files unless that package already exposes the same pattern locally.

## Commands

- Package type checks use package scripts. Examples: `cd packages/opencode; bun typecheck`, `cd packages/app; bun typecheck`, `cd packages/console/core; bun typecheck`.
- Package tests run from their package directory. Examples: `cd packages/opencode; bun test test/session/session.test.ts`, `cd packages/app; bun test --preload ./happydom.ts ./src/context/command.test.ts`.
- Do not run tests from the repo root; `package.json` has `test: echo 'do not run tests from root' && exit 1`.

## Generated Boundaries

- Regenerate the JavaScript SDK with `./packages/sdk/js/script/build.ts` after server API/OpenAPI changes.
- Treat `packages/sdk/js/src/gen/**` and `packages/sdk/js/src/v2/gen/**` as generated. Change the server route/schema metadata or generator, then regenerate.
- Build scripts that produce release artifacts live beside the owning package, such as `packages/sdk/js/script/build.ts` and `packages/strategy-service/script/build.ts`.

## Anti-Patterns

- Do not add repo-root test workflows that bypass the root guard.
- Do not add shared helpers before searching for an existing package-level utility.
- Do not put cloud console persistence logic in the frontend app or function package when `packages/console/core` already owns the domain.
- Do not hand-edit generated SDK files to patch API mismatches.

