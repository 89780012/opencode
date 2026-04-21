import { describe, expect, test } from "bun:test"
import { after, before, fresh } from "../src/state.js"

describe("smartx workflow state", () => {
  test("starts in discover", () => {
    const flow = fresh("s1", "build a SmartX strategy", "2026-04-20T00:00:00Z")
    expect(flow.stage).toBe("discover")
    expect(flow.pending).toBe("discover")
  })

  test("moves to implement after required reads", () => {
    let flow = fresh("s1", "build a SmartX strategy", "2026-04-20T00:00:00Z")
    flow = before(flow, "read", { filePath: ".project-state/workflow.json" }, "2026-04-20T00:00:01Z")
    flow = before(flow, "read", { filePath: "README.md" }, "2026-04-20T00:00:02Z")
    flow = before(flow, "read", { filePath: "references/pythonApi.md" }, "2026-04-20T00:00:03Z")
    flow = before(flow, "read", { filePath: "start.py" }, "2026-04-20T00:00:04Z")
    expect(flow.stage).toBe("plan")
    expect(flow.pending).toBe("implement")
  })

  test("moves to verify after edit", () => {
    let flow = fresh("s1", "build a SmartX strategy", "2026-04-20T00:00:00Z")
    flow = before(flow, "read", { filePath: ".project-state/workflow.json" }, "2026-04-20T00:00:01Z")
    flow = before(flow, "read", { filePath: "README.md" }, "2026-04-20T00:00:02Z")
    flow = before(flow, "read", { filePath: "references/pythonApi.md" }, "2026-04-20T00:00:03Z")
    flow = before(flow, "read", { filePath: "start.py" }, "2026-04-20T00:00:04Z")
    flow = before(flow, "write", { filePath: "start.py" }, "2026-04-20T00:00:05Z")
    expect(flow.stage).toBe("verify")
    expect(flow.pending).toBe("verify")
  })

  test("moves to handoff after successful logs and state writeback", () => {
    let flow = fresh("s1", "build a SmartX strategy", "2026-04-20T00:00:00Z")
    flow = before(flow, "read", { filePath: ".project-state/workflow.json" }, "2026-04-20T00:00:01Z")
    flow = before(flow, "read", { filePath: "README.md" }, "2026-04-20T00:00:02Z")
    flow = before(flow, "read", { filePath: "references/pythonApi.md" }, "2026-04-20T00:00:03Z")
    flow = before(flow, "read", { filePath: "start.py" }, "2026-04-20T00:00:04Z")
    flow = before(flow, "write", { filePath: "start.py" }, "2026-04-20T00:00:05Z")
    flow = after(flow, "smartx_logs", {}, { isError: false, content: [{ type: "text", text: "strategy started and logs are healthy" }] }, "2026-04-20T00:00:06Z")
    expect(flow.stage).toBe("handoff")
    expect(flow.pending).toBe("handoff")
    flow = before(flow, "write", { filePath: ".project-state/progress.md" }, "2026-04-20T00:00:07Z")
    expect(flow.pending).toBe("")
  })

  test("returns to implement when logs fail", () => {
    let flow = fresh("s1", "build a SmartX strategy", "2026-04-20T00:00:00Z")
    flow = before(flow, "read", { filePath: ".project-state/workflow.json" }, "2026-04-20T00:00:01Z")
    flow = before(flow, "read", { filePath: "README.md" }, "2026-04-20T00:00:02Z")
    flow = before(flow, "read", { filePath: "references/pythonApi.md" }, "2026-04-20T00:00:03Z")
    flow = before(flow, "read", { filePath: "start.py" }, "2026-04-20T00:00:04Z")
    flow = before(flow, "write", { filePath: "start.py" }, "2026-04-20T00:00:05Z")
    flow = after(flow, "smartx_logs", {}, { isError: false, content: [{ type: "text", text: "Traceback error while starting strategy" }] }, "2026-04-20T00:00:06Z")
    expect(flow.stage).toBe("implement")
    expect(flow.pending).toBe("verify")
    expect(flow.verify.ok).toBe(false)
  })
})
