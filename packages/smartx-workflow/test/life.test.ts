import { describe, expect, test } from "bun:test"
import { gate } from "../src/gate.js"
import { cleanDirt, view } from "../src/life.js"
import { doneAnalysis, doneChart, requestChart, freshAnalysis } from "../src/state.js"

describe("smartx lifecycle view", () => {
  test("keeps boot and refresh modes separate while waiting for baseline", () => {
    expect(view({ baselineMode: "boot" }).life).toBe("idle")
    expect(view({ baselineMode: "refresh" }).life).toBe("refreshing")
    expect(view({ baselineMode: "final" }).life).toBe("finalizing")
  })

  test("keeps busy while baseline pieces are still moving", () => {
    expect(view({ analysis: freshAnalysis("f:/repo") }).life).toBe("booting")
    expect(view({ analysis: doneAnalysis("f:/repo"), chart: requestChart("f:/repo") }).life).toBe("booting")
    expect(view({ analysis: doneAnalysis("f:/repo"), chart: doneChart("f:/repo"), pendingSave: { kind: "analysis", workspacePath: "f:/repo", worktreePath: "f:/repo", summaryItems: [], summaryText: "" } }).life).toBe("booting")
  })

  test("marks ready only after baseline is complete and worktree is clean", () => {
    expect(
      view({
        analysis: doneAnalysis("f:/repo"),
        chart: doneChart("f:/repo"),
        dirtyState: cleanDirt(),
      }).life,
    ).toBe("ready")

    expect(
      view({
        analysis: doneAnalysis("f:/repo"),
        chart: doneChart("f:/repo"),
        dirtyState: { state: "dirty", updated: 1, reason: "write" },
      }).life,
    ).toBe("dirty")
  })

  test("keeps dirty lifecycle for project memory while baseline is disabled", () => {
    const state = view({ baseline: false, dirtyState: { state: "dirty", updated: 1, reason: "write" } })
    expect(state.life).toBe("dirty")
    expect(state.dirtyState.state).toBe("dirty")
    expect(view({ baseline: false, dirtyState: cleanDirt() }).life).toBe("ready")
  })

  test("does not hard gate backtests while lifecycle prompts are pending", () => {
    const memory = { hasProjectState: true, hasRestoredState: true, needsSave: false }
    const analysis = doneAnalysis("f:/repo")
    const chart = doneChart("f:/repo")

    expect(gate(view({ projectMemory: memory }), "backtest")).toBe("")
    expect(gate(view({ analysis: freshAnalysis("f:/repo"), projectMemory: memory }), "backtest")).toBe("")
    expect(gate(view({ baselineMode: "refresh", projectMemory: memory }), "backtest")).toBe("")
    expect(gate(view({ baselineMode: "final", projectMemory: memory }), "backtest")).toBe("")
    expect(gate(view({ analysis, chart }), "backtest")).toBe("")
    expect(gate(view({ analysis, chart, projectMemory: memory }), "backtest")).toBe("")
    expect(
      gate(
        view({
          analysis,
          chart,
          dirtyState: { state: "dirty", updated: 1, reason: "write" },
          projectMemory: memory,
        }),
        "backtest",
      ),
    ).toBe("")
  })
})
