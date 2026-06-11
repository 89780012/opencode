import type { Hooks } from "@opencode-ai/plugin"
import {
  analyze,
  doneAnalysis,
  doneChart,
  flowchart,
  freshAnalysis,
  freshChart,
  items,
  mermaid,
  noteAnalysis,
  noteChart,
  noteReview,
  requestAnalysis,
  requestChart,
  review,
  reviewState,
  reviewText,
  serial,
  validAnalysis,
  validChart,
  type Analysis,
  type Chart,
} from "./state.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type Before = NonNullable<Hooks["tool.execute.before"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

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

export type ReviewItem = {
  name: string
  status: string
  detail: string
  suggestion: string
}

export type SaveReview = {
  workspacePath: string
  worktreePath: string
  state?: "running" | "passed" | "failed" | "error"
  summary: string
  items: ReviewItem[]
  suggestions: string[]
}

export type Pending =
  | {
      kind: "analysis"
      workspacePath: string
      worktreePath: string
      items: string[]
      text: string
    }
  | {
      kind: "flowchart"
      workspacePath: string
      worktreePath: string
      state: "done" | "error"
      code: string
      err: string
    }
  | {
      kind: "review"
      workspacePath: string
      worktreePath: string
      state: "passed" | "failed" | "error"
      text: string
    }

type Opt = {
  workspaces: Map<string, Analysis>
  charts: Map<string, Chart>
  pending: Map<string, Pending>
  reviewRequests: Set<string>
  workspace: string
  worktree: string
  id: string
  load: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart: (workspace: string, worktree: string) => Promise<Chart | undefined>
  write: Log
}

function mcp(input: { tool: string }, name: string) {
  return input.tool === name || input.tool.endsWith("_" + name)
}

function ok(output: unknown) {
  if (!output || typeof output !== "object") return true
  if (!("isError" in output)) return true
  return output.isError !== true
}

function same(input: unknown, workspace: string, worktree: string) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  return (
    args.workspacePath === workspace && (args.worktreePath === worktree || (!args.worktreePath && worktree === workspace))
  )
}

function noteSave(input: Pending) {
  if (input.kind === "analysis") {
    return [
      "The workspace analysis task has completed. Before continuing, call the strategy-service MCP tool `smartx_save_analysis` with exactly this JSON argument:",
      JSON.stringify(
        {
          workspacePath: input.workspacePath,
          worktreePath: input.worktreePath,
          state: "done",
          items: input.items,
          text: input.text,
        },
        null,
        2,
      ),
      "After the MCP tool succeeds, continue with the current task.",
    ].join("\n")
  }
  if (input.kind === "review") {
    return [
      "The strategy review task has completed. Before continuing, convert the following Chinese review report into a strict JSON argument for the strategy-service MCP tool `smartx_save_review`.",
      "Required fixed fields:",
      `- workspacePath: ${input.workspacePath}`,
      `- worktreePath: ${input.worktreePath}`,
      `- state: ${input.state}`,
      "Required generated fields:",
      "- summary: concise Chinese review summary",
      "- items: Chinese review items, each with name, status, detail, suggestion",
      "- suggestions: Chinese suggestion list",
      "Rules:",
      "- Keep every natural-language field in Chinese.",
      "- Faithfully convert the report and do not invent extra issues.",
      "- Use item status only from: passed, warning, failed, error.",
      "- If the report says the review cannot be completed, keep the overall state as error.",
      "",
      "Review report:",
      input.text,
      "After the MCP tool succeeds, continue with the current task.",
    ].join("\n")
  }
  return [
    "The strategy flowchart task has completed. Before continuing, call the strategy-service MCP tool `smartx_save_flowchart` with exactly this JSON argument:",
    JSON.stringify(
      {
        workspacePath: input.workspacePath,
        worktreePath: input.worktreePath,
        state: input.state,
        code: input.code,
        err: input.err,
      },
      null,
      2,
    ),
    "After the MCP tool succeeds, continue with the current task.",
  ].join("\n")
}

export function createWorkspace(opt: Opt) {
  return {
    system: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      const found = opt.workspaces.get(opt.id) ?? (await opt.load(opt.workspace, opt.worktree).catch(() => undefined))
      if (found && validAnalysis(found)) opt.workspaces.set(opt.id, found)
      if (found && !validAnalysis(found)) opt.workspaces.delete(opt.id)

      const analysis = opt.workspaces.get(opt.id)
      const row =
        analysis?.state === "done"
          ? (opt.charts.get(opt.id) ?? (await opt.loadChart(opt.workspace, opt.worktree).catch(() => undefined)))
          : undefined
      if (row && validChart(row)) opt.charts.set(opt.id, row)
      if (row && !validChart(row)) opt.charts.delete(opt.id)

      const wait = opt.pending.get(opt.id)

      // true 情况 1：子 agent 已产出结果，但还没通过 strategy-service MCP 持久化。
      // 这时优先提示主 agent 调用 save_analysis/save_flowchart，避免继续推进后续门禁。
      if (wait) {
        await opt.write("workspace mcp save reminder injected", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          kind: wait.kind,
        })
        output.system.push(noteSave(wait))
        return true
      }

      const sessionID = input.sessionID
      if (sessionID) {
        const requestID = opt.id + "\x00" + sessionID
        if (opt.reviewRequests.has(requestID)) {
          opt.reviewRequests.delete(requestID)
          await opt.write("workspace review gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteReview({ workspace: opt.workspace, worktree: opt.worktree, sessionID }))
          return true
        }
      }

      // true 情况 2：当前 workspace/worktree 还没有完成策略运行逻辑分析。
      // 注入 workspace-analyzer 门禁，让主 agent 先启动分析子 agent。
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

      // true 情况 3：分析已完成，但流程图还没有生成或处于 requested。
      // 注入 strategy-flowchart-generator 门禁，让主 agent 生成 Mermaid 流程图。
      const chart = opt.charts.get(opt.id)
      if (analysis.state === "done" && (!chart || chart.state === "requested")) {
        if (!chart) opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
        await opt.write("workspace flowchart gate injected", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          state: chart?.state ?? "missing",
        })
        output.system.push(noteChart(analysis))
        return true
      }

      return false
    },
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false

      // true 情况 1：主 agent 正在启动流程图子 agent。
      // 记录 flowchart 进入 generating 状态，后续 after 会接收子 agent 输出。
      if (flowchart({ tool: input.tool, args: output.args })) {
        opt.charts.set(opt.id, freshChart(opt.workspace, opt.worktree))
        await opt.write("workspace flowchart started", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      if (review({ tool: input.tool, args: output.args })) {
        await opt.write("workspace review started", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      // true 情况 3：主 agent 正在启动分析子 agent。
      // 记录 analysis 进入 running 状态，避免系统提示重复要求启动 analyzer。
      if (analyze({ tool: input.tool, args: output.args })) {
        opt.workspaces.set(opt.id, freshAnalysis(opt.workspace, opt.worktree))
        await opt.write("workspace analysis started", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      return false
    },
    after: async (input: Parameters<After>[0], output: Parameters<After>[1]) => {
      if (!opt.workspace || !opt.id) return false

      // true 情况 1：主 agent 已成功调用 MCP 保存 analysis。
      // 清理 analysis pending，下一轮 system 才能继续推进 flowchart 门禁。
      if (mcp(input, "save_analysis") && same(input.args, opt.workspace, opt.worktree) && ok(output)) {
        if (opt.pending.get(opt.id)?.kind === "analysis") opt.pending.delete(opt.id)
        await opt.write("workspace analysis saved through mcp", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      // true 情况 2：主 agent 已成功调用 MCP 保存 flowchart。
      // 清理 flowchart pending，workspace 门禁链路到这里就完成。
      if (mcp(input, "save_flowchart") && same(input.args, opt.workspace, opt.worktree) && ok(output)) {
        if (opt.pending.get(opt.id)?.kind === "flowchart") opt.pending.delete(opt.id)
        await opt.write("workspace flowchart saved through mcp", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      if (mcp(input, "save_review") && same(input.args, opt.workspace, opt.worktree) && ok(output)) {
        if (opt.pending.get(opt.id)?.kind === "review") opt.pending.delete(opt.id)
        await opt.write("workspace review saved through mcp", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
        })
        return true
      }

      // true 情况 3：流程图子 agent 调用结束。
      // 解析 Mermaid，记录到本地缓存，并生成待 MCP 保存任务。
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
        opt.pending.set(opt.id, {
          kind: "flowchart",
          workspacePath: opt.workspace,
          worktreePath: opt.worktree,
          state,
          code: next.code,
          err: next.err,
        })
        await opt.write("workspace flowchart completed", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          state: next.state,
        })
        return true
      }

      if (review(input)) {
        const text = reviewText(output.output) || "审查报告为空。"
        const state = reviewState(text)
        opt.pending.set(opt.id, {
          kind: "review",
          workspacePath: opt.workspace,
          worktreePath: opt.worktree,
          state,
          text,
        })
        await opt.write("workspace review completed", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          state,
        })
        return true
      }

      // true 情况 4：分析子 agent 调用结束。
      // 解析 JSON 数组，记录到本地缓存，并生成待 MCP 保存任务。
      if (analyze(input)) {
        const list = items(output.output)
        const text = serial(list)
        opt.workspaces.set(opt.id, doneAnalysis(opt.workspace, opt.worktree, text, list))
        opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
        opt.pending.set(opt.id, {
          kind: "analysis",
          workspacePath: opt.workspace,
          worktreePath: opt.worktree,
          items: list,
          text,
        })
        await opt.write("workspace analysis completed", {
          sessionID: input.sessionID,
          workspace: opt.workspace,
          worktree: opt.worktree,
          items: list.length,
        })
        return true
      }

      return false
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
  const list = body.data.items?.length ? body.data.items : items(body.data.text ?? "")
  return {
    workspace: body.data.workspacePath,
    worktree: body.data.worktreePath,
    state: body.data.state ?? "done",
    items: list,
    text: serial(list),
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
