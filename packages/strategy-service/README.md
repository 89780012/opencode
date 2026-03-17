# strategy-service

Windows-first Go service for `strategy-front`.

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

## Build EXE

Build a Windows executable with embedded frontend assets:

```bash
bun ./packages/strategy-service/script/build.ts
```

Output:

```bash
packages/strategy-service/dist/windows-x64/strategy-service.exe
```

The script currently builds `windows-x64` only, but the target matrix lives in `packages/strategy-service/script/build.ts` so more platforms can be added without changing the overall flow.

## Config

- `HOST` default: `127.0.0.1`
- `PORT` default: `5000`
- `STRATEGY_FRONT_DIST` default: `../strategy-front/dist`

## Install strategy

- `node` and `npm`: prefer `winget`, then `scoop`, then `choco`
- `opencode`: prefer `npm install -g opencode-ai`, then `scoop`, then `choco`

If the install command exits successfully but the binary is still missing, the task is marked as failed and the tool remains in a failed or missing state.
