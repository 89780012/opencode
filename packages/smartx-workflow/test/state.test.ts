import { describe, expect, test } from "bun:test"
import {
  doneAnalysis,
  fresh,
  freshAnalysis,
  items,
  note,
  requestAnalysis,
  reviewState,
  seen,
  touch,
  validAnalysis,
  wantsFinal,
} from "../src/state.js"

describe("smartx workflow state", () => {
  test("tracks smartx_start aliases", () => {
    const flow = touch(fresh("s1"), "smartx-start")
    expect(flow.pendingLogCount).toBe(1)
  })

  test("tracks smartx_logs", () => {
    const flow = touch({ ...fresh("s1"), pendingLogCount: 1 }, "smartx_logs")
    expect(flow.pendingLogCount).toBe(0)
  })

  test("keeps smartx_log as a legacy alias", () => {
    const flow = touch({ ...fresh("s1"), pendingLogCount: 1 }, "smartx_log")
    expect(flow.pendingLogCount).toBe(0)
  })

  test("counts unmatched starts", () => {
    const flow = touch(touch(fresh("s1"), "smartx_start"), "smartx_start")
    expect(flow.pendingLogCount).toBe(2)
  })

  test("does not underflow when smartx_logs comes first", () => {
    const flow = touch(fresh("s1"), "smartx_logs")
    expect(flow.pendingLogCount).toBe(0)
  })

  test("tracks smartx-develop skill", () => {
    const flow = touch(fresh("s1"), { tool: "skill", args: { name: "smartx-develop" } })
    expect(flow.pendingDebugCount).toBe(1)
  })

  test("tracks smartx-debug skill", () => {
    const flow = touch({ ...fresh("s1"), pendingDebugCount: 1 }, { tool: "skill", args: { name: "smartx-debug" } })
    expect(flow.pendingDebugCount).toBe(0)
  })

  test("does not underflow when smartx-debug comes first", () => {
    const flow = touch(fresh("s1"), { tool: "skill", args: { name: "smartx-debug" } })
    expect(flow.pendingDebugCount).toBe(0)
  })

  test("ignores unrelated tools", () => {
    const flow = fresh("s1")
    expect(touch(flow, "read")).toBe(flow)
    expect(seen("read")).toBe(false)
    expect(touch(flow, { tool: "skill", args: { name: "other" } })).toBe(flow)
    expect(seen({ tool: "skill", args: { name: "other" } })).toBe(false)
  })

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

  test("builds the log reminder", () => {
    expect(note({ ...fresh("s1"), pendingLogCount: 2 })).toContain("smartx_logs")
    expect(note({ ...fresh("s1"), pendingLogCount: 2 })).toContain("2")
  })

  test("builds the debug reminder", () => {
    expect(note({ ...fresh("s1"), pendingDebugCount: 2 })).toContain("smartx-debug")
    expect(note({ ...fresh("s1"), pendingDebugCount: 2 })).toContain("2")
  })
})
