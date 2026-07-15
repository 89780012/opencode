import { items, serial } from "./parse.js"
import type { Analysis, Chart, Project, Save, SaveChart, SaveReview } from "./types.js"

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
