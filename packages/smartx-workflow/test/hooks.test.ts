import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import { fresh } from "../src/state.js"

describe("smartx workflow hooks", () => {
  test("adds a reminder after smartx_start", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      output,
    )

    expect(mem.get("s1")?.logs).toBe(1)
    expect(output.system[0]?.includes("`smartx_start` 和 `smartx_logs` 是有前后顺序的一对调用。")).toBe(true)
  })

  test("clears the reminder after matching smartx_logs", async () => {
    const mem = new Map([["s1", { ...fresh("s1"), logs: 1 }]])
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_logs", callID: "c1", args: {} },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      output,
    )

    expect(mem.get("s1")?.logs).toBe(0)
    expect(output.system.length).toBe(0)
  })

  test("keeps the reminder until every start is matched", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

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
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      output,
    )

    expect(mem.get("s1")?.logs).toBe(1)
    expect(output.system[0]?.includes("在结束当前回复前，你还需要再调用 1 次 `smartx_logs`。")).toBe(true)
  })

  test("adds a reminder after loading smartx-develop", async () => {
    const mem = new Map([["s1", fresh("s1")]])
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "skill", callID: "c1", args: { name: "smartx-develop" } },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      output,
    )

    expect(mem.get("s1")?.debug).toBe(1)
    expect(output.system[0]?.includes("`smartx-develop` 和 `smartx-debug` 是有前后顺序的一对 skill 调用。")).toBe(
      true,
    )
  })

  test("clears the reminder after loading smartx-debug", async () => {
    const mem = new Map([["s1", { ...fresh("s1"), debug: 1 }]])
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "skill", callID: "c1", args: { name: "smartx-debug" } },
      { title: "", output: "", metadata: {} },
    )

    const output = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      output,
    )

    expect(mem.get("s1")?.debug).toBe(0)
    expect(output.system.length).toBe(0)
  })

  test("keeps sessions isolated in memory", async () => {
    const mem = new Map<string, ReturnType<typeof fresh>>()
    const hooks = build(
      {
        client: {} as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        mem,
      },
    )

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
})
