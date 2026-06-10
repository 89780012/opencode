import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import { loadRemote } from "../src/workspace.js"
import {
  analyze,
  doneAnalysis,
  flowchart,
  fresh,
  freshAnalysis,
  key,
  noteAnalysis,
  requestAnalysis,
  requestChart,
  type Analysis,
  type Chart,
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
    expect(flowchart({ tool: "task", args: { subagent_type: "strategy-flowchart-generator" } })).toBe(true)
  })

  test("tracks workspace analysis states", () => {
    expect(requestAnalysis("f:/repo").state).toBe("requested")
    expect(freshAnalysis("f:/repo").state).toBe("running")
    expect(doneAnalysis("f:/repo").state).toBe("done")
    expect(requestChart("f:/repo").state).toBe("requested")
  })

  test("loads remote workspace analysis state from service", async () => {
    const prev = globalThis.fetch
    try {
      globalThis.fetch = (async () =>
        Response.json({
          data: {
            workspacePath: "f:/repo",
            worktreePath: "f:/repo",
            state: "running",
            items: [],
            text: "",
            updatedAt: 12,
          },
        })) satisfies typeof fetch

      const row = await loadRemote("http://localhost:4096", "f:/repo", "f:/repo")

      expect(row?.state).toBe("running")
      expect(row?.updated).toBe(12)
    } finally {
      globalThis.fetch = prev
    }
  })

  test("builds a hidden system gate reminder", () => {
    expect(noteAnalysis()).toContain("workspace-analyzer")
    expect(noteAnalysis()).toContain("requirements")
  })

  test("records analyzer results and asks the main agent to save through mcp", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const pending = new Map()
    const hooks = build(
      {
        ...ctx(),
        client: stub(rows),
      },
      {
        workspaces,
        pending,
      },
    )
    const id = key("f:/repo", "f:/repo")

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.join("\n")).toContain("workspace-analyzer")
    expect(workspaces.get(id)?.state).toBe("requested")

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "c1" },
      { args: { subagent_type: "workspace-analyzer" } },
    )
    expect(workspaces.get(id)?.state).toBe("running")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "workspace-analyzer" },
      },
      {
        title: "",
        output: ['<task_result>', '["read market","enter position"]', "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(workspaces.get(id)?.state).toBe("done")
    expect(workspaces.get(id)?.items).toEqual(["read market", "enter position"])
    expect(pending.get(id)?.kind).toBe("analysis")

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_analysis")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s2",
        tool: "smartx_save_analysis",
        callID: "c2",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, next)

    expect(next.system.join("\n")).toContain("strategy-flowchart-generator")
    expect(rows.some((item) => item.message === "workspace analysis completed")).toBe(true)
  })

  test("records flowchart results and asks the main agent to save through mcp", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const hooks = build(
      {
        ...ctx(),
        client: stub(rows),
      },
      {
        workspaces,
        charts,
        pending,
      },
    )
    const id = key("f:/repo", "f:/repo")
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"]))
    charts.set(id, requestChart("f:/repo"))

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)
    expect(first.system.join("\n")).toContain("strategy-flowchart-generator")

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "c1" },
      { args: { subagent_type: "strategy-flowchart-generator" } },
    )
    expect(charts.get(id)?.state).toBe("generating")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-flowchart-generator" },
      },
      {
        title: "",
        output: ["<task_result>", "```mermaid", "flowchart TD", "  A[Read market] --> B[End]", "```", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(charts.get(id)?.state).toBe("done")
    expect(charts.get(id)?.code).toContain("flowchart TD")
    expect(pending.get(id)?.kind).toBe("flowchart")

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_flowchart")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_flowchart",
        callID: "c2",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(rows.some((item) => item.message === "workspace flowchart completed")).toBe(true)
  })

  test("prioritizes workspace gates over session pairing reminders", async () => {
    const workspaces = new Map<string, Analysis>()
    const mem = new Map([["s1", { ...fresh("s1"), logs: 1 }]])
    const hooks = build(
      {
        ...ctx(),
      },
      {
        workspaces,
        mem,
      },
    )

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.length).toBe(1)
    expect(first.system.join("\n")).toContain("workspace-analyzer")
    expect(first.system.join("\n")).not.toContain("smartx_logs")
  })
})
