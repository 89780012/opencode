import { describe, expect, test } from "bun:test"
import { fresh, note, seen, touch } from "../src/state.js"

describe("smartx workflow state", () => {
  test("tracks smartx_start aliases", () => {
    const flow = touch(fresh("s1"), "smartx-start")
    expect(flow.logs).toBe(1)
  })

  test("tracks smartx_logs", () => {
    const flow = touch({ ...fresh("s1"), logs: 1 }, "smartx_logs")
    expect(flow.logs).toBe(0)
  })

  test("keeps smartx_log as a legacy alias", () => {
    const flow = touch({ ...fresh("s1"), logs: 1 }, "smartx_log")
    expect(flow.logs).toBe(0)
  })

  test("counts unmatched starts", () => {
    const flow = touch(touch(fresh("s1"), "smartx_start"), "smartx_start")
    expect(flow.logs).toBe(2)
  })

  test("does not underflow when smartx_logs comes first", () => {
    const flow = touch(fresh("s1"), "smartx_logs")
    expect(flow.logs).toBe(0)
  })

  test("tracks smartx-develop skill", () => {
    const flow = touch(fresh("s1"), { tool: "skill", args: { name: "smartx-develop" } })
    expect(flow.debug).toBe(1)
  })

  test("tracks smartx-debug skill", () => {
    const flow = touch({ ...fresh("s1"), debug: 1 }, { tool: "skill", args: { name: "smartx-debug" } })
    expect(flow.debug).toBe(0)
  })

  test("does not underflow when smartx-debug comes first", () => {
    const flow = touch(fresh("s1"), { tool: "skill", args: { name: "smartx-debug" } })
    expect(flow.debug).toBe(0)
  })

  test("ignores unrelated tools", () => {
    const flow = fresh("s1")
    expect(touch(flow, "read")).toBe(flow)
    expect(seen("read")).toBe(false)
    expect(touch(flow, { tool: "skill", args: { name: "other" } })).toBe(flow)
    expect(seen({ tool: "skill", args: { name: "other" } })).toBe(false)
  })

  test("builds the log reminder", () => {
    expect(note({ ...fresh("s1"), logs: 2 }).includes("smartx_logs")).toBe(true)
    expect(note({ ...fresh("s1"), logs: 2 }).includes("还需要再调用 2 次")).toBe(true)
  })

  test("builds the debug reminder", () => {
    expect(note({ ...fresh("s1"), debug: 2 }).includes("smartx-debug")).toBe(true)
    expect(note({ ...fresh("s1"), debug: 2 }).includes("还需要再调用 2 次")).toBe(true)
  })
})
