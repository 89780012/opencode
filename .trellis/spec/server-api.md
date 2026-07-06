# Server API

## Route Shape

OpenCode's API uses Hono plus `hono-openapi`. Routes live in `packages/opencode/src/server/routes/*` and are mounted by `packages/opencode/src/server/server.ts`.

Reference files:
- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/error.ts`
- `packages/opencode/src/server/routes/session.ts`
- `packages/opencode/src/server/routes/config.ts`
- `packages/opencode/src/server/routes/provider.ts`
- `packages/opencode/src/server/routes/file.ts`
- `packages/sdk/openapi.json`

## Route Contract

- Build route modules as lazy Hono apps when following existing route files, for example `export const SessionRoutes = lazy(() => new Hono()...)`.
- Every SDK-visible endpoint should have `describeRoute` metadata with stable `operationId`, summary/description, response schema, and `errors(...)` entries where applicable.
- Use `validator("param" | "query" | "json", z.object(...))` at the route boundary and read validated data with `c.req.valid(...)`.
- Prefer schemas exported by domain modules, such as `Session.Info`, `SessionID`, `MessageID`, `ProviderID`, and `ModelID`, instead of re-declaring route-local shapes.
- Return JSON with `c.json(...)`; use `hono/streaming` and server event helpers only for streaming endpoints.

## OpenAPI And SDK Coupling

- Route `operationId` values drive generated SDK method names. Search the SDK and app before renaming any operation ID.
- When changing route params, query fields, response schemas, or event payloads, regenerate the JS SDK with `./packages/sdk/js/script/build.ts`.
- Check `packages/app` and desktop shells for client usage through `@opencode-ai/sdk` after API changes.

## Errors

- Use `packages/opencode/src/server/error.ts` helpers for documented HTTP errors instead of inventing per-route error response shapes.
- Keep domain-level not-found/invalid-state logic in services where possible, then surface documented status codes at the route boundary.
- Do not leak internal exception objects into JSON responses.

## Cross-Layer Checklist

When adding or changing a route:

- Update the domain schema/service first.
- Add route validation and OpenAPI metadata.
- Regenerate `packages/sdk/js` if the public contract changes.
- Update app/client callers and tests that depend on the SDK shape.
- Add focused route or domain tests under `packages/opencode/test/server` or the owning domain test folder.

## Anti-Patterns

- Do not accept unvalidated `c.req.query()`, `c.req.param()`, or raw JSON for SDK-visible routes.
- Do not create duplicate Zod schemas when an ID or info schema already exists in the domain module.
- Do not manually patch `packages/sdk/openapi.json` or generated SDK code for a route metadata mistake.

