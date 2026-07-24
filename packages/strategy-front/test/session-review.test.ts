import { describe, expect, test } from "bun:test"
import { hidden, scope, task } from "../src/lib/session-review"

describe("session review display", () => {
  test("hides the internal reviewer id and structured prompt", () => {
    expect(task("strategy-reviewer", "Review strategy implementation")).toEqual({
      title: "策略审查",
      review: true,
    })
  })

  test("reads the stable workflow identity from synthetic message metadata", () => {
    expect(
      scope([
        {
          type: "text",
          metadata: { smartxWorkflowId: "workflow-1", smartxWorkflowAction: "review" },
        },
      ]),
    ).toBe("workflow-1")
    expect(scope([{ type: "text", metadata: { smartxWorkflowId: "" } }])).toBeUndefined()
  })

  test("hides only the synthetic workflow prompt", () => {
    expect(
      hidden([
        { type: "text", synthetic: true, metadata: { smartxWorkflowId: "workflow-1" } },
        { type: "subtask", agent: "strategy-reviewer" },
      ]),
    ).toBe(true)
    expect(hidden([{ type: "text" }, { type: "tool", agent: "strategy-reviewer" }])).toBe(false)
  })
})
