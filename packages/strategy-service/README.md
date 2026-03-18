# strategy-service

Cross-platform Go service for `strategy-front`, with Windows-first install flows.

## What it does

- Serves the built `packages/strategy-front/dist` files with SPA fallback
- Supports embedded frontend assets for single-binary builds
- Exposes `/api/system/tools` for local tool detection
- Exposes install tasks for `node`, `npm`, and `opencode`
- Keeps explicit task states for install success and failure

## Run

1. Build the frontend:

```bash
cd packages/strategy-front
npm run build
```

2. Start the Go service:

```bash
cd packages/strategy-service
go run .
```

When `../strategy-front/dist` exists, the service serves files from disk.
If that directory is missing, it falls back to embedded assets copied into `internal/http/dist/www`.

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

- Auto-install is still Windows-first. Cross-platform binaries can serve the UI and manage existing tools, but one-click install flows have not been generalized beyond the current package-manager strategy yet.
- `node` and `npm`: prefer `winget`, then `scoop`, then `choco`
- `opencode`: prefer `npm install -g opencode-ai`, then `scoop`, then `choco`

If the install command exits successfully but the binary is still missing, the task is marked as failed and the tool remains in a failed or missing state.
