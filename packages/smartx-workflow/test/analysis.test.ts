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
    expect(out.system.join("\n")).toContain("自动修复 3 轮")
    expect(reviewRequests.size).toBe(0)
    expect(rows.some((item) => item.message === "workspace review requested")).toBe(true)
  })

  test("asks the main agent to fix failed review before saving", async () => {
    const rows: Row[] = []
    const pending = new Map()
    const fixes = new Map()
    const hooks = build(ctx("f:/repo", rows), {
      pending,
      fixes,
    })
    const id = key("f:/repo", "f:/repo")
    const fixID = id + "\x00" + "s1"

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

    expect(pending.has(id)).toBe(false)
    expect(fixes.get(fixID)?.attempt).toBe(1)

    const fix = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, fix)
    expect(fix.system.join("\n")).toContain("main agent")
    expect(fix.system.join("\n")).toContain("of 3")
    expect(fix.system.join("\n")).toContain("strategy-reviewer")
    expect(fix.system.join("\n")).toContain("未发现止损规则")
    expect(rows.some((item) => item.message === "workspace review needs fix")).toBe(true)
  })

  test("saves review when it passes", async () => {
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
        args: { workspacePath: "f:/repo", worktreePath: "f:/repo" },
      },
      { title: "", output: "{}", metadata: {} },
    )

    expect(pending.has(id)).toBe(false)
    expect(workspaces.get(id)?.state).toBe("requested")
    expect(charts.get(id)?.state).toBe("requested")

    const next = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, next)
    expect(next.system.join("\n")).toContain("workspace-analyzer")
    expect(rows.some((item) => item.message === "workspace review completed")).toBe(true)
  })

  test("saves failed review after repair limit", async () => {
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

    expect(fixes.has(id + "\x00" + "s1")).toBe(false)
    expect(pending.get(id)?.kind).toBe("review")
    expect(pending.get(id)?.state).toBe("failed")
  })
})
