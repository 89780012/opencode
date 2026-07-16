# OpenCode Trellis Spec

This spec describes the current OpenCode monorepo. Use it before coding so changes follow the repository's real package boundaries, runtime layers, and test conventions.

## Guides

| Guide | Use When |
| --- | --- |
| [Monorepo](./monorepo.md) | Choosing packages, commands, imports, and generated boundaries |
| [OpenCode Core](./opencode-core.md) | Editing `packages/opencode` CLI, server, agent, session, tool, provider, storage, or config code |
| [Server API](./server-api.md) | Adding or changing Hono routes, OpenAPI metadata, validators, or SDK-visible API shapes |
| [Storage And Data](./storage-data.md) | Editing Drizzle schemas, local SQLite storage, cloud database schemas, IDs, or migrations |
| [Solid Frontend](./solid-frontend.md) | Editing `packages/app`, `packages/ui`, desktop shells, or Solid components/contexts |
| [Console Cloud](./console-cloud.md) | Editing `packages/console/*`, auth, billing, workspace services, SST resources, or functions |
| [SDK Plugin Script](./sdk-plugin-script.md) | Editing generated SDK, plugin APIs, release scripts, or shared script helpers |
| [Testing And Quality](./testing-quality.md) | Choosing verification commands, test style, mocks, type checks, or formatting |
| [Strategy Workbench](./strategy-workbench.md) | Editing the strategy workbench session requirements API, persistence, or editor synchronization |
| [Strategy Workflow Config](./strategy-workflow-config.md) | Editing the installation-level workspace analysis and flowchart switch across strategy packages |
| [SmartX Python Runtime](./smartx-python-runtime.md) | Editing SmartX Python execution, agent routing, shell policy, or related workbench rendering |

## Repository Map

- `packages/opencode` is the product core: CLI entrypoint, TUI, HTTP server, agent/session runtime, tools, providers, permission flow, project state, and local storage.
- `packages/app` is the Solid web UI used directly and by desktop shells; it consumes `@opencode-ai/sdk` and local app contexts.
- `packages/ui` holds reusable Solid UI primitives and tests shared by app-facing packages.
- `packages/desktop` and `packages/desktop-electron` wrap the app for desktop runtimes; keep platform code isolated there.
- `packages/console/*` owns the cloud console stack: frontend app, core domain/data package, function handlers, mail templates, and resource bindings.
- `packages/sdk/js` is generated from `packages/sdk/openapi.json` plus small handwritten wrappers; do not hand-edit generated files.
- `packages/plugin` exposes the public plugin contract and helper builders.
- `packages/script` centralizes release/runtime script helpers and Bun version checks.
- `packages/slack`, `packages/smartx-workflow`, `packages/strategy-*`, `packages/web`, and `packages/docs` are separate apps/services; inspect their local `package.json`, `README.md`, and tests before editing.

## Global Rules

- Run commands from the package you changed. The root `test` script intentionally fails, and root tests are guarded against use.
- Run `bun typecheck` from package directories, not `tsc` directly.
- Prefer Bun APIs and workspace package imports already used in the target package.
- Use the root style guide from `AGENTS.md`: short names, `const`, early returns, no unnecessary destructuring, no new `any` unless unavoidable at a generated/API boundary.
- Search before changing constants, config keys, route operation IDs, event names, schema fields, generated artifacts, or public plugin/SDK types.
