import { describe, expect, test } from "bun:test"
import type { ToolContext } from "@opencode-ai/plugin"
import { build } from "../src/hooks.js"
import { loadBaselineRemote, loadRemote } from "../src/remote.js"
import { backtest, kind, python } from "../src/tool.js"
import {
  analyze,
  doneAnalysis,
  flowchart,
  freshAnalysis,
  key,
  noteAnalysis,
  requestAnalysis,
  requestChart,
  review,
  wantsReview,
  type Analysis,
  type Chart,
} from "../src/state.js"
import type { Memory, Pending, Project, SaveReview } from "../src/types.js"

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
    session: {
      get: async () => ({ data: { parentID: undefined } }),
    },
  } as never
}

function ctx(dir = "f:/repo", rows: Row[] = []) {
  return {
    client: stub(rows),
    project: {} as never,
    directory: dir,
    worktree: dir,
    serverUrl: new URL("http://localhost:4096"),
    $: {} as never,
  }
}

function workspace() {
  return key("f:/repo", "f:/repo")
}

function restored(needsSave = false) {
  return new Map<string, Memory>([[workspace(), { hasProjectState: true, hasRestoredState: true, needsSave }]])
}

function projects(hasProjectState = true) {
  return new Map<string, Project>([[workspace(), { workspace: "f:/repo", worktree: "f:/repo", hasProjectState, updated: Date.now() }]])
}

function setup(input: ReturnType<typeof ctx>, dep: Parameters<typeof build>[1] = {}) {
  return build(input, {
    memory: restored(),
    projects: projects(),
    saveReview: async () => {},
    baseline: async () => true,
    ...dep,
  })
}

describe("smartx workspace analysis", () => {
  test("detects workspace task calls and review requests", () => {
    expect(analyze({ tool: "task", args: { subagent_type: "workspace-analyzer" } })).toBe(true)
    expect(analyze({ tool: "task", args: { subagent_type: "general" } })).toBe(false)
    expect(analyze("read")).toBe(false)
    expect(flowchart({ tool: "task", args: { subagent_type: "strategy-flowchart-generator" } })).toBe(true)
    expect(review({ tool: "task", args: { subagent_type: "strategy-reviewer" } })).toBe(true)
    expect(wantsReview("review")).toBe(true)
    expect(wantsReview("please do a code review")).toBe(true)
    expect(wantsReview("please review current implementation")).toBe(true)
    expect(wantsReview("need code review")).toBe(true)
    expect(wantsReview("review conclusion: passed")).toBe(false)
    expect(wantsReview("review result: failed")).toBe(false)
    expect(wantsReview("please write code")).toBe(false)
  })

  test("classifies prefixed backtest tools", () => {
    expect(backtest({ tool: "smartx_run_backtest" })).toBe(true)
    expect(backtest({ tool: "strategy_list_backtests" })).toBe(true)
    expect(backtest({ tool: "smartx_get_backtest" })).toBe(true)
    expect(backtest({ tool: "smartx_get_backtest_config" })).toBe(true)
    expect(backtest({ tool: "smartx_get_requirements" })).toBe(false)
    expect(kind({ tool: "smartx_run_backtest" })).toBe("backtest")
    expect(kind({ tool: "smartx_list_backtests" })).toBe("read")
    expect(kind({ tool: "smartx_get_backtest" })).toBe("read")
    expect(kind({ tool: "smartx_get_backtest_config" })).toBe("read")
    expect(backtest({ tool: "run_backtest" })).toBe(true)
    expect(kind({ tool: "run_backtest" })).toBe("backtest")
    expect(kind({ tool: "list_backtests" })).toBe("read")
    expect(kind({ tool: "get_backtest" })).toBe("read")
    expect(kind({ tool: "get_backtest_config" })).toBe("read")
  })

  test("registers and classifies the SmartX Python tool", () => {
    const hooks = setup(ctx("f:/repo"))
    expect(hooks.tool?.smartx_python).toBeDefined()
    expect(python({ tool: "smartx_python" })).toBe(true)
    expect(python({ tool: "python" })).toBe(false)
    expect(kind({ tool: "smartx_python" })).toBe("exec")
  })

  test("rejects ambient Python Bash calls before workspace gates", async () => {
    const hooks = setup(ctx("f:/repo"))
    const before = hooks["tool.execute.before"]
    if (!before) throw new Error("tool execute before hook was not registered")

    await expect(
      before(
        { sessionID: "s1", tool: "bash", callID: "call-python-shell" },
        { args: { command: "python scripts/query.py" } },
      ),
    ).rejects.toThrow("smartx_python")
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

  test("loads the workspace baseline switch from system config", async () => {
    const prev = globalThis.fetch
    try {
      globalThis.fetch = (async () => Response.json({ data: { workflow: { baseline: true } } })) satisfies typeof fetch
      expect(await loadBaselineRemote("http://localhost:4096")).toBe(true)
      globalThis.fetch = (async () => Response.json({ data: { workflow: {} } })) satisfies typeof fetch
      expect(await loadBaselineRemote("http://localhost:4096")).toBe(false)
      globalThis.fetch = (async () => new Response("", { status: 500 })) satisfies typeof fetch
      expect(await loadBaselineRemote("http://localhost:4096")).toBe(false)
    } finally {
      globalThis.fetch = prev
    }
  })

  test("skips and protects workspace baseline actions while disabled", async () => {
    const workspaces = new Map<string, Analysis>()
    const dirtyStates = new Map()
    const hooks = setup(ctx("f:/repo"), { workspaces, dirtyStates, baseline: async () => false })
    const system = { system: [] as string[] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, system)

    expect(system.system.join("\n")).toContain("系统配置已关闭工作区分析与流程图")
    expect(system.system.join("\n")).not.toContain("Analyze strategy execution flow")
    expect(workspaces.has(workspace())).toBe(false)
    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "analysis" },
        { args: { subagent_type: "workspace-analyzer" } },
      ),
    ).rejects.toThrow("disabled by system configuration")
    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_flowchart", callID: "chart" },
        { args: {} },
      ),
    ).rejects.toThrow("disabled by system configuration")
    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "edit", callID: "edit" },
      { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "edit", callID: "edit", args: {} },
      { title: "", output: "", metadata: {} },
    )
    expect(dirtyStates.get(workspace())?.state).toBe("dirty")

    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, next)
    expect(next.system.join("\n")).toContain("save_project_state")
    expect(next.system.join("\n")).not.toContain("Analyze strategy execution flow")
    expect(next.system.join("\n")).not.toContain("刷新顺序必须是")
    expect(dirtyStates.get(workspace())?.state).toBe("dirty")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_project_state",
        callID: "memory",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "", metadata: {} },
    )
    const done = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, done)
    expect(done.system.join("\n")).not.toContain("最后一次 workspace 快照刷新")
  })

  test("keeps review active for dirty workspaces while baseline is disabled", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    const hooks = setup(ctx("f:/repo"), {
      baseline: async () => false,
      dirtyStates: new Map([[id, { state: "dirty", updated: 1, reason: "edit" }]]),
      reviewRequests: new Set([scope]),
    })
    const out = { system: [] as string[] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("strategy-reviewer")
    expect(out.system.join("\n")).not.toContain("刷新顺序必须是")
  })

  test("discards stale baseline pending after writes while disabled", async () => {
    let on = false
    const id = workspace()
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "old", ["old"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: 1 }],
    ])
    const pending = new Map<string, Pending>([
      [
        id,
        {
          kind: "analysis",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          summaryItems: ["old"],
          summaryText: "old",
        },
      ],
    ])
    const dirtyStates = new Map()
    const baselineModes = new Map()
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      charts,
      pending,
      dirtyStates,
      baselineModes,
      baseline: async () => on,
    })

    await hooks["experimental.chat.system.transform"]?.(
      { sessionID: "s1", model: {} as never },
      { system: [] },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "edit", callID: "edit", args: {} },
      { title: "", output: "", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")
    expect(baselineModes.get(id)).toBe("refresh")
    expect(dirtyStates.get(id)?.state).toBe("dirty")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_project_state",
        callID: "memory",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "", metadata: {} },
    )
    on = true
    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, next)

    expect(next.system.join("\n")).toContain("workspace-analyzer")
    expect(next.system.join("\n")).not.toContain("smartx_save_analysis")
    expect(pending.has(id)).toBe(false)
  })

  test("applies a changed baseline switch on the next system turn", async () => {
    let on = false
    const workspaces = new Map<string, Analysis>()
    const hooks = setup(ctx("f:/repo"), { workspaces, baseline: async () => on })
    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)
    expect(workspaces.has(workspace())).toBe(false)

    on = true
    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, next)
    expect(next.system.join("\n")).toContain("Analyze strategy execution flow")
    expect(workspaces.get(workspace())?.state).toBe("requested")
  })

  test("builds a hidden system gate reminder", () => {
    expect(noteAnalysis()).toContain("workspace-analyzer")
    expect(noteAnalysis()).toContain("requirements")
  })

  test("records analyzer results and asks the main agent to save through mcp", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const pending = new Map()
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      pending,
    })
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
    expect(workspaces.get(id)?.summaryItems).toEqual(["read market", "enter position"])
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
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
    })
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
    expect(charts.get(id)?.mermaidCode).toContain("flowchart TD")
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

  test("prioritizes workspace gates when baseline is missing", async () => {
    const workspaces = new Map<string, Analysis>()
    const hooks = setup(ctx(), { workspaces })

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.some((item) => item.includes("smartx_python"))).toBe(true)
    expect(first.system.some((item) => item.includes("workspace-analyzer"))).toBe(true)
  })

  test("allows read tools before analysis starts but blocks writes", async () => {
    const hooks = setup(ctx("f:/repo"))

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "edit", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
      ),
    ).rejects.toThrow("initial workspace analysis")

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "c3" },
        { args: { subagent_type: "workspace-analyzer" } },
      ),
    ).resolves.toBeUndefined()
  })

  test("allows reads during baseline save phases and unblocks writes after flowchart save", async () => {
    const workspaces = new Map<string, Analysis>()
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      pending,
    })

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "c1" },
      { args: { subagent_type: "workspace-analyzer" } },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "workspace-analyzer" },
      },
      {
        title: "",
        output: ['<task_result>', '["read market"]', "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "write", callID: "c2w" },
        { args: { filePath: "f:/repo/a.ts", content: "next" } },
      ),
    ).rejects.toThrow("initial workspace baseline")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_analysis",
        callID: "c3",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c4" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "c5" },
        { args: { subagent_type: "strategy-flowchart-generator" } },
      ),
    ).resolves.toBeUndefined()

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c5",
        args: { subagent_type: "strategy-flowchart-generator" },
      },
      {
        title: "",
        output: "<task_result>flowchart TD\nA-->B</task_result>",
        metadata: {},
      },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c6" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_flowchart",
        callID: "c7",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c8" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()
  })

  test("does not hard block child sessions", async () => {
    const hooks = setup(ctx("f:/repo"))

    await hooks.event?.({
      event: {
        type: "session.created",
        properties: {
          info: {
            id: "s2",
            parentID: "s1",
          },
        },
      } as never,
    })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s2", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()
  })

  test("binds trusted context to backtest tools without dirtying the workspace", async () => {
    const id = workspace()
    const memory = restored()
    const dirty = new Map()
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
    ])
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      memory,
      projects: projects(),
      dirtyStates: dirty,
      workspaces,
      charts,
    })
    const output = {
      args: {
        workspacePath: "f:/forged",
        sessionId: "forged",
        requestKey: "forged",
        pluginId: "forged",
        config: { cash: 100000 },
      },
    }

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "smartx_run_backtest", callID: "call-1" },
      output,
    )

    expect(output.args).toEqual({
      workspacePath: "f:/repo",
      sessionId: "s1",
      requestKey: "ai:call-1",
      config: { cash: 100000 },
    })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_run_backtest", callID: "call-1", args: output.args },
      { title: "", output: "{}", metadata: {} },
    )

    expect(dirty.has(id)).toBe(false)
    expect(memory.get(id)?.needsSave).toBe(false)
  })

  test("binds read-only backtest tools and removes forged execution fields", async () => {
    const hooks = setup(ctx("f:/repo"))

    await Promise.all(
      [
        { tool: "smartx_list_backtests", args: { limit: 3 } },
        { tool: "smartx_get_backtest", args: { id: "bt_1" } },
        { tool: "smartx_get_backtest_config", args: {} },
      ].map(async (item) => {
        const output = {
          args: {
            workspacePath: "f:/forged",
            sessionId: "forged",
            requestKey: "forged",
            pluginId: "forged",
            ...item.args,
          },
        }
        await hooks["tool.execute.before"]?.(
          { sessionID: "s1", tool: item.tool, callID: "call-read" },
          output,
        )
        expect(output.args).toEqual({ workspacePath: "f:/repo", sessionId: "s1", ...item.args })
      }),
    )
  })

  test("rejects backtest tools from child sessions", async () => {
    const hooks = setup(ctx("f:/repo"))

    await hooks.event?.({
      event: {
        type: "session.created",
        properties: { info: { id: "s2", parentID: "s1" } },
      } as never,
    })

    await Promise.all(
      ["smartx_run_backtest", "smartx_list_backtests", "smartx_get_backtest", "smartx_get_backtest_config"].map(
        (tool) =>
          expect(
            hooks["tool.execute.before"]?.(
              { sessionID: "s2", tool, callID: "call-child" },
              { args: { workspacePath: "f:/repo", sessionId: "s2" } },
            ),
          ).rejects.toThrow("main session"),
      ),
    )
  })

  test("rejects a restored child session without a created event", async () => {
    const hooks = setup(ctx("f:/repo"), { parent: async (id) => id === "s2" })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s2", tool: "smartx_run_backtest", callID: "call-restored-child" },
        { args: {} },
      ),
    ).rejects.toThrow("main session")
  })

  test("rejects SmartX Python in child sessions before execution", async () => {
    const hooks = setup(ctx("f:/repo"), { parent: async (id) => id === "s2" })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s2", tool: "smartx_python", callID: "call-python-child" },
        { args: { description: "child", code: "print(1)" } },
      ),
    ).rejects.toThrow("SmartX Python is only available in the main session")
  })

  test("applies baseline gates and preserves dirt after a failed Python execution", async () => {
    const blocked = setup(ctx("f:/repo"), { parent: async () => false })
    await expect(
      blocked["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_python", callID: "call-python-blocked" },
        { args: { description: "blocked", code: "print(1)" } },
      ),
    ).rejects.toThrow("initial workspace")

    const id = workspace()
    const memory = restored()
    const dirty = new Map()
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [
        id,
        {
          workspace: "f:/repo",
          worktree: "f:/repo",
          state: "done",
          mermaidCode: "flowchart TD",
          errorText: "",
          updated: Date.now(),
        },
      ],
    ])
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      memory,
      projects: projects(),
      dirtyStates: dirty,
      workspaces,
      charts,
      parent: async () => false,
      runtime: {
        find: async () => process.execPath,
        cmd: (bin) => [bin, "-e", "await Bun.stdin.text(); process.exit(7)"],
      },
    })
    const args = { description: "query", code: "print(1)" }

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_python", callID: "call-python" },
        { args },
      ),
    ).resolves.toBeUndefined()

    expect(dirty.has(id)).toBe(false)
    expect(memory.get(id)?.needsSave).toBe(false)

    const run = hooks.tool?.smartx_python
    if (!run) throw new Error("smartx_python was not registered")
    const ctrl = new AbortController()
    await expect(
      run.execute(args, {
        sessionID: "s1",
        messageID: "m1",
        agent: "smartx-helper",
        directory: process.cwd(),
        worktree: process.cwd(),
        abort: ctrl.signal,
        metadata() {},
        async ask() {},
      } satisfies ToolContext),
    ).rejects.toThrow("exited with code 7")

    // execute 抛错后 core 不会触发 after hook，启动回调仍已保留副作用状态。
    expect(dirty.get(id)?.state).toBe("dirty")
    expect(memory.get(id)?.needsSave).toBe(true)
  })

  test("refresh tool allows reads and blocks writes until refreshed baseline is rebuilt", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
    ])
    const pending = new Map()
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_refresh_workspace",
        callID: "c0",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo", reason: "code changed" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")
    expect(rows.some((item) => item.message === "workspace refresh requested")).toBe(true)

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "write", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", content: "next" } },
      ),
    ).rejects.toThrow("refreshing the workspace baseline")
  })

  test("refresh tool clears pending analysis and flowchart saves", async () => {
    const id = key("f:/repo", "f:/repo")
    const pending = new Map()
    pending.set(id, {
      kind: "flowchart",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "done",
      mermaidCode: "flowchart TD",
      errorText: "",
    })
    const hooks = setup(ctx("f:/repo"), {
      pending,
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_refresh_workspace",
        callID: "c0",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo", reason: "code changed" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
  })

  test("keeps a review request until the reviewer running state is saved", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const reviewRequests = new Set<string>()
    const reviewRuns = new Set<string>()
    const saved: SaveReview[] = []
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
      reviewRequests,
      reviewRuns,
      saveReview: async (input) => {
        saved.push(input)
      },
    })

    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m1", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "review" } as never],
      },
    )

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("smartx_get_requirements")
    expect(out.system.join("\n")).toContain("strategy-reviewer")
    expect(out.system.join("\n")).toContain("smartx_save_review")
    expect(out.system.join("\n")).toContain("第 3 轮")
    expect(reviewRequests.size).toBe(1)

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )

    expect(reviewRequests.size).toBe(0)
    expect(reviewRuns.has(id + "\x00s1")).toBe(true)
    expect(saved[0]).toMatchObject({ reviewId: "review-1", sessionId: "s1", state: "running" })
    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m2", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "review again" } as never],
      },
    )
    expect(reviewRequests.size).toBe(0)
    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "review-2" },
        { args: { subagent_type: "strategy-reviewer" } },
      ),
    ).rejects.toThrow("active review")
    expect(saved).toHaveLength(1)
    expect(rows.some((item) => item.message === "workspace review requested")).toBe(true)
  })

  test("rejects a reviewer that has no user request or review fix", async () => {
    const id = workspace()
    const saved: SaveReview[] = []
    const hooks = setup(ctx("f:/repo"), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
      saveReview: async (input) => {
        saved.push(input)
      },
    })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "review-1" },
        { args: { subagent_type: "strategy-reviewer" } },
      ),
    ).rejects.toThrow("not requested")
    expect(saved).toHaveLength(0)
  })

  test("reserves a review before the running state save completes", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    const runs = new Set<string>()
    let start = () => {}
    const started = new Promise<void>((done) => {
      start = done
    })
    let release = () => {}
    const wait = new Promise<void>((done) => {
      release = done
    })
    const saved: SaveReview[] = []
    const hooks = setup(ctx("f:/repo"), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
      reviewRequests: new Set([scope]),
      reviewRuns: runs,
      saveReview: async (input) => {
        saved.push(input)
        start()
        await wait
      },
    })

    const first = hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    await started
    const second = hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-2" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    release()
    const result = await Promise.allSettled([first, second])

    expect(result[0].status).toBe("fulfilled")
    expect(result[1].status).toBe("rejected")
    expect(saved).toHaveLength(1)
    expect(runs.has(scope)).toBe(true)
  })

  test("turns a missing reviewer task output into an error pending", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    const pending = new Map()
    const runs = new Set<string>()
    const hooks = setup(ctx("f:/repo"), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
      pending,
      reviewRequests: new Set([scope]),
      reviewRuns: runs,
    })

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      undefined as never,
    )

    expect(runs.has(scope)).toBe(false)
    expect(pending.get(scope)).toMatchObject({ reviewId: "review-1", sessionId: "s1", state: "error" })
  })

  test("keeps a review request when the running state cannot be saved", async () => {
    const id = workspace()
    const requests = new Set([id + "\x00s1"])
    const hooks = setup(ctx("f:/repo"), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [
          id,
          {
            workspace: "f:/repo",
            worktree: "f:/repo",
            state: "done",
            mermaidCode: "flowchart TD",
            errorText: "",
            updated: Date.now(),
          },
        ],
      ]),
      reviewRequests: requests,
      saveReview: async () => {
        throw new Error("review service unavailable")
      },
    })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "review-1" },
        { args: { subagent_type: "strategy-reviewer" } },
      ),
    ).rejects.toThrow("review service unavailable")
    expect(requests.has(id + "\x00s1")).toBe(true)
  })

  test("refreshes a dirty baseline before consuming the review request", async () => {
    const id = workspace()
    const requests = new Set([id + "\x00s1"])
    const workspaces = new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [
        id,
        {
          workspace: "f:/repo",
          worktree: "f:/repo",
          state: "done",
          mermaidCode: "flowchart TD",
          errorText: "",
          updated: Date.now(),
        },
      ],
    ])
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      charts,
      dirtyStates: new Map([[id, { state: "dirty", updated: Date.now(), reason: "write" }]]),
      reviewRequests: requests,
    })
    const out = { system: [] as string[] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("代码审查")
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")
    expect(requests.has(id + "\x00s1")).toBe(true)
  })

  test("treats an empty reviewer result as an error", async () => {
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), { pending })
    const scope = workspace() + "\x00s1"

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-empty", args: { subagent_type: "strategy-reviewer" } },
      { title: "", output: "", metadata: {} },
    )

    expect(pending.get(scope)).toMatchObject({
      kind: "review",
      reviewId: "review-empty",
      sessionId: "s1",
      state: "error",
    })
  })

  test("rejects a terminal review save without a pending review for the session", async () => {
    const hooks = setup(ctx("f:/repo"))

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_review", callID: "save-1" },
        {
          args: {
            reviewId: "forged",
            sessionId: "s1",
            workspacePath: "f:/repo",
            worktreePath: "f:/repo",
            state: "passed",
            summary: "passed",
            items: [{ name: "review", status: "passed", detail: "passed", suggestion: "" }],
            suggestions: [],
          },
        },
      ),
    ).rejects.toThrow("no pending review")
  })

  test("rejects empty, invalid, and running terminal review items", async () => {
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), { pending })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      { title: "", output: "review conclusion: passed\nno blocking issue", metadata: {} },
    )

    const call = (items: unknown[], summary = "review complete") =>
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_review", callID: "save-1" },
        {
          args: {
            reviewId: "review-1",
            sessionId: "s1",
            workspacePath: "f:/repo",
            worktreePath: "f:/repo",
            state: "passed",
            summary,
            items,
            suggestions: [],
          },
        },
      )

    await expect(call([])).rejects.toThrow("valid statuses")
    await expect(call([{ name: "review", status: "unknown", detail: "invalid", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(call([{ name: "review", status: "running", detail: "still running", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(call([{ name: "", status: "passed", detail: "passed", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(call([{ name: "review", status: "passed", detail: "", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(
      call([{ name: "review", status: "passed", detail: "passed", suggestion: "" }], ""),
    ).rejects.toThrow("non-empty terminal review summary")
    expect(pending.has(workspace() + "\x00s1")).toBe(true)
  })

  test("does not let terminal items weaken a failed reviewer result", async () => {
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), { pending })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      { title: "", output: "review conclusion: failed\nmissing stop loss", metadata: {} },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_review", callID: "save-1" },
        {
          args: {
            reviewId: "review-1",
            sessionId: "s1",
            workspacePath: "f:/repo",
            worktreePath: "f:/repo",
            state: "passed",
            summary: "passed",
            items: [{ name: "review", status: "passed", detail: "passed", suggestion: "" }],
            suggestions: [],
          },
        },
      ),
    ).rejects.toThrow("less severe")
    expect(pending.has(workspace() + "\x00s1")).toBe(true)
  })

  test("clears the repair queue when terminal items escalate a failed review to error", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    const rows: Row[] = []
    const pending = new Map()
    const fixes = new Map()
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
      pending,
      reviewFixes: fixes,
    })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      { title: "", output: "review conclusion: failed\nmissing stop loss", metadata: {} },
    )
    expect(fixes.has(scope)).toBe(true)

    const call = {
      args: {
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        state: "failed",
        summary: "review execution error",
        items: [{ name: "review", status: "error", detail: "review execution error", suggestion: "retry" }],
        suggestions: ["retry"],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "save-1" }, call)
    expect(call.args.state).toBe("error")
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_save_review", callID: "save-1", args: call.args },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(scope)).toBe(false)
    expect(fixes.has(scope)).toBe(false)
    expect(rows.find((item) => item.message === "workspace review saved through mcp")?.extra?.state).toBe("error")
  })

  test("isolates concurrent review pending state by session and review id", async () => {
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), { pending })
    const id = workspace()
    const one = id + "\x00s1"
    const two = id + "\x00s2"

    await Promise.all([
      hooks["tool.execute.after"]?.(
        { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
        { title: "", output: "review conclusion: error\nfirst review failed to run", metadata: {} },
      ),
      hooks["tool.execute.after"]?.(
        { sessionID: "s2", tool: "task", callID: "review-2", args: { subagent_type: "strategy-reviewer" } },
        { title: "", output: "review conclusion: error\nsecond review failed to run", metadata: {} },
      ),
    ])

    expect(pending.get(one)).toMatchObject({ reviewId: "review-1", sessionId: "s1" })
    expect(pending.get(two)).toMatchObject({ reviewId: "review-2", sessionId: "s2" })

    const first = { system: [] as string[] }
    const second = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, second)
    expect(first.system.join("\n")).toContain("first review")
    expect(first.system.join("\n")).not.toContain("second review")
    expect(second.system.join("\n")).toContain("second review")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "save-wrong",
        args: {
          reviewId: "review-2",
          sessionId: "s1",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "error",
          items: [{ name: "review", status: "error", detail: "failed", suggestion: "retry" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )
    expect(pending.has(one)).toBe(true)
    expect(pending.has(two)).toBe(true)

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "save-1",
        args: {
          reviewId: "review-1",
          sessionId: "s1",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "error",
          items: [{ name: "review", status: "error", detail: "failed", suggestion: "retry" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )
    expect(pending.has(one)).toBe(false)
    expect(pending.has(two)).toBe(true)
  })

  test("saves failed review before asking the main agent to fix it", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const fixes = new Map()
    const id = key("f:/repo", "f:/repo")
    const scope = id + "\x00s1"
    const requests = new Set<string>([scope])
    const dirt = new Map()
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
      dirtyStates: dirt,
      reviewFixes: fixes,
      reviewRequests: requests,
    })
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"]))
    charts.set(id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() })

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "c1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "review conclusion: failed\n\nissue: missing stop loss.\nsuggestion: add stop loss protection.", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(pending.get(scope)).toMatchObject({ kind: "review", reviewId: "c1", sessionId: "s1", state: "failed" })
    expect(fixes.get(scope)?.attempt).toBe(1)

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")
    expect(save.system.join("\n")).toContain("审查报告")
    expect(save.system.join("\n")).toContain("reviewId: c1")
    expect(save.system.join("\n")).toContain("sessionId: s1")

    const call = {
      args: {
        workspacePath: "forged",
        worktreePath: "forged",
        state: "passed",
        summary: "missing stop loss",
        items: [{ name: "risk control", status: "failed", detail: "missing stop loss", suggestion: "add stop loss" }],
        suggestions: [],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "c2" }, call)
    expect(call.args).toMatchObject({
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
    })
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: call.args,
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(scope)).toBe(false)
    expect(fixes.get(scope)?.attempt).toBe(1)

    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m2", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "review again" } as never],
      },
    )
    expect(requests.has(scope)).toBe(false)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("最新一轮 SmartX 策略审查未通过")
    expect(fix.system.join("\n")).toContain("主 agent")
    expect(fix.system.join("\n")).toContain("smartx_save_review")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
    expect(fix.system.join("\n")).toContain("missing stop loss")
    expect(rows.some((item) => item.message === "workspace review needs fix")).toBe(true)

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "write",
        callID: "c3",
        args: { filePath: "f:/repo/a.ts", content: "fixed" },
      },
      { title: "", output: "Wrote file successfully.", metadata: {} },
    )

    const refresh = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, refresh)
    expect(refresh.system.join("\n")).toContain("策略复审")
    expect(requests.has(scope)).toBe(true)
    expect(fixes.get(scope)?.attempt).toBe(1)

    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"]))
    charts.set(id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() })
    dirt.set(id, { state: "clean", updated: Date.now(), reason: "" })

    const retry = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, retry)
    expect(retry.system.join("\n")).toContain("strategy-reviewer")
    expect(retry.system.join("\n")).not.toContain("必须自己根据审查报告修复代码")
  })

  test("finalizes after a passed review", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const hooks = setup(ctx("f:/repo", rows), { workspaces, charts, pending, memory: restored(true) })
    const id = key("f:/repo", "f:/repo")
    const scope = id + "\x00s1"
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["old analysis"]))
    charts.set(id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "review conclusion: passed\n\nno blocking issue.", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(pending.get(scope)).toMatchObject({ kind: "review", reviewId: "c1", sessionId: "s1", state: "passed" })

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")
    expect(save.system.join("\n")).toContain("no blocking issue")

    const call = {
      args: {
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        state: "passed",
        summary: "passed",
        items: [{ name: "requirements", status: "passed", detail: "passed", suggestion: "" }],
        suggestions: [],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "c2" }, call)
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: call.args,
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(scope)).toBe(false)
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")

    const memory = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, memory)
    expect(memory.system.join("\n")).toContain("save_project_state")

    const project = {
      args: { workspacePath: "f:/repo", worktreePath: "f:/repo", dirty: false },
    }
    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "smartx_save_project_state", callID: "c3" },
      project,
    )
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_project_state",
        callID: "c3",
        args: project.args,
      },
      { title: "", output: "{}", metadata: {} },
    )

    const final = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, final)
    expect(final.system.join("\n")).toContain("workspace-analyzer")
  })

  test("injects an automatic close reminder before a dirty workspace naturally wraps up", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
    ])
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      charts,
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "write",
        callID: "c1",
        args: { filePath: "f:/repo/a.ts", content: "changed" },
      },
      { title: "", output: "Wrote file successfully.", metadata: {} },
    )

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("save_project_state")
    expect(workspaces.get(id)?.state).toBe("done")
    expect(charts.get(id)?.state).toBe("done")
    expect(rows.some((item) => item.message === "project memory save reminder injected")).toBe(true)
  })

  test("injects automatic close reminder after dirty changes", async () => {
    const id = key("f:/repo", "f:/repo")
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
    ])
    const hooks = setup(ctx("f:/repo"), { workspaces, charts })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "write",
        callID: "c1",
        args: { filePath: "f:/repo/a.ts", content: "changed" },
      },
      { title: "", output: "Wrote file successfully.", metadata: {} },
    )

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("save_project_state")
  })

  test("fixes saved review when any item is not passed", async () => {
    const pending = new Map()
    const fixes = new Map()
    const id = key("f:/repo", "f:/repo")
    const hooks = setup(ctx("f:/repo"), {
      pending,
      reviewFixes: fixes,
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
      ]),
    })
    const scope = id + "\x00s1"

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "review conclusion: passed\n\nrisk control needs reinforcement.", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    const call = {
      args: {
        reviewId: "forged",
        sessionId: "forged",
        workspacePath: "forged",
        worktreePath: "forged",
        state: "passed",
        summary: "risk control needs reinforcement",
        items: [
          { name: "requirements", status: "passed", detail: "passed", suggestion: "" },
          { name: "risk control", status: "warning", detail: "needs reinforcement", suggestion: "add risk control" },
        ],
        suggestions: ["add risk control"],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "c2" }, call)
    expect(call.args).toMatchObject({
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
    })
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: call.args,
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(scope)).toBe(false)
    expect(fixes.get(scope)?.attempt).toBe(1)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("needs reinforcement")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
  })

  test("saves third failed review before the final fix", async () => {
    const pending = new Map()
    const fixes = new Map([[key("f:/repo", "f:/repo") + "\x00" + "s1", {
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      sessionID: "s1",
      attempt: 3,
      reviewText: "review conclusion: failed",
    }]])
    const hooks = setup(ctx("f:/repo"), {
      pending,
      reviewFixes: fixes,
    })
    const id = key("f:/repo", "f:/repo")
    const scope = id + "\x00s1"

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "review conclusion: failed\n\nissue: still missing stop loss.", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(fixes.get(scope)?.attempt).toBe(3)
    expect(pending.get(scope)).toMatchObject({ kind: "review", reviewId: "c1", sessionId: "s1", state: "failed" })

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: {
          reviewId: "c1",
          sessionId: "s1",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "failed",
          items: [{ name: "risk control", status: "failed", detail: "still missing stop loss", suggestion: "add stop loss" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("3")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
    expect(fixes.has(scope)).toBe(false)
  })

  test("requires project memory restore before sustained work", async () => {
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      projects: projects(true),
      memory: new Map(),
    })

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)
    expect(out.system.join("\n")).toContain("resume_project_state")

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "edit", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
      ),
    ).rejects.toThrow("restoring project memory")

    expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "skill", callID: "c3" },
        { args: { name: "smartx-develop" } },
      ),
    ).rejects.toThrow("restoring project memory")

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_project_state", callID: "c4" },
        { args: { workspacePath: "f:/repo", worktreePath: "f:/repo", dirty: false } },
      ),
    ).rejects.toThrow("restoring project memory")
  })

  test("initializes missing project memory and then enters baseline flow", async () => {
    const memory = new Map<string, Memory>()
    const workspaces = new Map<string, Analysis>()
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      projects: projects(false),
      memory,
      workspaces,
    })

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)
    expect(first.system.join("\n")).toContain("init_project_state")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_init_project_state",
        callID: "c1",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(memory.get(workspace())?.hasRestoredState).toBe(true)
    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, next)
    expect(next.system.join("\n")).toContain("workspace-analyzer")
    expect(workspaces.get(workspace())?.state).toBe("requested")
  })

  test("loads persisted baseline after project memory restore", async () => {
    const memory = new Map<string, Memory>()
    const workspaces = new Map<string, Analysis>([[workspace(), requestAnalysis("f:/repo", "f:/repo")]])
    const charts = new Map<string, Chart>()
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      projects: projects(),
      memory,
      workspaces,
      charts,
      load: async () => doneAnalysis("f:/repo", "f:/repo", "read market", ["read market"]),
      loadChart: async () => ({
        workspace: "f:/repo",
        worktree: "f:/repo",
        state: "done",
        mermaidCode: "flowchart TD\nA-->B",
        errorText: "",
        updated: Date.now(),
      }),
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_resume_project_state",
        callID: "c1",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)
    expect(out.system.join("\n")).not.toContain("workspace-analyzer")

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "edit", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
      ),
    ).resolves.toBeUndefined()
  })

  test("marks project memory stale after writes and requires save before final wrap-up", async () => {
    const id = workspace()
    const memory = restored()
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", mermaidCode: "flowchart TD", errorText: "", updated: Date.now() }],
    ])
    const hooks = build(ctx("f:/repo"), {
      baseline: async () => true,
      memory,
      projects: projects(),
      workspaces,
      charts,
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "write",
        callID: "c1",
        args: { filePath: "f:/repo/a.ts", content: "changed" },
      },
      { title: "", output: "Wrote file successfully.", metadata: {} },
    )
    expect(memory.get(id)?.needsSave).toBe(true)

    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m1", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "final summary" } as never],
      },
    )

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("save_project_state")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_project_state",
        callID: "c2",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )
    expect(memory.get(id)?.needsSave).toBe(false)

    const final = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, final)
    expect(final.system.join("\n")).toContain("workspace")
  })
})
