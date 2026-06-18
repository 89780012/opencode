import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { createPairing } from "./pairing.js"
import { key, wantsReview, type Analysis, type Chart, type Flow } from "./state.js"
import { createWorkspace, loadChartRemote, loadRemote, saveReviewRemote, type Fix, type Pending, type SaveReview } from "./workspace.js"

type Dep = {
  mem?: Map<string, Flow>
  workspaces?: Map<string, Analysis>
  charts?: Map<string, Chart>
  pending?: Map<string, Pending>
  fixes?: Map<string, Fix>
  reviewRequests?: Set<string>
  debugs?: Set<string>
  service?: string
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart?: (workspace: string, worktree: string) => Promise<Chart | undefined>
  saveReview?: (input: SaveReview) => Promise<void>
}

export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const mem = dep.mem ?? new Map<string, Flow>()
  const workspaces = dep.workspaces ?? new Map<string, Analysis>()
  const charts = dep.charts ?? new Map<string, Chart>()
  const pending = dep.pending ?? new Map<string, Pending>()
  const fixes = dep.fixes ?? new Map<string, Fix>()
  const reviewRequests = dep.reviewRequests ?? new Set<string>()
  const debugs = dep.debugs ?? new Set<string>()
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
    pending,
    fixes,
    reviewRequests,
    debugs,
    workspace,
    worktree,
    id,
    load: dep.load ?? ((workspace, worktree) => loadRemote(service, workspace, worktree)),
    loadChart: dep.loadChart ?? ((workspace, worktree) => loadChartRemote(service, workspace, worktree)),
    saveReview: dep.saveReview ?? ((input) => saveReviewRemote(service, input)),
    write,
  })
  const pairing = createPairing({ mem, write })

  void write("plugin loaded", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    "chat.message": async (input, output) => {
      if (!id || !input.sessionID) return
      const text = output.parts
        .filter((part): part is typeof part & { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text)
        .join("\n")
      if (!wantsReview(text)) return
      reviewRequests.add(id + "\x00" + input.sessionID)
      await write("workspace review requested", {
        sessionID: input.sessionID,
        workspace,
        worktree,
      })
    },
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return

      const handled = await workspaceFlow.system(input, output)
      if (handled) return

      await pairing.transform(input, output)
    },
    "tool.execute.before": async (input, output) => {
      await workspaceFlow.before(input, output)
    },
    "tool.execute.after": async (input, output) => {
      await workspaceFlow.after(input, output)
      await pairing.after(input)
    },
  }
}
