# Storage And Data

## Local Storage

`packages/opencode` uses local SQLite through Drizzle for runtime data and has explicit JSON migration support for older data.

Reference files:
- `packages/opencode/src/storage/db.ts`
- `packages/opencode/src/storage/schema.sql.ts`
- `packages/opencode/src/storage/json-migration.ts`
- `packages/opencode/src/session/session.sql.ts`
- `packages/opencode/src/account/account.sql.ts`
- `packages/opencode/test/storage/db.test.ts`
- `packages/opencode/test/storage/json-migration.test.ts`

## Cloud Storage

The console cloud packages use Drizzle schemas in `packages/console/core/src/schema/*.sql.ts` and database access through `packages/console/core/src/drizzle`.

Reference files:
- `packages/console/core/src/drizzle/index.ts`
- `packages/console/core/src/drizzle/types.ts`
- `packages/console/core/src/schema/account.sql.ts`
- `packages/console/core/src/schema/billing.sql.ts`
- `packages/console/core/src/schema/workspace.sql.ts`

## Schema Rules

- Follow the repository's Drizzle naming style in the target package. Root guidance prefers snake_case field names when adding new Drizzle columns so column names do not need redundant strings.
- Keep schema files named `*.sql.ts` and colocated with the owning domain: `session/session.sql.ts`, `account/account.sql.ts`, or `console/core/src/schema/*.sql.ts`.
- Reuse console helpers from `drizzle/types.ts` for common IDs, timestamps, currency, and workspace columns when editing console schemas.
- Keep ID schemas and brands centralized in domain schema files, such as `session/schema.ts`, provider schema files, and console identifiers.

## Migrations And Compatibility

- Local OpenCode startup runs a one-time JSON-to-SQLite migration from `src/index.ts` when the database marker is missing. Preserve non-interactive progress output for non-TTY cases.
- Search migration tests before changing local storage shape. `json-migration.test.ts` captures compatibility expectations.
- Do not remove or rename persisted fields without checking import/export, session history, SDK consumers, and app state hydration.

## Data Flow

- Route validators and domain schemas should agree on ID and payload shape.
- App state should consume typed SDK/domain responses rather than casting raw payloads.
- Event payload changes must be reflected across `bus`, server event routes, SDK generated types, app contexts, and tests.

## Anti-Patterns

- Do not duplicate SQL table definitions outside `*.sql.ts` files.
- Do not add console database calls directly in console frontend components or function handlers when a `console-core` service exists.
- Do not use local casts to force old persisted JSON into new shapes; add migration/default handling and tests.

