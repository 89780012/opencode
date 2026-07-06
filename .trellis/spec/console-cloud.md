# Console Cloud

## Package Roles

The console stack is split so frontend, domain/data, functions, mail, and infrastructure resources can evolve independently.

Reference files:
- `packages/console/app/package.json`
- `packages/console/app/src`
- `packages/console/core/src/account.ts`
- `packages/console/core/src/context.ts`
- `packages/console/core/src/drizzle/index.ts`
- `packages/console/core/src/schema/*.sql.ts`
- `packages/console/function/src/auth.ts`
- `packages/console/function/src/log-processor.ts`
- `packages/console/resource`
- `packages/console/mail`

## Core Domain Pattern

- `packages/console/core/src` exports domain namespaces such as `Account`, `Actor`, `Billing`, `Key`, `Model`, `Provider`, `Subscription`, `User`, and `Workspace`.
- Keep domain methods in their owning namespace file and database schemas in `src/schema/*.sql.ts`.
- Use `Context` for request/user/workspace context instead of threading unstructured auth data through service functions.
- Put shared data helpers in `src/util` or `src/drizzle` only when multiple domains use them.

## Functions

- `packages/console/function` should define Hono/function entrypoints and call `@opencode-ai/console-core` for business logic.
- Auth, log processing, and API handlers should validate inputs at the boundary and pass typed data into core services.
- Do not duplicate billing, account, workspace, provider, or key logic from `console-core` inside a function handler.

## Frontend App

- `packages/console/app` is a Solid/SolidStart app. Keep cloud UI state and routing there; keep reusable design primitives in `packages/ui`.
- The console app imports `@opencode-ai/console-core`, `@opencode-ai/console-mail`, and `@opencode-ai/console-resource` where package boundaries already allow it.
- Keep generated or deployment config output under existing build scripts rather than committing ad hoc runtime artifacts.

## Resources And Mail

- `packages/console/resource` owns Cloudflare/SST resource typing and bindings.
- `packages/console/mail` owns email templates and preview tooling; do not build email HTML strings in function handlers.

## Verification

- Run package-local type checks: `cd packages/console/core; bun typecheck`, `cd packages/console/function; bun typecheck`, or `cd packages/console/app; bun typecheck`.
- Use SST shell scripts from `packages/console/core/package.json` for database/model/limit maintenance when touching those scripts.

## Anti-Patterns

- Do not put raw database access in console frontend code.
- Do not bypass `Context` when a core service needs actor/workspace/account information.
- Do not create function-local copies of Drizzle schemas or shared constants.

