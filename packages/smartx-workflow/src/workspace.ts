import type { Hooks } from "@opencode-ai/plugin"
import {
  analyze,
  doneChart,
  doneAnalysis,
  flowchart,
  freshChart,
  freshAnalysis,
  items,
  mermaid,
  noteAnalysis,
  noteChart,
  numbered,
  requestAnalysis,
  requestChart,
  validAnalysis,
  validChart,
  type Analysis,
  type Chart,
} from "./state.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type Before = NonNullable<Hooks["tool.execute.before"]>
type After = NonNullable<Hooks["tool.execute.after"]>

export type Save = {
  workspacePath: string
  worktreePath: string
  state?: "running" | "done"
  items: string[]
  text: string
}

type Row = Save & {
  updatedAt: number
}

export type SaveChart = {
  workspacePath: string
  worktreePath: string
  state?: "generating" | "done" | "error"
  code: string
  err?: string
}

type ChartRow = SaveChart & {
  updatedAt: number
}

type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Opt = {
  workspaces: Map<string, Analysis>
  charts: Map<string, Chart>
  workspace: string
  worktree: string
  id: string
  save: (input: Save) => Promise<void>
  chart: (input: SaveChart) => Promise<void>
  load: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart: (workspace: string, worktree: string) => Promise<Chart | undefined>
  write: Log
}

export function createWorkspace(opt: Opt) {
  return {
    transform: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      // 工作区门禁是跨 session 的：同一个 workspace/worktree 只需要先完成一次 analyzer。
      const found = opt.workspaces.get(opt.id) ?? (await opt.load(opt.workspace, opt.worktree).catch(() => undefined))
      if (found && validAnalysis(found)) opt.workspaces.set(opt.id, found)
      if (found && !validAnalysis(found)) opt.workspaces.delete(opt.id)
      const analysis = opt.workspaces.get(opt.id)
      if (!analysis || analysis.state === "requested") {
        if (!analysis) opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
        await opt.write("workspace analysis gate injected", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          state: analysis?.state ?? "missing",
        })
        output.system.push(noteAnalysis())
        return true
      }

      if (analysis.state !== "done") return false

      // analyzer 完成后，flowchart 是第二道门禁；它优先于普通日志/debug 配对提醒。
      const row = opt.charts.get(opt.id) ?? (await opt.loadChart(opt.workspace, opt.worktree).catch(() => undefined))
      if (row && validChart(row)) opt.charts.set(opt.id, row)
      if (row && !validChart(row)) opt.charts.delete(opt.id)
      const chart = opt.charts.get(opt.id)
      if (chart && chart.state !== "requested") return false
      if (!chart) opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
      await opt.write("workspace flowchart gate injected", {
        sessionID: input.sessionID,
        workspace: opt.workspace,
        worktree: opt.worktree,
        state: chart?.state ?? "missing",
      })
      output.system.push(noteChart(analysis))
      return true
    },
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (flowchart({ tool: input.tool, args: output.args })) {
        opt.charts.set(opt.id, freshChart(opt.workspace, opt.worktree))
        await opt
          .chart({
            workspacePath: opt.workspace,
            worktreePath: opt.worktree,
            state: "generating",
            code: "",
          })
          .catch((err) =>
            opt.write("workspace flowchart generating notify failed", {
              workspace: opt.workspace,
              worktree: opt.worktree,
              error: err instanceof Error ? err.message : String(err),
            }),
          )
        await opt.write("workspace flowchart started", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }
      if (!analyze({ tool: input.tool, args: output.args })) return false
      opt.workspaces.set(opt.id, freshAnalysis(opt.workspace, opt.worktree))
      await opt
        .save({
          workspacePath: opt.workspace,
          worktreePath: opt.worktree,
          state: "running",
          items: [],
          text: "",
        })
        .catch((err) =>
          opt.write("workspace analysis running notify failed", {
            workspace: opt.workspace,
            worktree: opt.worktree,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
      await opt.write("workspace analysis started", {
        sessionID: input.sessionID,
        workspace: opt.workspace,
        worktree: opt.worktree,
      })
      return true
    },
    after: async (input: Parameters<After>[0], output: Parameters<After>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (flowchart(input)) {
        const code = mermaid(output.output)
        const state = code ? ("done" as const) : ("error" as const)
        const next = code
          ? doneChart(opt.workspace, opt.worktree, code)
          : {
              ...freshChart(opt.workspace, opt.worktree),
              state,
              err: "flowchart result is empty",
            }
        opt.charts.set(opt.id, next)
        await opt
          .chart({
            workspacePath: opt.workspace,
            worktreePath: opt.worktree,
            state,
            code: next.code,
            err: next.err,
          })
          .catch((err) =>
            opt.write("workspace flowchart save failed", {
              workspace: opt.workspace,
              worktree: opt.worktree,
              error: err instanceof Error ? err.message : String(err),
            }),
          )
        await opt.write("workspace flowchart completed", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          state: next.state,
        })
        return true
      }
      if (!analyze(input)) return false
      const list = items(output.output)
      const text = numbered(list)
      opt.workspaces.set(opt.id, doneAnalysis(opt.workspace, opt.worktree, text, list))
      opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
      await opt
        .save({
          workspacePath: opt.workspace,
          worktreePath: opt.worktree,
          state: "done",
          items: list,
          text,
        })
        .catch((err) =>
          opt.write("workspace analysis save failed", {
            workspace: opt.workspace,
            worktree: opt.worktree,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
      await opt.write("workspace analysis completed", {
        sessionID: input.sessionID,
        workspace: opt.workspace,
        worktree: opt.worktree,
        items: list.length,
      })
      return true
    },
  }
}

export async function saveRemote(service: string, input: Save) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/analysis", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save analysis failed: ${resp.status}`)
}

export async function saveChartRemote(service: string, input: SaveChart) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/flowchart", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save flowchart failed: ${resp.status}`)
}

export async function loadRemote(service: string, workspace: string, worktree: string) {
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

export async function loadChartRemote(service: string, workspace: string, worktree: string) {
  if (!service) return undefined
  const url = new URL("/api/workbench/flowchart", service)
  url.searchParams.set("workspacePath", workspace)
  url.searchParams.set("worktreePath", worktree)
  const resp = await fetch(url)
  if (!resp.ok) return undefined
  const body = (await resp.json()) as { data?: ChartRow | null }
  if (!body.data) return undefined
  return {
    workspace: body.data.workspacePath,
    worktree: body.data.worktreePath,
    state: body.data.state ?? "done",
    code: body.data.code ?? "",
    err: body.data.err ?? "",
    updated: body.data.updatedAt ?? Date.now(),
  }
}
