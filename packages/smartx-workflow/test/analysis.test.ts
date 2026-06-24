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
  review,
  wantsReview,
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

describe("smartx workspace analysis", () => {
  test("detects workspace task calls and review requests", () => {
    expect(analyze({ tool: "task", args: { subagent_type: "workspace-analyzer" } })).toBe(true)
    expect(analyze({ tool: "task", args: { subagent_type: "general" } })).toBe(false)
    expect(analyze("read")).toBe(false)
    expect(flowchart({ tool: "task", args: { subagent_type: "strategy-flowchart-generator" } })).toBe(true)
    expect(review({ tool: "task", args: { subagent_type: "strategy-reviewer" } })).toBe(true)
    expect(wantsReview("审查")).toBe(true)
    expect(wantsReview("请帮我做代码审查")).toBe(true)
    expect(wantsReview("麻烦 review 一下当前实现")).toBe(true)
    expect(wantsReview("需要提交审查")).toBe(true)
    expect(wantsReview("不要审查")).toBe(false)
    expect(wantsReview("审查结论：通过")).toBe(false)
    expect(wantsReview("请帮我写代码")).toBe(false)
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
    const hooks = build(ctx("f:/repo", rows), {
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
    const hooks = build(ctx("f:/repo", rows), {
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
    const hooks = build(ctx(), {
      workspaces,
      mem,
    })

    const first = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, first)

    expect(first.system.length).toBe(1)
    expect(first.system.join("\n")).toContain("workspace-analyzer")
    expect(first.system.join("\n")).not.toContain("smartx_logs")
  })

  test("allows read tools before analysis starts but blocks writes", async () => {
    const hooks = build(ctx("f:/repo"))

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
    const hooks = build(ctx("f:/repo"), {
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
    const hooks = build(ctx("f:/repo"))

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

  test("refresh tool allows reads and blocks writes until refreshed baseline is rebuilt", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() }],
    ])
    const pending = new Map()
    const hooks = build(ctx("f:/repo", rows), {
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
      code: "flowchart TD",
      err: "",
    })
    const hooks = build(ctx("f:/repo"), {
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

  test("injects hidden review workflow when user asks for review", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const reviewRequests = new Set<string>()
    const hooks = build(ctx("f:/repo", rows), {
      workspaces: new Map([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]]),
      charts: new Map([
        [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() }],
      ]),
      reviewRequests,
    })

    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m1", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "审查" } as never],
      },
    )

    const out = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, out)

    expect(out.system.join("\n")).toContain("smartx_get_requirements")
    expect(out.system.join("\n")).toContain("strategy-reviewer")
    expect(out.system.join("\n")).toContain("每一轮")
    expect(out.system.join("\n")).toContain("第 3 轮")
    expect(reviewRequests.size).toBe(0)
    expect(rows.some((item) => item.message === "workspace review requested")).toBe(true)
  })

  test("saves failed review before asking the main agent to fix it", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const fixes = new Map()
    const hooks = build(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
      fixes,
    })
    const id = key("f:/repo", "f:/repo")
    const fixID = id + "\x00" + "s1"
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"]))
    charts.set(id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() })

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
        output: ["<task_result>", "审查结论：未通过\n\n问题：未发现止损规则。\n建议：补充止损和异常行情保护。", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(pending.get(id)?.kind).toBe("review")
    expect(pending.get(id)?.state).toBe("failed")
    expect(fixes.get(fixID)?.attempt).toBe(1)

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")
    expect(save.system.join("\n")).toContain("审查报告")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "failed",
          items: [{ name: "风控规则", status: "failed", detail: "未发现止损规则", suggestion: "补充止损" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(fixes.get(fixID)?.attempt).toBe(1)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("审查结果已经")
    expect(fix.system.join("\n")).toContain("主 agent")
    expect(fix.system.join("\n")).toContain("最多 3 次")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
    expect(fix.system.join("\n")).toContain("不要再次调用 `smartx_save_review`")
    expect(fix.system.join("\n")).toContain("未发现止损规则")
    expect(rows.some((item) => item.message === "workspace review needs fix")).toBe(true)
  })

  test("queues debug after a passed review and finalizes with one last refresh after later edits", async () => {
    const rows: Row[] = []
    const workspaces = new Map<string, Analysis>()
    const charts = new Map<string, Chart>()
    const pending = new Map()
    const fixes = new Map()
    const hooks = build(ctx("f:/repo", rows), {
      workspaces,
      charts,
      pending,
      fixes,
    })
    const id = key("f:/repo", "f:/repo")
    workspaces.set(id, doneAnalysis("f:/repo", "f:/repo", "", ["old analysis"]))
    charts.set(id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() })

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "审查结论：通过\n\n未发现阻塞问题。", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(pending.get(id)?.kind).toBe("review")
    expect(pending.get(id)?.state).toBe("passed")

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")
    expect(save.system.join("\n")).toContain("未发现阻塞问题")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "passed",
          items: [{ name: "需求覆盖情况", status: "passed", detail: "通过", suggestion: "" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.get(id)?.kind).toBe("debug")

    const start = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, start)
    expect(start.system.join("\n")).toContain("smartx_start")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "write",
        callID: "c7",
        args: { filePath: "f:/repo/a.ts", content: "changed" },
      },
      { title: "", output: "Wrote file successfully.", metadata: {} },
    )

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "smartx_start", callID: "c8" },
        { args: {} },
      ),
    ).resolves.toBeUndefined()

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_start",
        callID: "c9",
        args: {},
      },
      { title: "", output: "{}", metadata: {} },
    )

    await hooks["chat.message"]?.(
      { sessionID: "s1", messageID: "m2", agent: "smartx-helper" },
      {
        message: {} as never,
        parts: [{ type: "text", text: "给我一个最终总结" } as never],
      },
    )

    const refresh = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, refresh)
    expect(refresh.system.join("\n")).toContain("最后刷新一次 workspace 分析和流程图")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c10",
        args: { subagent_type: "workspace-analyzer" },
      },
      { title: "", output: '<task_result>["新的策略逻辑"]</task_result>', metadata: {} },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_analysis",
        callID: "c11",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c12",
        args: { subagent_type: "strategy-flowchart-generator" },
      },
      { title: "", output: "<task_result>flowchart TD\nA-->B</task_result>", metadata: {} },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_flowchart",
        callID: "c13",
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(rows.some((item) => item.message === "workspace final requested")).toBe(true)
  })

  test("injects an automatic close reminder before a dirty workspace naturally wraps up", async () => {
    const rows: Row[] = []
    const id = key("f:/repo", "f:/repo")
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() }],
    ])
    const hooks = build(ctx("f:/repo", rows), {
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

    expect(out.system.join("\n")).toContain("如果你这一轮准备直接结束工作、给出收尾回复或最终总结")
    expect(workspaces.get(id)?.state).toBe("done")
    expect(charts.get(id)?.state).toBe("done")
    expect(rows.some((item) => item.message === "workspace close reminder injected")).toBe(true)
  })

  test("keeps pairing reminders ahead of automatic close reminders", async () => {
    const id = key("f:/repo", "f:/repo")
    const mem = new Map([["s1", { ...fresh("s1"), logs: 1 }]])
    const workspaces = new Map<string, Analysis>([[id, doneAnalysis("f:/repo", "f:/repo", "", ["read market"])]])
    const charts = new Map<string, Chart>([
      [id, { workspace: "f:/repo", worktree: "f:/repo", state: "done", code: "flowchart TD", err: "", updated: Date.now() }],
    ])
    const hooks = build(ctx("f:/repo"), {
      mem,
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

    expect(out.system.join("\n")).toContain("smartx_logs")
    expect(out.system.join("\n")).not.toContain("如果你这一轮准备直接结束工作、给出收尾回复或最终总结")
  })

  test("fixes saved review when any item is not passed", async () => {
    const pending = new Map()
    const fixes = new Map()
    const hooks = build(ctx("f:/repo"), {
      pending,
      fixes,
    })
    const id = key("f:/repo", "f:/repo")
    const fixID = id + "\x00" + "s1"

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "审查结论：通过\n\n风险：风控规则需要补强。", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "passed",
          items: [
            { name: "需求覆盖情况", status: "passed", detail: "通过", suggestion: "" },
            { name: "风控规则", status: "warning", detail: "需要补强", suggestion: "补充风控" },
          ],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(fixes.get(fixID)?.attempt).toBe(1)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("需要补强")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
  })

  test("saves third failed review before the final fix", async () => {
    const pending = new Map()
    const fixes = new Map([[key("f:/repo", "f:/repo") + "\x00" + "s1", {
      workspacePath: "f:/repo",
      worktreePath: "f:/repo",
      sessionID: "s1",
      attempt: 3,
      text: "审查结论：未通过",
    }]])
    const hooks = build(ctx("f:/repo"), {
      pending,
      fixes,
    })
    const id = key("f:/repo", "f:/repo")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "c1",
        args: { subagent_type: "strategy-reviewer" },
      },
      {
        title: "",
        output: ["<task_result>", "审查结论：未通过\n\n问题：仍缺少止损。", "</task_result>"].join("\n"),
        metadata: {},
      },
    )

    expect(fixes.get(id + "\x00" + "s1")?.attempt).toBe(3)
    expect(pending.get(id)?.kind).toBe("review")
    expect(pending.get(id)?.state).toBe("failed")

    const save = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, save)
    expect(save.system.join("\n")).toContain("smartx_save_review")

    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "smartx_save_review",
        callID: "c2",
        args: {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "failed",
          items: [{ name: "风控规则", status: "failed", detail: "仍缺少止损", suggestion: "补充止损" }],
        },
      },
      { title: "", output: "{}", metadata: {} },
    )

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("第 3 次修复")
    expect(fix.system.join("\n")).toContain("最后一次自动修复")
    expect(fix.system.join("\n")).toContain("不要再次调用 `strategy-reviewer`")
    expect(fix.system.join("\n")).toContain("不要调用 `smartx_start`")
    expect(fixes.has(id + "\x00" + "s1")).toBe(false)
  })
})
