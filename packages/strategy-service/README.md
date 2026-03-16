# strategy-service

Windows-first Go service for `strategy-front`.

## What it does

- Serves the built `packages/strategy-front/dist` files with SPA fallback
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

## Config

- `HOST` default: `127.0.0.1`
- `PORT` default: `4096`
- `STRATEGY_FRONT_DIST` default: `../strategy-front/dist`

## Install strategy

- `node` and `npm`: prefer `winget`, then `scoop`, then `choco`
- `opencode`: prefer `npm install -g opencode-ai`, then `scoop`, then `choco`

If the install command exits successfully but the binary is still missing, the task is marked as failed and the tool remains in a failed or missing state.
