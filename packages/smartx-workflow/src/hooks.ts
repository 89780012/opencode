import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { key, wantsFinal, wantsReview, type Analysis, type Chart, type Dirt, type Mode } from "./state.js"
import { loadBaselineRemote, loadChartRemote, loadProjectRemote, loadRemote, saveReviewRemote } from "./remote.js"
import type { Fix, Memory, Pending, Project, SaveReview } from "./types.js"
import { createWorkspace } from "./workspace.js"
import { ambient, python } from "./python.js"

const pythonPolicy =
  "In a SmartX workspace, run all Python through smartx_python. Use code for inline source or file for a workspace-relative .py script; do not invoke Python, package managers, or virtual environments through Bash."

type Dep = {
  workspaces?: Map<string, Analysis>
  charts?: Map<string, Chart>
  projects?: Map<string, Project>
  pending?: Map<string, Pending>
  dirtyStates?: Map<string, Dirt>
  memory?: Map<string, Memory>
  baselineModes?: Map<string, Mode>
  reviewFixes?: Map<string, Fix>
  reviewRequests?: Set<string>
  reviewRuns?: Set<string>
  finalRequests?: Set<string>
  childSessions?: Set<string>
  parent?: (id: string) => Promise<boolean>
  service?: string
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart?: (workspace: string, worktree: string) => Promise<Chart | undefined>
  loadProject?: (workspace: string, worktree: string) => Promise<Project | undefined>
  saveReview?: (input: SaveReview) => Promise<void>
  baseline?: () => Promise<boolean>
  runtime?: NonNullable<Parameters<typeof python>[0]>
}

/** 组装插件 hook，把 session 配对与 workspace 工作流接到同一个入口上。 */
export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const workspaces = dep.workspaces ?? new Map<string, Analysis>()
  const charts = dep.charts ?? new Map<string, Chart>()
  const projects = dep.projects ?? new Map<string, Project>()
  const pending = dep.pending ?? new Map<string, Pending>()
  const dirtyStates = dep.dirtyStates ?? new Map<string, Dirt>()
  const memory = dep.memory ?? new Map<string, Memory>()
  const baselineModes = dep.baselineModes ?? new Map<string, Mode>()
  const reviewFixes = dep.reviewFixes ?? new Map<string, Fix>()
  const reviewRequests = dep.reviewRequests ?? new Set<string>()
  const reviewRuns = dep.reviewRuns ?? new Set<string>()
  const finalRequests = dep.finalRequests ?? new Set<string>()
  const childSessions = dep.childSessions ?? new Set<string>()
  const workspace = ctx.directory
  const worktree = ctx.worktree || ctx.directory
  const id = workspace ? key(workspace, worktree) : ""
  const service = dep.service ?? Bun.env.STRATEGY_SERVICE_URL ?? ""
  const flags = new Map<string, boolean>()
  const active = dep.baseline ?? (() => loadBaselineRemote(service))
  const flag = async (session: string, fresh = false) => {
    if (!fresh && flags.has(session)) return flags.get(session) ?? false
    const on = await active().catch(() => false)
    flags.set(session, on)
    return on
  }
  /** 统一把插件内部事件写入 opencode 日志。 */
  const write = async (message: string, extra?: Record<string, unknown>) => {
    await ctx.client.app
      .log({
        body: {
          service: "smartx-workflow",
          level: "info",
          message,
          extra,
        },
      })
      .catch(() => {})
  }
  const workspaceFlow = createWorkspace({
    workspaces,
    charts,
    projects,
    pending,
    dirtyStates,
    memory,
    baselineModes,
    reviewFixes,
    reviewRequests,
    reviewRuns,
    finalRequests,
    childSessions,
    parent:
      dep.parent ??
      (async (id) => {
        const result = await ctx.client.session.get({ path: { id } })
        if (!result.data) throw new Error("session not found")
        return !!result.data.parentID
      }),
    workspace,
    worktree,
    id,
    load: dep.load ?? ((workspace, worktree) => loadRemote(service, workspace, worktree)),
    loadChart: dep.loadChart ?? ((workspace, worktree) => loadChartRemote(service, workspace, worktree)),
    loadProject: dep.loadProject ?? ((workspace, worktree) => loadProjectRemote(service, workspace, worktree)),
    saveReview: dep.saveReview ?? ((input) => saveReviewRemote(service, input)),
    write,
  })

  void write("plugin loaded", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    tool: {
      smartx_python: python({
        ...dep.runtime,
        start: (session) => workspaceFlow.taint(session, "smartx_python", flags.get(session) ?? false),
      }),
    },
    event: async (input) => {
      /** 记录子 session，避免把主工作区门禁错误地下放给子 agent。 */
      if (input.event.type === "session.created") {
        const info = input.event.properties?.info
        if (!info?.parentID || !info.id) return
        childSessions.add(info.id)
      }
    },
    "chat.message": async (input, output) => {
      /** 从用户文本里捕获 review/final 意图，留给 system 阶段注入提示。 */
      if (!id || !input.sessionID) return
      const text = output.parts
        .filter(
          (part): part is typeof part & { type: "text"; text: string } =>
            part.type === "text" && typeof part.text === "string",
        )
        .map((part) => part.text)
        .join("\n")

      // 解析到用户的文本
      write("chat.message", {
        sessionID: input.sessionID,
        workspace,
        worktree,
        text,
      })

      //识别是否是审查请求
      if (wantsReview(text)) {
        const request = id + "\x00" + input.sessionID
        const active =
          reviewRuns.has(request) || pending.get(request)?.kind === "review" || reviewFixes.has(request)
        if (!active) {
          reviewRequests.add(request)
          await write("workspace review requested", {
            sessionID: input.sessionID,
            workspace,
            worktree,
          })
        }
        if (active)
          await write("workspace duplicate review ignored", {
            sessionID: input.sessionID,
            workspace,
            worktree,
          })
      }

      //识别到是要求收尾的请求
      if (wantsFinal(text)) {
        finalRequests.add(id + "\x00" + input.sessionID)
        await write("workspace final requested", {
          sessionID: input.sessionID,
          workspace,
          worktree,
        })
      }
    },
    "experimental.chat.system.transform": async (input, output) => {
      /** 执行 workspace 级门禁提示。 */
      if (!input.sessionID) return
      output.system.push(pythonPolicy)
      await workspaceFlow.system(input, output, await flag(input.sessionID, true))
    },
    "tool.execute.before": async (input, output) => {
      /** 工具执行前做硬门禁和启动态标记。 */
      if (input.tool === "bash" && ambient(output.args))
        throw new Error("SmartX Python must run through smartx_python. Use code or a workspace-relative .py file.")
      await workspaceFlow.before(input, output, await flag(input.sessionID))
    },
    "tool.execute.after": async (input, output) => {
      /** 工具执行后推进 workspace 状态。 */
      await workspaceFlow.after(input, output, await flag(input.sessionID))
    },
  }
}
