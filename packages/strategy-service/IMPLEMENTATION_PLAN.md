# Strategy Service Installer Implementation Plan

Goal: build a Windows-first Go service that serves `strategy-front/dist` and exposes tool detection and one-click installation APIs for `node`, `npm`, and `opencode`.

Architecture:
- A standalone Go HTTP service under `packages/strategy-service`.
- Static file hosting with SPA fallback for `strategy-front`.
- `/api/system/*` endpoints for tool status, install kickoff, and task polling.
- In-memory task manager to keep explicit `pending/running/success/failed` states and logs.

Execution:
1. Create the Go module and config/startup flow.
2. Add static hosting with `/api` route isolation.
3. Implement tool detection plus installers for `winget` and `npm`.
4. Expose JSON APIs using the existing frontend envelope shape.
5. Add an installer page in `strategy-front` with polling and failure display.
6. Build the frontend and compile the Go package when the environment allows it.
