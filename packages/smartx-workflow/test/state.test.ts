import { describe, expect, test } from "bun:test"
import {
  doneAnalysis,
  freshAnalysis,
  items,
  requestAnalysis,
  reviewState,
  validAnalysis,
  wantsFinal,
} from "../src/state.js"

describe("smartx workflow state", () => {
  test("validates workspace analysis by state", () => {
    expect(validAnalysis(requestAnalysis("f:/repo"))).toBe(false)
    expect(validAnalysis(freshAnalysis("f:/repo"))).toBe(true)
    expect(validAnalysis(doneAnalysis("f:/repo"))).toBe(true)
  })

  test("parses workspace analysis JSON items", () => {
    expect(items('<task_result>["use grid trading","missing exit rule"]</task_result>')).toEqual([
      "use grid trading",
      "missing exit rule",
    ])
  })

  test("detects review state variants", () => {
    expect(reviewState("review conclusion: passed")).toBe("passed")
    expect(reviewState("review result: failed")).toBe("failed")
    expect(reviewState("review status: error")).toBe("error")
    expect(reviewState("there are still failed checks")).toBe("failed")
  })

  test("detects final intent variants", () => {
    expect(wantsFinal("final summary")).toBe(true)
    expect(wantsFinal("wrap up")).toBe(true)
    expect(wantsFinal("can we finish now")).toBe(true)
    expect(wantsFinal("keep coding")).toBe(false)
    expect(wantsFinal("不要结束")).toBe(false)
  })
})

