import { describe, expect, test } from "bun:test"
import { action, activeBacktest, backtestKey } from "../src/lib/backtest"
import {
  addBacktest,
  setBacktestActive,
  setBacktestScope,
  setBacktests,
  updateBacktest,
  upsertBacktest,
  workbenchReducer,
} from "../src/store/workbench-slice"
import type { BacktestRun } from "../src/types/backtest"

function run(value: Partial<BacktestRun> = {}): BacktestRun {
  return {
    id: "run-1",
    workspacePath: "workspace-a",
    sessionId: "session-a",
    pluginId: "plugin-a",
    btId: "remote-1",
    status: "running",
    statusCode: 0,
    progress: 0,
    config: {
      startTime: "2026-01-01",
      endTime: "2026-01-31",
      cash: 100000,
      shStockSx: 0,
      shStockMinSx: 0,
      szStockSx: 0,
      szStockMinSx: 0,
      shStockGh: 0,
      szStockGh: 0,
      buyYh: 0,
      sellYh: 0,
      rf: 0,
      slippage: 0,
      isTickMode: false,
      useNewPrice: false,
      interval: "1d",
      closeLog: false,
    },
    result: {},
    summary: {},
    dataFiles: {},
    logPath: "",
    error: "",
    requestKey: "request-1",
    revision: 1,
    startedAt: 1000,
    finishedAt: 0,
    updatedAt: 1000,
    ...value,
  }
}

function scope() {
  return workbenchReducer(
    workbenchReducer(undefined, { type: "test.init" }),
    setBacktestScope({ workspacePath: "workspace-a", sessionId: "session-a" }),
  )
}

describe("workbench backtests", () => {
  test("ignores a stale snapshot from another scope", () => {
    const first = workbenchReducer(scope(), setBacktests({ workspacePath: "workspace-a", sessionId: "session-a", runs: [run()] }))
    const next = workbenchReducer(
      first,
      setBacktestScope({ workspacePath: "workspace-b", sessionId: "session-b" }),
    )
    const stale = workbenchReducer(
      next,
      setBacktests({ workspacePath: "workspace-a", sessionId: "session-a", runs: [run({ progress: 80 })] }),
    )

    expect(stale.backtestPath).toBe("workspace-b")
    expect(stale.backtestSession).toBe("session-b")
    expect(stale.backtests).toEqual([])
  })

  test("keeps history selected and ignores unordered progress", () => {
    const history = run({ id: "history", status: "done", progress: 100, revision: 5, updatedAt: 500 })
    const loaded = workbenchReducer(
      scope(),
      setBacktests({ workspacePath: "workspace-a", sessionId: "session-a", runs: [run(), history] }),
    )
    const selected = workbenchReducer(loaded, setBacktestActive("history"))
    const next = workbenchReducer(
      selected,
      updateBacktest({
        workspacePath: "workspace-a",
        update: {
          id: "run-1",
          workspacePath: "workspace-a",
          sessionId: "session-a",
          status: "running",
          statusCode: 0,
          progress: 42,
          error: "",
          revision: 2,
          updatedAt: 2000,
          hasResult: false,
        },
      }),
    )
    const stale = workbenchReducer(
      next,
      updateBacktest({
        workspacePath: "workspace-a",
        update: {
          id: "run-1",
          workspacePath: "workspace-a",
          sessionId: "session-a",
          status: "running",
          statusCode: 0,
          progress: 90,
          error: "",
          revision: 1,
          updatedAt: 3000,
          hasResult: false,
        },
      }),
    )

    expect(stale.backtestActive).toBe("history")
    expect(stale.backtests.find((item) => item.id === "run-1")?.progress).toBe(42)
    expect(activeBacktest(stale.backtests)?.id).toBe("run-1")
  })

  test("hydrates a terminal event at the same revision", () => {
    const loaded = workbenchReducer(scope(), setBacktests({ workspacePath: "workspace-a", sessionId: "session-a", runs: [run()] }))
    const updated = workbenchReducer(
      loaded,
      updateBacktest({
        workspacePath: "workspace-a",
        update: {
          id: "run-1",
          workspacePath: "workspace-a",
          sessionId: "session-a",
          status: "done",
          statusCode: 0,
          progress: 100,
          error: "",
          revision: 2,
          updatedAt: 2000,
          hasResult: true,
        },
      }),
    )
    const next = workbenchReducer(
      updated,
      upsertBacktest({
        workspacePath: "workspace-a",
        run: run({ status: "done", progress: 100, revision: 2, summary: { total_return: "12.4%" } }),
      }),
    )

    expect(next.backtests[0].summary).toEqual({ total_return: "12.4%" })
  })

  test("keeps newer socket state when the launch response arrives late", () => {
    (["running", "failed"] as const).forEach((status) => {
      const current = run({ status, error: status === "failed" ? "SmartX unavailable" : "", revision: 1 })
      const history = run({ id: "history", status: "done", progress: 100, revision: 2 })
      const loaded = workbenchReducer(
        scope(),
        setBacktests({ workspacePath: "workspace-a", sessionId: "session-a", runs: [current, history] }),
      )
      const selected = workbenchReducer(loaded, setBacktestActive("history"))
      const next = workbenchReducer(
        selected,
        addBacktest({
          workspacePath: "workspace-a",
          run: run({ btId: "", status: "pending", revision: 0, updatedAt: 900 }),
        }),
      )

      expect(next.backtestActive).toBe("run-1")
      expect(next.backtests.find((item) => item.id === "run-1")).toEqual(current)
    })
  })

  test("preserves failed status and creates a compatible request key", () => {
    const failed = run({ status: "failed", error: "SmartX unavailable" })
    expect(failed.status).toBe("failed")
    expect(activeBacktest([failed])).toBeNull()
    expect(backtestKey()).toMatch(/^[0-9a-z-]{10,}$/i)
  })

  test("labels the first run separately from retries and active progress", () => {
    expect(action(null, null, false)).toBe("运行回测")
    expect(action(null, run({ status: "done", progress: 100 }), false)).toBe("重新运行")
    expect(action(null, run({ status: "failed" }), false)).toBe("重试")
    expect(action(run({ status: "pending", progress: 0 }), null, false)).toBe("正在启动")
    expect(action(run({ status: "running", progress: 42.4 }), null, false)).toBe("回测 42%")
    expect(action(run({ status: "running", progress: 42.4 }), run({ status: "done", progress: 100 }), false)).toBe(
      "回测 42%",
    )
    expect(action(null, null, true)).toBe("提交中")
  })
})
