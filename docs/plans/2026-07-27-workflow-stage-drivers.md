# Workflow Stage Drivers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate automatic review, debug, and backtest execution while preserving the persisted Workflow Run contract and making settings affect only newly created Runs.

**Architecture:** Add a pure stage-plan module that derives enabled stages and the next persisted transition from the switches frozen on a Run. Keep recovery and Run creation in the idle orchestrator, and move phase-specific behavior into three focused drivers inside `build()` so they can reuse existing dependencies without another large dependency object.

**Tech Stack:** TypeScript, Bun test, OpenCode plugin hooks, strategy-service Workflow Run API.

---

## ADR-001: Separate Stage Execution Inside smartx-workflow

### Status

Accepted

### Context

Review, debug, and backtest are independent capabilities with a fixed optional order. The current `drive()` function implements all three, uses review-centric comments for the whole pipeline, and duplicates next-stage selection with `workspace.ts`. The service, database, HTTP API, and frontend already persist and consume a single Workflow Run.

### Decision

- Keep the persisted Run and its API unchanged.
- Freeze `reviewEnabled`, `debugEnabled`, and `backtestEnabled` when a Run is created; later setting changes apply only to the next Run.
- Centralize stage ordering in `src/pipeline.ts`.
- Keep Run recovery, creation, readiness, terminal handling, and error convergence in the idle orchestrator.
- Split phase behavior into `driveReview`, `driveDebug`, and `driveBacktest`.
- Let the orchestrator continue immediately when a driver advances to another stage; phase drivers do not call each other.

### Consequences

- Review-specific pending/fix/reviewer logic is isolated from direct debug and backtest runs.
- Debug and backtest can be read and tested without traversing review branches.
- The broad persisted state model remains for compatibility and can be tightened in a later cross-package change.
- Stage ordering remains represented in both TypeScript and Go; combination tests protect the contract.

### Alternatives Considered

- Separate persisted tables and APIs per phase: rejected because it expands this refactor into service, migration, and frontend work.
- Move drivers into separate modules with a large dependency interface: rejected because it recreates the hard-to-read `Opt` dependency surface without reuse.

## Task 1: Centralize the Stage Plan

**Files:**

- Create: `packages/smartx-workflow/src/pipeline.ts`
- Create: `packages/smartx-workflow/test/pipeline.test.ts`
- Modify: `packages/smartx-workflow/src/workspace.ts`

1. Add table-driven tests for every non-empty review/debug/backtest switch combination.
2. Add `stages()` and `next()` using the frozen Run switches.
3. Replace the duplicate `workspace.ts` transition helper.
4. Run `bun test test/pipeline.test.ts` from `packages/smartx-workflow`.

## Task 2: Split the Idle Drivers

**Files:**

- Modify: `packages/smartx-workflow/src/hooks.ts`
- Modify: `packages/smartx-workflow/test/automation.test.ts`

1. Add direct-debug and direct-backtest workflow tests with review disabled.
2. Extract `driveReview`, `driveDebug`, and `driveBacktest` as focused closures inside `build()`.
3. Reduce `drive()` to common orchestration and stage dispatch.
4. Ensure a stage transition can continue to the next enabled driver in the same idle pass.
5. Keep frozen switch values on existing Runs; do not re-plan active Runs from current settings.

## Task 3: Verify Contracts

**Files:**

- Test: `packages/smartx-workflow/test/pipeline.test.ts`
- Test: `packages/smartx-workflow/test/automation.test.ts`
- Test: `packages/smartx-workflow/test/analysis.test.ts`

1. Run focused stage and automation tests.
2. Run `bun typecheck` and `bun run build` from `packages/smartx-workflow`.
3. Run the broader analysis test and report unrelated existing failures separately.
4. Run `git diff --check` and search for duplicate next-stage logic.
