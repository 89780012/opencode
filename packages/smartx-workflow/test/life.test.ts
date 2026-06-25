import { describe, expect, test } from "bun:test"
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
})
