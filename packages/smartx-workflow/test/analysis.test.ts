import { describe, expect, test } from "bun:test"
import type { ToolContext } from "@opencode-ai/plugin"
import { build } from "../src/hooks.js"
import { disabled, loadRemote, loadWorkflowRemote, updateRunRemote } from "../src/remote.js"
import { backtest, debug, kind, python } from "../src/tool.js"
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
import type { Memory, Pending, Project, Run, RunStart, SaveReview } from "../src/types.js"

type Row = {
  message: string
  extra?: Record<string, unknown>
}

function record(rows: Row[], message: string) {
  return rows.find((item) => item.message.endsWith(" " + message))
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
  return new Map<string, Project>([
    [workspace(), { workspace: "f:/repo", worktree: "f:/repo", hasProjectState, updated: Date.now() }],
  ])
}

function setup(input: ReturnType<typeof ctx>, dep: Parameters<typeof build>[1] = {}) {
  let run: Run | undefined
  return build(input, {
    memory: restored(),
    projects: projects(),
    saveReview: async () => {},
    workflow: async () => ({ ...disabled, baseline: true }),
    loadRun: async () => run,
    startRun: async (row: RunStart) => {
      const now = Date.now()
      run = {
        id: `workflow-${row.codeRevision}`,
        workspacePath: row.workspacePath,
        sessionId: row.sessionId,
        codeRevision: row.codeRevision,
        stage: row.review ? "review" : row.debug ? "debug" : "backtest",
        state: "requested",
        reviewRound: 0,
        debugId: "",
        backtestId: "",
        reviewEnabled: row.review,
        debugEnabled: row.debug,
        backtestEnabled: row.backtest,
        summary: "",
        error: "",
        revision: 1,
        createdAt: now,
        updatedAt: now,
      }
      return run
    },
    updateRun: async (input) => {
      if (!run) throw new Error("workflow not started")
      run = { ...run, ...input, revision: run.revision + 1, updatedAt: Date.now() }
      return run
    },
    ...dep,
  })
}

async function terminal(hooks: ReturnType<typeof setup>, input: SaveReview) {
  const call = { args: input }
  const ctx = { sessionID: input.sessionId, tool: "smartx_save_review", callID: `save-${input.reviewId}` }
  await hooks["tool.execute.before"]?.(ctx, call)
  await hooks["tool.execute.after"]?.({ ...ctx, args: call.args }, { title: "", output: "{}", metadata: {} })
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

  test("matches only configured SmartX debug tools", () => {
    expect(debug({ tool: "smartx_start" })).toBe(true)
    expect(debug({ tool: "smartx_logs" })).toBe(true)
    expect(debug({ tool: "docker_start" })).toBe(false)
    expect(debug({ tool: "server_logs" })).toBe(false)
    expect(debug({ tool: "start" })).toBe(false)
  })

  test("binds manual SmartX debug calls to a persisted workflow run", async () => {
    const hooks = setup(ctx("f:/repo"))
    const start = { args: { name: "manual", extra: "keep" } }
    const logs = { args: { name: "manual", seconds: 2 } }

    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_start", callID: "manual-start" }, start)
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_logs", callID: "manual-logs" }, logs)

    expect(start.args).toEqual({
      extra: "keep",
      workspacePath: "f:/repo",
      sessionId: "s1",
      workflowId: "workflow-manual:manual-start",
      requestKey: "pipeline:workflow-manual:manual-start:start",
    })
    expect(logs.args).toEqual({
      seconds: 2,
      workspacePath: "f:/repo",
      sessionId: "s1",
      workflowId: "workflow-manual:manual-start",
      requestKey: "pipeline:workflow-manual:manual-start:logs",
      debugId: "",
    })
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
      globalThis.fetch = (async () =>
        Response.json({ data: { workbench: { intake: true }, workflow: { baseline: true } } })) satisfies typeof fetch
      expect(await loadWorkflowRemote("http://localhost:4096")).toEqual({ ...disabled, baseline: true })
      globalThis.fetch = (async () => Response.json({ data: { workflow: {} } })) satisfies typeof fetch
      expect(await loadWorkflowRemote("http://localhost:4096")).toEqual(disabled)
      globalThis.fetch = (async () => new Response("", { status: 500 })) satisfies typeof fetch
      expect(await loadWorkflowRemote("http://localhost:4096")).toEqual(disabled)
    } finally {
      globalThis.fetch = prev
    }
  })

  test("includes the service response when a workflow update fails", async () => {
    const prev = globalThis.fetch
    try {
      globalThis.fetch = (async () =>
        Response.json(
          { code: 400, msg: "invalid input: invalid workflow transition", data: null },
          { status: 400 },
        )) satisfies typeof fetch

      await expect(
        updateRunRemote("http://localhost:4096", {
          id: "workflow-1",
          workspacePath: "f:/repo",
          sessionId: "s1",
          stage: "review",
          state: "running",
        }),
      ).rejects.toThrow("invalid workflow transition")
    } finally {
      globalThis.fetch = prev
    }
  })

  test("skips and protects workspace baseline actions while disabled", async () => {
    const workspaces = new Map<string, Analysis>()
    const dirtyStates = new Map()
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      dirtyStates,
      workflow: async () => ({ ...disabled, baseline: false }),
    })
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
      hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_flowchart", callID: "chart" }, { args: {} }),
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
      workflow: async () => ({ ...disabled, baseline: false }),
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
      [
        id,
        {
          workspace: "f:/repo",
          worktree: "f:/repo",
          state: "done",
          mermaidCode: "flowchart TD",
          errorText: "",
          updated: 1,
        },
      ],
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
      workflow: async () => ({ ...disabled, baseline: on }),
    })

    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, { system: [] })
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
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      workflow: async () => ({ ...disabled, baseline: on }),
    })
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
    expect(noteAnalysis()).toContain("不写代码的策略研究、交易和运营人员")
    expect(noteAnalysis()).toContain("不得出现文件名、函数名、变量名")
    expect(noteAnalysis()).toContain("每次收到新报价后重新判断交易信号")
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
        output: ["<task_result>", '["read market","enter position"]', "</task_result>"].join("\n"),
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
    expect(record(rows, "workspace analysis completed")).toBeDefined()
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
        output: [
          "<task_result>",
          "```mermaid",
          "flowchart TD",
          "  A[Read market] --> B[End]",
          "```",
          "</task_result>",
        ].join("\n"),
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
    expect(record(rows, "workspace flowchart completed")).toBeDefined()
  })

  test("prioritizes workspace gates when baseline is missing", async () => {
    const workspaces = new Map<string, Analysis>()
    const hooks = setup(ctx(), { workspaces })

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.some((item) => item.includes("smartx_python"))).toBe(true)
    expect(first.system.some((item) => item.includes("workspace-analyzer"))).toBe(true)
  })

  test("does not hard block tools before analysis starts", async () => {
    const hooks = setup(ctx("f:/repo"))

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "edit", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "c3" },
        { args: { subagent_type: "workspace-analyzer" } },
      ),
    ).resolves.toBeUndefined()
  })

  test("does not hard block tools during baseline save phases", async () => {
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
        output: ["<task_result>", '["read market"]', "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "write", callID: "c2w" },
        { args: { filePath: "f:/repo/a.ts", content: "next" } },
      ),
    ).resolves.toBeUndefined()

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
      workflow: async () => ({ ...disabled, baseline: true }),
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

    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_run_backtest", callID: "call-1" }, output)

    expect(output.args).toEqual({
      workspacePath: "f:/repo",
      sessionId: "s1",
      requestKey: "pipeline:workflow-manual:call-1",
      workflowId: "workflow-manual:call-1",
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
        await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: item.tool, callID: "call-read" }, output)
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

  test("does not create an automatic pipeline for a restored child session", async () => {
    const id = workspace()
    let starts = 0
    const hooks = build(ctx("f:/repo"), {
      projects: projects(),
      memory: restored(),
      dirtyStates: new Map([[id, { state: "dirty", updated: 100, reason: "edit" }]]),
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      parent: async (session) => session === "s2",
      loadRun: async () => undefined,
      startRun: async () => {
        starts++
        throw new Error("child pipeline must not start")
      },
    })
    const out = { system: [] as string[] }

    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s2", model: {} as never }, out)

    expect(starts).toBe(0)
    expect(out.system.join("\n")).not.toContain("strategy-reviewer")
    expect(out.system.join("\n")).not.toContain("smartx_start")
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

  test("keeps baseline prompts non-blocking and preserves dirt after a failed Python execution", async () => {
    const blocked = setup(ctx("f:/repo"), { parent: async () => false })
    await expect(
      blocked["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_python", callID: "call-python-blocked" },
        { args: { description: "blocked", code: "print(1)" } },
      ),
    ).resolves.toBeUndefined()

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
      workflow: async () => ({ ...disabled, baseline: true }),
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
      hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_python", callID: "call-python" }, { args }),
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

  test("refresh prompts remain non-blocking while baseline is rebuilt", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
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
    expect(record(rows, "workspace refresh requested")).toBeDefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "read", callID: "c1" },
        { args: { filePath: "f:/repo/a.ts" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "write", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", content: "next" } },
      ),
    ).resolves.toBeUndefined()
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
    expect(record(rows, "workspace review requested")).toBeDefined()
  })

  test("rejects a reviewer that has no user request or review fix", async () => {
    const id = workspace()
    const saved: SaveReview[] = []
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

  test("hands a missing reviewer task output to the main agent", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    const pending = new Map()
    const runs = new Set<string>()
    const saved: SaveReview[] = []
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
      pending,
      reviewRequests: new Set([scope]),
      reviewRuns: runs,
      saveReview: async (input) => {
        saved.push(input)
      },
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
    expect(pending.get(scope)).toMatchObject({
      kind: "review",
      reviewId: "review-1",
      sessionId: "s1",
      reviewText: "审查智能体未返回审查报告。",
    })
    expect(saved).toHaveLength(1)
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

  test("hands an empty reviewer result to the main agent", async () => {
    const pending = new Map()
    const saved: SaveReview[] = []
    const hooks = setup(ctx("f:/repo"), {
      pending,
      saveReview: async (input) => {
        saved.push(input)
      },
    })
    const scope = workspace() + "\x00s1"

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-empty", args: { subagent_type: "strategy-reviewer" } },
      { title: "", output: "", metadata: {} },
    )

    expect(pending.get(scope)).toMatchObject({
      kind: "review",
      reviewId: "review-empty",
      sessionId: "s1",
      reviewText: "审查智能体未返回审查报告。",
    })
    expect(saved).toHaveLength(0)
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
    pending.set(workspace() + "\x00s1", {
      kind: "review",
      reviewId: "review-1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      reviewText: "通过",
    })

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
    await expect(
      call([{ name: "review", status: "running", detail: "still running", suggestion: "" }]),
    ).rejects.toThrow("valid statuses")
    await expect(call([{ name: "", status: "passed", detail: "passed", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(call([{ name: "review", status: "passed", detail: "", suggestion: "" }])).rejects.toThrow(
      "valid statuses",
    )
    await expect(call([{ name: "review", status: "passed", detail: "passed", suggestion: "" }], "")).rejects.toThrow(
      "non-empty terminal review summary",
    )
    expect(pending.has(workspace() + "\x00s1")).toBe(true)
  })

  test("lets the main agent interpret the report while enforcing terminal item aggregation", async () => {
    const pending = new Map()
    const hooks = setup(ctx("f:/repo"), { pending })
    pending.set(workspace() + "\x00s1", {
      kind: "review",
      reviewId: "review-1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      reviewText: "缺少止损",
    })

    await hooks["tool.execute.before"]?.(
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
    )
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
      pending,
      reviewFixes: fixes,
    })
    pending.set(scope, {
      kind: "review",
      reviewId: "review-1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
      reviewText: "缺少止损",
    })
    fixes.set(scope, {
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      sessionID: "s1",
      attempt: 1,
      reviewText: "缺少止损",
    })
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
    expect(record(rows, "workspace review saved through mcp")?.extra?.state).toBe("error")
  })

  test("isolates concurrent reviewer reports by session and review id", async () => {
    const saved: SaveReview[] = []
    const pending = new Map<string, Pending>()
    const hooks = setup(ctx("f:/repo"), {
      pending,
      saveReview: async (input) => {
        saved.push(input)
      },
    })
    const output = (summary: string) => `审查结论：无法完成\n\n${summary}`

    await Promise.all([
      hooks["tool.execute.after"]?.(
        { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
        { title: "", output: output("第一轮审查执行失败"), metadata: {} },
      ),
      hooks["tool.execute.after"]?.(
        { sessionID: "s2", tool: "task", callID: "review-2", args: { subagent_type: "strategy-reviewer" } },
        { title: "", output: output("第二轮审查执行失败"), metadata: {} },
      ),
    ])

    expect(saved).toHaveLength(0)
    expect(pending.get(workspace() + "\x00s1")).toMatchObject({
      reviewId: "review-1",
      reviewText: output("第一轮审查执行失败"),
    })
    expect(pending.get(workspace() + "\x00s2")).toMatchObject({
      reviewId: "review-2",
      reviewText: output("第二轮审查执行失败"),
    })
  })

  test("saves failed review before asking the main agent to fix it", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const fixes = new Map()
    const saved: SaveReview[] = []
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
      saveReview: async (input) => {
        saved.push(input)
      },
    })
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"]))
    charts.set(id, {
      workspace: "f:/repo",
      worktree: "f:/repo",
      state: "done",
      mermaidCode: "flowchart TD",
      errorText: "",
      updated: Date.now(),
    })

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
        output: "审查结论：未通过\n\n风险控制：缺少止损保护。\n\n建议：增加止损规则。",
        metadata: {},
      },
    )

    expect(pending.has(scope)).toBe(true)
    await terminal(hooks, {
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
      summary: "缺少止损保护",
      items: [{ name: "风险控制", status: "failed", detail: "缺少止损保护", suggestion: "增加止损规则" }],
      suggestions: ["增加止损规则"],
    })
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
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
    expect(fix.system.join("\n")).toContain("缺少止损保护")
    expect(record(rows, "workspace review needs fix")).toBeDefined()

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
    charts.set(id, {
      workspace: "f:/repo",
      worktree: "f:/repo",
      state: "done",
      mermaidCode: "flowchart TD",
      errorText: "",
      updated: Date.now(),
    })
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
    const saved: SaveReview[] = []
    const hooks = setup(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
      memory: restored(true),
      saveReview: async (input) => {
        saved.push(input)
      },
    })
    const id = key("f:/repo", "f:/repo")
    const scope = id + "\x00s1"
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["old analysis"]))
    charts.set(id, {
      workspace: "f:/repo",
      worktree: "f:/repo",
      state: "done",
      mermaidCode: "flowchart TD",
      errorText: "",
      updated: Date.now(),
    })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: "审查结论：通过\n\n需求覆盖完整，未发现阻断问题。",
        metadata: {},
      },
    )

    expect(pending.has(scope)).toBe(true)
    await terminal(hooks, {
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "passed",
      summary: "未发现阻断问题",
      items: [{ name: "需求覆盖", status: "passed", detail: "实现满足需求", suggestion: "" }],
      suggestions: [],
    })
    expect(pending.has(scope)).toBe(false)
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")

    const memory = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, memory)
    expect(memory.system.join("\n")).toContain("save_project_state")

    const project = {
      args: { workspacePath: "f:/repo", worktreePath: "f:/repo", dirty: false },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_project_state", callID: "c3" }, project)
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
    expect(record(rows, "project memory save reminder injected")).toBeDefined()
  })

  test("injects automatic close reminder after dirty changes", async () => {
    const id = key("f:/repo", "f:/repo")
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

  test("fixes a saved review when any item fails", async () => {
    const pending = new Map()
    const fixes = new Map()
    const id = key("f:/repo", "f:/repo")
    const hooks = setup(ctx("f:/repo"), {
      pending,
      reviewFixes: fixes,
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
        output: "审查结论：未通过\n\n需求已覆盖，但风险控制需要加强。\n\n建议：增加风险保护。",
        metadata: {},
      },
    )

    expect(pending.has(scope)).toBe(true)
    await terminal(hooks, {
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
      summary: "风险控制需要加强",
      items: [
        { name: "需求覆盖", status: "passed", detail: "需求已覆盖", suggestion: "" },
        { name: "风险控制", status: "failed", detail: "风险控制需要加强", suggestion: "增加风险保护" },
      ],
      suggestions: ["增加风险保护"],
    })
    expect(pending.has(scope)).toBe(false)
    expect(fixes.get(scope)?.attempt).toBe(1)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("风险控制需要加强")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
  })

  test("stops after the third failed review is saved", async () => {
    const pending = new Map()
    const scope = key("f:/repo", "f:/repo") + "\x00" + "s1"
    const fixes = new Map([
      [
        scope,
        {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          sessionID: "s1",
          attempt: 3,
          reviewText: "review conclusion: failed",
        },
      ],
    ])
    let run: Run = {
      id: "workflow-third",
      workspacePath: "f:/repo",
      sessionId: "s1",
      codeRevision: "code-1",
      stage: "review",
      state: "running",
      reviewRound: 3,
      debugId: "",
      backtestId: "",
      reviewEnabled: true,
      debugEnabled: true,
      backtestEnabled: true,
      summary: "",
      error: "",
      revision: 3,
      createdAt: 1,
      updatedAt: 3,
    }
    const workflowRuns = new Map([[scope, run]])
    const hooks = setup(ctx("f:/repo"), {
      pending,
      reviewFixes: fixes,
      workflowRuns,
      updateRun: async (input) => {
        run = { ...run, ...input, revision: run.revision + 1, updatedAt: run.updatedAt + 1 }
        workflowRuns.set(scope, run)
        return run
      },
    })
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: "审查结论：未通过\n\n风险控制仍然缺少止损。",
        metadata: {},
      },
    )

    expect(pending.has(scope)).toBe(true)
    await terminal(hooks, {
      reviewId: "c1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "failed",
      summary: "仍然缺少止损",
      items: [{ name: "风险控制", status: "failed", detail: "仍然缺少止损", suggestion: "增加止损" }],
      suggestions: ["增加止损"],
    })
    expect(pending.has(scope)).toBe(false)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).not.toContain("最后一次自动修复")
    expect(fix.system.join("\n")).not.toContain("待修复的审查报告")
    expect(fixes.has(scope)).toBe(false)
    expect(run).toMatchObject({ stage: "review", state: "review_exhausted", reviewRound: 3 })
  })

  test("runs automatic review, debug, and backtest in order", async () => {
    const id = workspace()
    const scope = id + "\x00s1"
    let current: Run | undefined
    const workflowRuns = new Map<string, Run>()
    const pending = new Map<string, Pending>()
    const update = async (input: Parameters<NonNullable<Parameters<typeof build>[1]["updateRun"]>>[0]) => {
      current = { ...current!, ...input, revision: current!.revision + 1, updatedAt: current!.updatedAt + 1 }
      return current
    }
    const hooks = build(ctx(), {
      workflowRuns,
      pending,
      projects: projects(),
      memory: restored(),
      dirtyStates: new Map([[id, { state: "dirty", updated: 100, reason: "edit" }]]),
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      startRun: async (input) => {
        current = {
          id: "workflow-1",
          workspacePath: input.workspacePath,
          sessionId: input.sessionId,
          codeRevision: input.codeRevision,
          stage: "review",
          state: "requested",
          reviewRound: 0,
          debugId: "",
          backtestId: "",
          reviewEnabled: true,
          debugEnabled: true,
          backtestEnabled: true,
          summary: "",
          error: "",
          revision: 1,
          createdAt: 100,
          updatedAt: 100,
        }
        return current
      },
      updateRun: update,
      saveReview: async () => {},
    })

    const reviewNote = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, reviewNote)
    expect(reviewNote.system.join("\n")).toContain("strategy-reviewer")
    expect(current?.stage).toBe("review")

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    expect(current).toMatchObject({ state: "running", reviewRound: 1 })
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      {
        title: "",
        output: "审查结论：通过\n\n语法检查通过。",
        metadata: {},
      },
    )
    expect(pending.has(scope)).toBe(true)
    await terminal(hooks, {
      reviewId: "review-1",
      sessionId: "s1",
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      state: "passed",
      summary: "审查通过",
      items: [{ name: "语法", status: "passed", detail: "检查通过", suggestion: "" }],
      suggestions: [],
    })
    expect(pending.has(scope)).toBe(false)
    expect(current?.stage).toBe("debug")

    const startNote = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, startNote)
    expect(startNote.system.join("\n")).toContain("smartx_start")
    const start = { args: { name: "forged" } as Record<string, unknown> }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_start", callID: "start-1" }, start)
    expect(start.args).toMatchObject({ workflowId: "workflow-1", workspacePath: "f:/repo", sessionId: "s1" })
    expect(start.args.name).toBeUndefined()
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_start", callID: "start-1", args: start.args },
      { title: "", output: JSON.stringify({ debugId: "debug-1", live: true }), metadata: {} },
    )
    expect(current).toMatchObject({ stage: "debug", state: "running", debugId: "debug-1" })

    const logsNote = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, logsNote)
    expect(logsNote.system.join("\n")).toContain("smartx_logs")
    const logs = { args: {} as Record<string, unknown> }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_logs", callID: "logs-1" }, logs)
    expect(logs.args).toMatchObject({ workflowId: "workflow-1", debugId: "debug-1" })
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_logs", callID: "logs-1", args: logs.args },
      { title: "", output: JSON.stringify({ state: "passed", summary: "ok" }), metadata: {} },
    )
    expect(current).toMatchObject({ stage: "backtest", state: "requested" })

    const backtestNote = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, backtestNote)
    expect(backtestNote.system.join("\n")).toContain("smartx_run_backtest")
    const backtestCall = { args: {} as Record<string, unknown> }
    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "smartx_run_backtest", callID: "backtest-1" },
      backtestCall,
    )
    expect(backtestCall.args).toMatchObject({ workflowId: "workflow-1", requestKey: "pipeline:workflow-1" })
    expect(workflowRuns.get(scope)?.id).toBe("workflow-1")
  })

  test("prompts for project memory restore without hard blocking work", async () => {
    const hooks = build(ctx("f:/repo"), {
      workflow: async () => ({ ...disabled, baseline: true }),
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

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "edit", callID: "c2" },
        { args: { filePath: "f:/repo/a.ts", oldString: "a", newString: "b" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "skill", callID: "c3" },
        { args: { name: "smartx-develop" } },
      ),
    ).resolves.toBeUndefined()

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_save_project_state", callID: "c4" },
        { args: { workspacePath: "f:/repo", worktreePath: "f:/repo", dirty: false } },
      ),
    ).resolves.toBeUndefined()
  })

  test("initializes missing project memory and then enters baseline flow", async () => {
    const memory = new Map<string, Memory>()
    const workspaces = new Map<string, Analysis>()
    const hooks = build(ctx("f:/repo"), {
      workflow: async () => ({ ...disabled, baseline: true }),
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

  test("does not report project memory failures for unrelated tools", async () => {
    const rows: Row[] = []
    const hooks = setup(ctx("f:/repo", rows))

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "read", callID: "c1", args: { filePath: "f:/repo/start.py" } },
      { title: "", output: "content", metadata: {} },
    )

    expect(record(rows, "project memory initialization failed")).toBeUndefined()
    expect(record(rows, "project memory resume failed")).toBeUndefined()
  })

  test("reports a failed project memory initialization", async () => {
    const rows: Row[] = []
    const hooks = setup(ctx("f:/repo", rows))

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_init_project_state",
        callID: "c1",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "failed", metadata: {}, isError: true } as never,
    )

    expect(record(rows, "project memory initialization failed")).toBeDefined()
    expect(record(rows, "project memory resume failed")).toBeUndefined()
  })

  test("loads persisted baseline after project memory restore", async () => {
    const memory = new Map<string, Memory>()
    const workspaces = new Map<string, Analysis>([[workspace(), requestAnalysis("f:/repo", "f:/repo")]])
    const charts = new Map<string, Chart>()
    const hooks = build(ctx("f:/repo"), {
      workflow: async () => ({ ...disabled, baseline: true }),
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

  test("keeps a requested refresh ahead of a stale persisted baseline", async () => {
    const id = workspace()
    const workspaces = new Map<string, Analysis>([[id, requestAnalysis("f:/repo", "f:/repo")]])
    const charts = new Map<string, Chart>([[id, requestChart("f:/repo", "f:/repo")]])
    const baselineModes = new Map([[id, "refresh" as const]])
    let loads = 0
    let chartLoads = 0
    const hooks = setup(ctx("f:/repo"), {
      workspaces,
      charts,
      baselineModes,
      load: async () => {
        loads++
        return doneAnalysis("f:/repo", "f:/repo", "stale", ["stale"])
      },
      loadChart: async () => {
        chartLoads++
        return {
          workspace: "f:/repo",
          worktree: "f:/repo",
          state: "done",
          mermaidCode: "flowchart TD\nA-->B",
          errorText: "",
          updated: Date.now(),
        }
      },
    })

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(loads).toBe(0)
    expect(chartLoads).toBe(0)
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(out.system.join("\n")).toContain("workspace-analyzer")
  })

  test("marks project memory stale after writes and requires save before final wrap-up", async () => {
    const id = workspace()
    const memory = restored()
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
      workflow: async () => ({ ...disabled, baseline: true }),
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
