import { describe, expect, test } from "bun:test"
import { enabledStages, nextStage } from "../src/pipeline.js"
import type { Run } from "../src/types.js"

const run = (input: Partial<Run> = {}): Run => ({
  id: "workflow-1",
  workspacePath: "f:/repo",
  sessionId: "s1",
  codeRevision: "1",
  stage: "review",
  state: "passed",
  reviewRound: 1,
  debugId: "",
  backtestId: "",
  reviewEnabled: true,
  debugEnabled: true,
  backtestEnabled: true,
  summary: "",
  error: "",
  revision: 1,
  createdAt: 1,
  updatedAt: 1,
  ...input,
})

describe("workflow stage plan", () => {
  const cases = [
    { name: "review", review: true, debug: false, backtest: false, stages: ["review"] },
    { name: "debug", review: false, debug: true, backtest: false, stages: ["debug"] },
    { name: "backtest", review: false, debug: false, backtest: true, stages: ["backtest"] },
    { name: "review and debug", review: true, debug: true, backtest: false, stages: ["review", "debug"] },
    { name: "review and backtest", review: true, debug: false, backtest: true, stages: ["review", "backtest"] },
    { name: "debug and backtest", review: false, debug: true, backtest: true, stages: ["debug", "backtest"] },
    {
      name: "review, debug, and backtest",
      review: true,
      debug: true,
      backtest: true,
      stages: ["review", "debug", "backtest"],
    },
  ] as const

  cases.forEach((item) => {
    test(`builds the ${item.name} plan`, () => {
      expect(enabledStages(item)).toEqual(item.stages)
    })
  })

  test("uses only the switches frozen on the Run when selecting the next stage", () => {
    expect(nextStage(run())).toEqual({ stage: "debug", state: "requested" })
    expect(nextStage(run({ debugEnabled: false }))).toEqual({ stage: "backtest", state: "requested" })
    expect(nextStage(run({ debugEnabled: false, backtestEnabled: false }))).toEqual({
      stage: "done",
      state: "passed",
    })
    expect(nextStage(run({ stage: "debug" }))).toEqual({ stage: "backtest", state: "requested" })
    expect(nextStage(run({ stage: "debug", backtestEnabled: false }))).toEqual({ stage: "done", state: "passed" })
  })
})
