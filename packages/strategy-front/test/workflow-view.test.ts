import { describe, expect, test } from "bun:test"
import type { Workflow } from "../src/api/modules/workbench"
import { bind } from "../src/lib/session-workflow"
import { fallback, terminal, view } from "../src/lib/workflow-view"
import { halt } from "../src/lib/workflow-stop"
import type { WorkbenchReview } from "../src/store/workbench-slice"
import type { BacktestRun } from "../src/types/backtest"

function row(value: Partial<Workflow> = {}): Workflow {
  return {
    id: "workflow-1",
    workspacePath: "workspace-a",
    sessionId: "session-a",
    codeRevision: "code-1",
    stage: "review",
    state: "running",
    reviewRound: 1,
    reviewEnabled: true,
    debugEnabled: true,
    backtestEnabled: true,
    revision: 1,
    createdAt: 1,
    updatedAt: 1,
    ...value,
  }
}

function review(value: Partial<WorkbenchReview> = {}): WorkbenchReview {
  return {
    id: "review-1",
    workspacePath: "workspace-a",
    worktreePath: "workspace-a",
    reviewId: "review-call-1",
    sessionId: "session-a",
    state: "passed",
    summary: "审查通过",
    items: [],
    suggestions: [],
    updatedAt: 1,
    ...value,
  }
}

describe("workflow presentation", () => {
  test("keeps transient workflow progress out of conversation results", () => {
    expect(terminal("pending")).toBeUndefined()
    expect(terminal("running")).toBeUndefined()
    expect(terminal("done")).toBe("done")
    expect(terminal("error")).toBe("error")
  })

  test("binds each run to its last tagged message and exact reviewer id", () => {
    const rows = bind(
      [
        { id: "user-1", role: "user" },
        { id: "assistant-1", role: "assistant", parentID: "user-1" },
        { id: "user-2", role: "user" },
        { id: "assistant-2", role: "assistant", parentID: "user-2" },
      ],
      {
        "user-1": [{ type: "text", metadata: { smartxWorkflowId: "workflow-1" } }],
        "assistant-1": [
          {
            id: "review-call-1",
            type: "tool",
            tool: "task",
            state: { input: { subagent_type: "strategy-reviewer" } },
          },
        ],
        "user-2": [{ type: "text", metadata: { smartxWorkflowId: "workflow-2" } }],
        "assistant-2": [
          {
            id: "review-call-2",
            type: "tool",
            tool: "task",
            state: { input: { subagent_type: "strategy-reviewer" } },
          },
        ],
      },
      ["workflow-1", "workflow-2"],
    )

    expect(rows["workflow-1"]).toEqual({ after: "group:user-1", reviewId: "review-call-1" })
    expect(rows["workflow-2"]).toEqual({ after: "group:user-2", reviewId: "review-call-2" })
  })

  test("discovers a tagged historical run even when only the latest snapshot is known", () => {
    expect(
      bind(
        [{ id: "user-old", role: "user" }],
        { "user-old": [{ type: "text", metadata: { smartxWorkflowId: "workflow-old" } }] },
        ["workflow-new"],
      ),
    ).toEqual({
      "workflow-new": { after: "", reviewId: "" },
      "workflow-old": { after: "item:user-old", reviewId: "" },
    })
    expect(fallback(null)).toEqual({
      title: "历史自动流程",
      detail: "该流程的历史状态快照未加载，执行结果未知。",
      state: "neutral",
    })
  })

  test("keeps later stages pending when review fails", () => {
    expect(view(row({ stage: "review", state: "failed" }), review({ state: "failed" }))).toEqual({
      failed: "review",
      review: "error",
      debug: "pending",
      backtest: "pending",
    })
  })

  test("keeps backtest pending when debug fails", () => {
    expect(view(row({ stage: "debug", state: "failed", debugId: "debug-1" }), review())).toEqual({
      failed: "debug",
      review: "done",
      debug: "error",
      backtest: "pending",
    })
  })

  test("marks only backtest failed when its persisted run fails", () => {
    const backtest = { id: "backtest-1", status: "failed" } as BacktestRun
    expect(
      view(
        row({ stage: "backtest", state: "failed", debugId: "debug-1", backtestId: "backtest-1" }),
        review(),
        backtest,
      ),
    ).toEqual({
      failed: "backtest",
      review: "done",
      debug: "done",
      backtest: "error",
    })
  })

  test("falls back to review facts for legacy done failures", () => {
    expect(view(row({ stage: "done", state: "failed" }), review({ state: "failed" }))).toMatchObject({
      failed: "review",
      review: "error",
      debug: "pending",
      backtest: "pending",
    })
  })

  test("starts abort before workflow cancellation and does not await cancellation", async () => {
    const calls: string[] = []
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const stopping = halt(
      async () => {
        calls.push("abort")
      },
      async () => {
        calls.push("cancel")
        await pending
      },
    )

    await stopping
    await Promise.resolve()
    expect(calls).toEqual(["abort", "cancel"])
    release()
  })
})
