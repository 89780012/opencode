import { describe, expect, test } from "bun:test"
import {
  doneAnalysis,
  freshAnalysis,
  items,
  requestAnalysis,
  reviewText,
  validAnalysis,
  wantsBacktest,
  wantsContinue,
  wantsDebug,
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

  test("keeps reviewer reports as plain text", () => {
    expect(reviewText("审查结论：通过\n\n- 风控规则完整")).toBe("审查结论：通过\n\n- 风控规则完整")
    expect(reviewText("<task_result>\n审查结论：未通过\n\n缺少止损\n</task_result>")).toBe(
      "审查结论：未通过\n\n缺少止损",
    )
  })

  test("detects final intent variants", () => {
    expect(wantsFinal("final summary")).toBe(true)
    expect(wantsFinal("wrap up")).toBe(true)
    expect(wantsFinal("can we finish now")).toBe(true)
    expect(wantsFinal("keep coding")).toBe(false)
    expect(wantsFinal("不要结束")).toBe(false)
  })

  test("detects explicit manual workflow stages", () => {
    expect(wantsDebug("帮我调试一下")).toBe(true)
    expect(wantsDebug("不要调试")).toBe(false)
    expect(wantsBacktest("跑一下回测")).toBe(true)
    expect(wantsBacktest("跳过回测")).toBe(false)
    expect(wantsContinue("继续")).toBe(true)
    expect(wantsContinue("继续修改策略")).toBe(false)
    expect(wantsContinue("不要继续")).toBe(false)
  })
})
