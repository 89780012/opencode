import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import { fresh } from "../src/state.js"

type Row = {
  message: string
  extra?: Record<string, unknown>
}

function stub(rows: Row[]) {
  return {
    app: {
      log: async (input: { body: Row }) => {
        rows.push(input.body)
        return true
      },
    },
  } as never
}

function ctx(rows: Row[]) {
  return {
    client: stub(rows),
    project: {} as never,
    directory: "",
    worktree: "",
    serverUrl: new URL("http://localhost:4096"),
    $: {} as never,
  }
}

describe("smartx workflow hooks", () => {
  test("adds a reminder after smartx_start", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(mem.get("s1")?.logs).toBe(1)
    expect(output.system.length).toBe(1)
    expect(output.system[0]).toContain("smartx_logs")
  })

  test("clears the reminder after matching smartx_logs", async () => {
    const mem = new Map([["s1", { ...fresh("s1"), logs: 1 }]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_logs", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(mem.get("s1")?.logs).toBe(0)
    expect(output.system.length).toBe(0)
  })

  test("keeps the reminder until every start is matched", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "c2", args: {} },
      { title: "", output: "", metadata: {} },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_logs", callID: "c3", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(mem.get("s1")?.logs).toBe(1)
    expect(output.system.length).toBe(1)
  })

  test("adds a reminder after loading smartx-develop", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "skill", callID: "c1", args: { name: "smartx-develop" } },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(mem.get("s1")?.debug).toBe(1)
    expect(output.system.length).toBe(1)
    expect(output.system[0]).toContain("smartx-debug")
  })

  test("clears the reminder after loading smartx-debug", async () => {
    const mem = new Map([["s1", { ...fresh("s1"), debug: 1 }]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "skill", callID: "c1", args: { name: "smartx-debug" } },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(mem.get("s1")?.debug).toBe(0)
    expect(output.system.length).toBe(0)
  })

  test("keeps sessions isolated in memory", async () => {
    const mem = new Map<string, ReturnType<typeof fresh>>()
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx-start", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s2", tool: "smartx_log", callID: "c2", args: {} },
      { title: "", output: "", metadata: {} },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s2", tool: "skill", callID: "c3", args: { name: "smartx-develop" } },
      { title: "", output: "", metadata: {} },
    )

    expect(mem.get("s1")?.logs).toBe(1)
    expect(mem.get("s1")?.debug).toBe(0)
    expect(mem.get("s2")?.logs).toBe(0)
    expect(mem.get("s2")?.debug).toBe(1)
  })

  test("writes structured logs for key events", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const rows: Row[] = []
    const hooks = build(ctx(rows), { mem })

    await Promise.resolve()
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, output)

    expect(rows.some((item) => item.message === "plugin loaded")).toBe(true)
    expect(rows.some((item) => item.message.includes("state") || item.message.includes("reminder"))).toBe(true)
  })
})
