# strategy-service

Cross-platform Go service for `strategy-front`, with Windows-first install flows.

## What it does

- Serves the built `packages/strategy-front/dist` files with SPA fallback
- Supports embedded frontend assets for single-binary builds
- Keeps runtime selection focused on `opencode` and `git`

## Run

1. Build the frontend:

```bash
cd packages/strategy-front
bun run build
```

2. Start the Go service:

```bash
cd packages/strategy-service
go run ./cmd/service
```

When `../strategy-front/dist` exists, the service serves files from disk.
If that directory is missing, it falls back to embedded assets copied into `internal/asset/frontend/dist/www`.
The legacy `go run .` entry still works, but `cmd/service` is now the canonical CLI entrypoint.

## Desktop Shell

`strategy-service` now has a thin Wails desktop shell under `cmd/desktop`.

The desktop app does not replace the HTTP service. It starts the same Go service on a local random
loopback port, waits for `/api/health`, and then redirects the Wails webview to that local URL.
This keeps the existing `/api`, `/opencode`, and SSE paths unchanged.
On Windows the shell now hides child console windows for managed commands such as `opencode serve`
and tool probing, so opening the desktop app should no longer flash a `cmd` window.

Run the desktop shell from `packages/strategy-service/cmd/desktop`:

```bash
wails dev
```

Build the desktop shell with the repo script:

```bash
bun ./packages/strategy-service/script/build-desktop.ts
```

Wails desktop builds require the Wails CLI, `github.com/wailsapp/wails/v2`, and the native
toolchain for the target OS. Unlike the pure Go service binary, desktop packaging is not a
`CGO_ENABLED=0` cross-build flow.
The build script first tries a local `wails` binary and falls back to
`go run github.com/wailsapp/wails/v2/cmd/wails@v2.11.0 build`.

Options:

```bash
bun ./packages/strategy-service/script/build-desktop.ts --skip-front
bun ./packages/strategy-service/script/build-desktop.ts --clean
```

Any extra args are passed through to `wails build`.

Output is copied to:

```bash
packages/strategy-service/dist/desktop/
```

Build everything in one command:

```bash
bun run package:strategy-service
```

This packages:

- all cross-platform `strategy-service` CLI binaries under `packages/strategy-service/dist/`
- the current host desktop bundle under `packages/strategy-service/dist/desktop/`

Use `bun run package:strategy-service -- --clean` to clear old output first.

The classic CLI flow still works:

```bash
cd packages/strategy-service
go run .
```

Canonical CLI entry:

```bash
cd packages/strategy-service
go run ./cmd/service
```

## Build Binaries

Build all supported binaries with embedded frontend assets:

```bash
bun ./packages/strategy-service/script/build.ts
```

Targets:

```bash
windows-x64
windows-arm64
linux-x64
linux-arm64
darwin-x64
darwin-arm64
```

Output:

```bash
packages/strategy-service/dist/windows-x64/strategy-service.exe
packages/strategy-service/dist/windows-arm64/strategy-service.exe
packages/strategy-service/dist/linux-x64/strategy-service
packages/strategy-service/dist/linux-arm64/strategy-service
packages/strategy-service/dist/darwin-x64/strategy-service
packages/strategy-service/dist/darwin-arm64/strategy-service
packages/strategy-service/dist/SHA256SUMS
packages/strategy-service/dist/manifest.json
```

Build one target only:

```bash
bun ./packages/strategy-service/script/build.ts --target=linux-x64
```

List targets:

```bash
bun ./packages/strategy-service/script/build.ts --list
```

Skip rebuilding the frontend and reuse the existing `packages/strategy-front/dist`:

```bash
bun ./packages/strategy-service/script/build.ts --target=windows-x64 --skip-front
```

Pass `--clean` to remove the full `dist` directory before building.

## Config

- `HOST` default: `127.0.0.1`
- `PORT` default: `5000`
- `STRATEGY_FRONT_DIST` default: `../strategy-front/dist`

## Install strategy

- Startup runtime management now targets only `git` and `opencode`.
- The service first checks configured overrides, then activated builtin runtimes, then system `PATH`.
- Builtin runtimes can be shipped as directories or `.zip` archives under `packages/strategy-service/runtime/<target>/`.
- When a builtin package exists, the service activates it into the user cache directory and uses that path directly.
- `git` is treated as a dependency of `opencode`: system Git is preferred, otherwise builtin Git is injected at runtime.
