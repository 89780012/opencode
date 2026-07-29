# Implementation

1. Update modelchain state and event handling for same-model first recovery, message dedupe, second-other fallback, and retry threshold idempotency.
2. Extend `internal/modelchain/service_test.go` with focused state-machine tests.
3. Remove sticky retry presentation from the workbench message list and add a focused pure-state test.
4. Update `.trellis/spec/strategy-workbench.md` to record the new abnormal-finish contract.
5. Run targeted tests, package-local typechecks/build checks, then full relevant quality gates.

## Validation

- `go test ./internal/modelchain` from `packages/strategy-service`
- `go test ./...`, `go build ./...`, `go vet ./...` from `packages/strategy-service`
- focused frontend test, `bun typecheck`, and `bun run build` from `packages/strategy-front`

## Risk And Rollback Points

- Modelchain event ordering is the highest-risk area; keep all state transitions under the existing mutex and test duplicate events.
- Do not replay the original prompt or abort on first `finish=other`, because either can duplicate tool side effects.
- Do not modify `packages/opencode`; recovery remains in strategy-service and strategy-front.

## Validation Results

- `go test ./internal/modelchain -count=3`: passed.
- `go build ./...` and `go vet ./...`: passed.
- `go test ./...`: unrelated existing `internal/workbench.TestSaveReviewScopesSessionAndWorktree` fails because the worktree filter returns both rows; isolated `-count=3` reproduces it.
- `bun test test/session-status.test.ts`, `bun run typecheck`, and `bun run build` in `packages/strategy-front`: passed.
- Targeted frontend ESLint still reports the existing `react-refresh/only-export-components` violation at `session-message-list.tsx:99`; the new helper and test have no lint errors.
