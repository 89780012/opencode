import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import {
  analyze,
  doneAnalysis,
  fresh,
  freshAnalysis,
  items,
  key,
  note,
  noteAnalysis,
  numbered,
  requestAnalysis,
  seen,
  touch,
  validAnalysis,
  type Analysis,
  type Flow,
} from "./state.js"

type Dep = {
  mem?: Map<string, Flow>
  workspaces?: Map<string, Analysis>
  service?: string
  save?: (input: Save) => Promise<void>
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
}

type Save = {
  workspacePath: string
  worktreePath: string
  items: string[]
  text: string
}

type Row = Save & {
  updatedAt: number
}

export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const mem = dep.mem ?? new Map<string, Flow>()
  const workspaces = dep.workspaces ?? new Map<string, Analysis>()
  const workspace = ctx.directory
  const worktree = ctx.worktree || ctx.directory
  const id = workspace ? key(workspace, worktree) : ""
  const service = dep.service ?? Bun.env.STRATEGY_SERVICE_URL ?? ""
  const save = dep.save ?? ((input: Save) => saveRemote(service, input))
  const load = dep.load ?? ((workspace: string, worktree: string) => loadRemote(service, workspace, worktree))
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
  void write("插件已加载", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return
      if (workspace && id) {
        const found = workspaces.get(id) ?? (await load(workspace, worktree).catch(() => undefined))
        if (found && validAnalysis(found)) workspaces.set(id, found)
        if (found && !validAnalysis(found)) workspaces.delete(id)
        const analysis = workspaces.get(id)
        if (!analysis || analysis.state === "requested") {
          if (!analysis) workspaces.set(id, requestAnalysis(workspace, worktree))
          await write("workspace analysis gate injected", {
            sessionID: input.sessionID,
            workspace,
            worktree,
            state: analysis?.state ?? "missing",
          })
          output.system.push(noteAnalysis())
        }
      }
      const flow = mem.get(input.sessionID)
      if (!flow || (flow.logs < 1 && flow.debug < 1)) return
      await write("注入顺序约束提示", {
        sessionID: input.sessionID,
        logs: flow.logs,
        debug: flow.debug,
      })
      output.system.push(note(flow))
    },
    "tool.execute.before": async (input, output) => {
      if (!workspace || !id) return
      if (!analyze({ tool: input.tool, args: output.args })) return
      workspaces.set(id, freshAnalysis(workspace, worktree))
      await write("workspace analysis started", {
        sessionID: input.sessionID,
        workspace,
        worktree,
      })
    },
    "tool.execute.after": async (input, output) => {
      if (workspace && id && analyze(input)) {
        const list = items(output.output)
        const text = numbered(list)
        workspaces.set(id, doneAnalysis(workspace, worktree, text, list))
        if (list.length > 0) {
          await save({
            workspacePath: workspace,
            worktreePath: worktree,
            items: list,
            text,
          }).catch((err) =>
            write("workspace analysis save failed", {
              workspace,
              worktree,
              error: err instanceof Error ? err.message : String(err),
            }),
          )
        }
        await write("workspace analysis completed", {
          sessionID: input.sessionID,
          workspace,
          worktree,
          items: list.length,
        })
        return
      }
      if (!seen(input)) return
      const prev = mem.get(input.sessionID) ?? fresh(input.sessionID)
      const next = touch(prev, input)
      mem.set(input.sessionID, next)
      await write("命中关键工具并更新状态", {
        sessionID: input.sessionID,
        tool: input.tool,
        name: typeof input.args?.name === "string" ? input.args.name.trim() : undefined,
        logs_before: prev.logs,
        logs_after: next.logs,
        debug_before: prev.debug,
        debug_after: next.debug,
      })
    },
  }
}

async function saveRemote(service: string, input: Save) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/analysis", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save analysis failed: ${resp.status}`)
}

async function loadRemote(service: string, workspace: string, worktree: string) {
  if (!service) return undefined
  const url = new URL("/api/workbench/analysis", service)
  url.searchParams.set("workspacePath", workspace)
  url.searchParams.set("worktreePath", worktree)
  const resp = await fetch(url)
  if (!resp.ok) return undefined
  const body = (await resp.json()) as { data?: Row | null }
  if (!body.data) return undefined
  return {
    workspace: body.data.workspacePath,
    worktree: body.data.worktreePath,
    state: "done" as const,
    items: body.data.items ?? [],
    text: body.data.text ?? "",
    updated: body.data.updatedAt ?? Date.now(),
  }
}
