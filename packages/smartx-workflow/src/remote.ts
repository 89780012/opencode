import { items, serial } from "./parse.js"
import type { Analysis, Automation, Chart, Project, Run, RunStart, RunUpdate, Save, SaveChart, SaveReview } from "./types.js"

type Rpc = {
  result?: {
    structuredContent?: unknown
    isError?: boolean
  }
  error?: unknown
}

type Row = Save & {
  updatedAt: number
}

type ChartRow = SaveChart & {
  updatedAt: number
}

type ProjectRow = {
  workspacePath: string
  worktreePath: string
  exists: boolean
  updatedAt: number
}

type ConfigRow = {
  workflow?: {
    baseline?: boolean
    review?: boolean
    debug?: boolean
    backtest?: boolean
  }
}

export const disabled: Automation = {
  baseline: false,
  review: false,
  debug: false,
  backtest: false,
}

/** 读取安装级自动工作流配置；缺少服务或读取失败时全部关闭。 */
export async function loadWorkflowRemote(service: string) {
  if (!service) return disabled
  const resp = await fetch(new URL("/api/system/config", service))
  if (!resp.ok) return disabled
  const body = (await resp.json()) as { data?: ConfigRow }
  return {
    baseline: body.data?.workflow?.baseline === true,
    review: body.data?.workflow?.review === true,
    debug: body.data?.workflow?.debug === true,
    backtest: body.data?.workflow?.backtest === true,
  }
}

export async function loadRunRemote(service: string, workspace: string, session: string) {
  if (!service) return undefined
  const url = new URL("/api/workbench/workflow", service)
  url.searchParams.set("workspacePath", workspace)
  url.searchParams.set("sessionId", session)
  const resp = await fetch(url)
  if (!resp.ok) return undefined
  const body = (await resp.json()) as { data?: Run | null }
  return body.data ?? undefined
}

export async function startRunRemote(service: string, input: RunStart) {
  if (!service) throw new Error("strategy service URL is required")
  const resp = await fetch(new URL("/api/workbench/workflow", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`start workflow failed: ${resp.status}`)
  const body = (await resp.json()) as { data?: Run }
  if (!body.data) throw new Error("start workflow returned no data")
  return body.data
}

export async function updateRunRemote(service: string, input: RunUpdate) {
  if (!service) throw new Error("strategy service URL is required")
  const resp = await fetch(new URL("/api/workbench/workflow", service), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`update workflow failed: ${resp.status}`)
  const body = (await resp.json()) as { data?: Run }
  if (!body.data) throw new Error("update workflow returned no data")
  return body.data
}

/** 通过 strategy-service 的现有 MCP HTTP 入口执行确定性流水线动作。 */
export async function callRemote(service: string, name: string, args: Record<string, unknown>) {
  if (!service) throw new Error("strategy service URL is required")
  const resp = await fetch(new URL("/mcp", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `pipeline:${name}:${Date.now()}`,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  })
  if (!resp.ok) throw new Error(`MCP ${name} failed: ${resp.status}`)
  const body = (await resp.json()) as Rpc
  if (body.error || body.result?.isError) throw new Error(`MCP ${name} failed`)
  const data = body.result?.structuredContent
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`MCP ${name} returned no data`)
  return data as Record<string, unknown>
}

/** 读取安装级工作区基线开关；缺少服务或读取失败时保持关闭。 */
export async function loadBaselineRemote(service: string) {
  return (await loadWorkflowRemote(service)).baseline
}

/** 把 analysis 结果保存到 strategy-service。 */
export async function saveRemote(service: string, input: Save) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/analysis", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save analysis failed: ${resp.status}`)
}

/** 把 flowchart 结果保存到 strategy-service。 */
export async function saveChartRemote(service: string, input: SaveChart) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/flowchart", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save flowchart failed: ${resp.status}`)
}

/** 把 review 结果保存到 strategy-service。 */
export async function saveReviewRemote(service: string, input: SaveReview) {
  if (!service) throw new Error("strategy service URL is required")
  const resp = await fetch(new URL("/api/workbench/review", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save review failed: ${resp.status}`)
}

/** 从 strategy-service 读取最近一次 analysis 快照。 */
export async function loadRemote(service: string, workspace: string, worktree: string): Promise<Analysis | undefined> {
  if (!service) return undefined
  const url = new URL("/api/workbench/analysis", service)
  url.searchParams.set("workspacePath", workspace)
  url.searchParams.set("worktreePath", worktree)
  const resp = await fetch(url)
  if (!resp.ok) return undefined
  const body = (await resp.json()) as { data?: Row | null }
  if (!body.data) return undefined
  const summaryItems = body.data.items?.length ? body.data.items : items(body.data.text ?? "")
  return {
    workspace: body.data.workspacePath,
    worktree: body.data.worktreePath,
    state: body.data.state ?? "done",
    summaryItems,
    summaryText: serial(summaryItems),
    updated: body.data.updatedAt ?? Date.now(),
  }
}

/** 从 strategy-service 读取最近一次 flowchart 快照。 */
export async function loadChartRemote(service: string, workspace: string, worktree: string): Promise<Chart | undefined> {
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
    mermaidCode: body.data.code ?? "",
    errorText: body.data.err ?? "",
    updated: body.data.updatedAt ?? Date.now(),
  }
}

/** 从 strategy-service 读取 project memory 是否存在。 */
export async function loadProjectRemote(service: string, workspace: string, worktree: string): Promise<Project | undefined> {
  if (!service) return undefined
  const url = new URL("/api/workbench/project-state", service)
  url.searchParams.set("workspacePath", workspace)
  url.searchParams.set("worktreePath", worktree)
  const resp = await fetch(url)
  if (!resp.ok) return undefined
  const body = (await resp.json()) as { data?: ProjectRow | null }
  if (!body.data) return undefined
  return {
    workspace: body.data.workspacePath,
    worktree: body.data.worktreePath,
    hasProjectState: body.data.exists,
    updated: body.data.updatedAt ?? Date.now(),
  }
}
