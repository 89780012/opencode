import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { createPairing } from "./pairing.js"
import { key, type Analysis, type Chart, type Flow } from "./state.js"
import {
  createWorkspace,
  loadChartRemote,
  loadRemote,
  saveChartRemote,
  saveRemote,
  type Save,
  type SaveChart,
} from "./workspace.js"

type Dep = {
  mem?: Map<string, Flow>
  workspaces?: Map<string, Analysis>
  charts?: Map<string, Chart>
  service?: string
  save?: (input: Save) => Promise<void>
  saveChart?: (input: SaveChart) => Promise<void>
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart?: (workspace: string, worktree: string) => Promise<Chart | undefined>
}

export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const mem = dep.mem ?? new Map<string, Flow>()
  const workspaces = dep.workspaces ?? new Map<string, Analysis>()
  const charts = dep.charts ?? new Map<string, Chart>()
  const workspace = ctx.directory
  const worktree = ctx.worktree || ctx.directory
  const id = workspace ? key(workspace, worktree) : ""
  const service = dep.service ?? Bun.env.STRATEGY_SERVICE_URL ?? ""
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
    workspace,
    worktree,
    id,
    save: dep.save ?? ((input) => saveRemote(service, input)),
    chart: dep.saveChart ?? ((input) => saveChartRemote(service, input)),
    load: dep.load ?? ((workspace, worktree) => loadRemote(service, workspace, worktree)),
    loadChart: dep.loadChart ?? ((workspace, worktree) => loadChartRemote(service, workspace, worktree)),
    write,
  })
  const pairing = createPairing({ mem, write })

  void write("插件已加载", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return

      // 工作区门禁优先：先 analyzer，再 flowchart；命中后本轮不再追加配对提示，避免主 agent 收到两个“下一步”。
      if (await workspaceFlow.transform(input, output)) return
      await pairing.transform(input, output)
    },
    "tool.execute.before": async (input, output) => {
      await workspaceFlow.before(input, output)
    },
    "tool.execute.after": async (input, output) => {
      if (await workspaceFlow.after(input, output)) return
      await pairing.after(input)
    },
  }
}
