import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import {
  analyze,
  doneAnalysis,
  freshAnalysis,
  key,
  noteAnalysis,
  requestAnalysis,
  type Analysis,
} from "../src/state.js"

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

function ctx(dir = "f:/repo") {
  return {
    client: stub([]),
    project: {} as never,
    directory: dir,
    worktree: dir,
    serverUrl: new URL("http://localhost:4096"),
    $: {} as never,
  }
}

describe("smartx workspace analysis", () => {
  test("detects workspace analyzer task calls", () => {
    expect(analyze({ tool: "task", args: { subagent_type: "workspace-analyzer" } })).toBe(true)
    expect(analyze({ tool: "task", args: { subagent_type: "general" } })).toBe(false)
    expect(analyze("read")).toBe(false)
  })

  test("tracks workspace analysis states", () => {
    expect(requestAnalysis("f:/repo").state).toBe("requested")
    expect(freshAnalysis("f:/repo").state).toBe("running")
    expect(doneAnalysis("f:/repo").state).toBe("done")
  })

  test("builds a hidden system gate reminder", () => {
    expect(noteAnalysis()).toContain("workspace-analyzer")
    expect(noteAnalysis()).toContain("requirements")
    expect(noteAnalysis()).toContain("策略运行逻辑")
  })

  test("injects analysis gate per workspace until analyzer completes", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const saves: unknown[] = []
    const hooks = build(
      {
        ...ctx(),
        client: stub(rows),
      },
      {
        workspaces,
        save: async (input) => {
          saves.push(input)
        },
      },
    )
    const id = key("f:/repo", "f:/repo")

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.join("\n")).toContain("workspace-analyzer")
    expect(workspaces.get(id)?.state).toBe("requested")

    const second = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, second)

    expect(second.system.join("\n")).toContain("workspace-analyzer")
    expect(workspaces.size).toBe(1)

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "c1" },
      { args: { subagent_type: "workspace-analyzer" } },
    )

    expect(workspaces.get(id)?.state).toBe("running")

    const running = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, running)

    expect(running.system.join("\n")).not.toContain("workspace-analyzer")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "workspace-analyzer" },
      },
      {
        title: "",
        output: ["<task_result>", "1.", "交易市场为A股。", "", "2.", "策略核心逻辑为网格交易。", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(workspaces.get(id)?.state).toBe("done")
    expect(workspaces.get(id)?.items).toEqual(["交易市场为A股。", "策略核心逻辑为网格交易。"])
    expect(saves).toEqual([
      {
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        items: ["交易市场为A股。", "策略核心逻辑为网格交易。"],
        text: ["1.", "交易市场为A股。", "", "2.", "策略核心逻辑为网格交易。"].join("\n"),
      },
    ])

    const done = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, done)

    expect(done.system.join("\n")).not.toContain("workspace-analyzer")
    expect(rows.some((item) => item.message === "workspace analysis completed")).toBe(true)
  })
})
