import { describe, expect, test } from "bun:test"
import { review, task } from "../src/lib/session-review"

describe("session review display", () => {
  test("hides the internal reviewer id and structured prompt", () => {
    expect(task("strategy-reviewer", "Review strategy implementation")).toEqual({
      title: "策略审查",
      review: true,
    })
  })

  test("replaces reviewer output with a Chinese workflow status", () => {
    const status = review(
      [{ agent: "strategy-reviewer", time: { completed: 1 } }],
      [{ type: "subtask", agent: "strategy-reviewer" }],
    )
    expect(status).toEqual({
      done: true,
      title: "已调用 task",
      meta: "策略审查",
      detail: "审查结果正在保存，主智能体将按审查意见修复代码。",
    })
    expect(JSON.stringify(status)).not.toContain("strategy-reviewer")
  })
})
