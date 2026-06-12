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
import { flow, step } from "./workflow.js"

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

export type Fix = {
  workspacePath: string
  worktreePath: string
  sessionID: string
  attempt: number
  text: string
}

const limit = 3

type Opt = {
  workspaces: Map<string, Analysis>
  charts: Map<string, Chart>
  pending: Map<string, Pending>
  fixes: Map<string, Fix>
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

function fixkey(id: string, session: string) {
  return id + "\x00" + session
}

function noteFix(input: Fix) {
  return [
    "The latest strategy review did not pass. Do not save the review result yet.",
    "You are the main agent, so you must fix the code yourself before asking for another review.",
    `This is repair attempt ${input.attempt} of ${limit}.`,
    "Rules:",
    "- Read the review report below and edit the current workspace code to address the concrete issues.",
    "- Keep changes focused on the reported SmartX strategy defects and the user's requirements.",
    "- After editing, run the most relevant local validation you can reasonably run from the package or project directory.",
    "- Then call the `task` tool again with `subagent_type: strategy-reviewer` and `description: Review strategy implementation`.",
    "- Pass the same requirements context plus a short summary of the fixes to the reviewer.",
    "- Do not call `smartx_save_review` until a later review passes, fails after the repair limit, or cannot be completed.",
    "",
    "Review report to fix:",
    input.text,
  ].join("\n")
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
      "- Preserve these fixed review item names when present: 需求覆盖情况、语法与运行时错误、策略逻辑完整性、入场逻辑、退出逻辑、仓位管理、风控规则、边界条件、订单管理、状态管理、生命周期管理、代码可维护性。",
      "- Keep 策略逻辑完整性 detailed and requirement-oriented; it must mention the relevant user requirements, implementation evidence, and missing logic when the report includes them.",
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

      const sessionID = input.sessionID
      return flow([
        // 门禁 1：子 agent 已产出 analysis/flowchart/review，但还没保存到 strategy-service。
        // 必须先提醒主 agent 调用对应 smartx_save_*，避免后续门禁基于未持久化状态继续推进。
        step("save", async () => {
          const wait = opt.pending.get(opt.id)
          if (!wait) return false
          await opt.write("workspace mcp save reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            kind: wait.kind,
          })
          output.system.push(noteSave(wait))
          return true
        }),

        // 门禁 2：上一轮 strategy-reviewer 判定未通过，且还没达到自动修复上限。
        // 这时禁止保存失败审查结果，先要求主 agent 按报告修代码，再重新发起审查。
        step("fix", async () => {
          const fix = sessionID ? opt.fixes.get(fixkey(opt.id, sessionID)) : undefined
          if (!fix) return false
          await opt.write("workspace review fix injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            attempt: fix.attempt,
          })
          output.system.push(noteFix(fix))
          return true
        }),

        // 门禁 3：用户当前会话显式表达了代码审查意图。
        // 注入隐藏审查流程：先取需求，再启动 strategy-reviewer，并由主 agent 负责失败后的修复循环。
        step("review", async () => {
          if (!sessionID) return false
          const requestID = opt.id + "\x00" + sessionID
          if (!opt.reviewRequests.has(requestID)) return false
          opt.reviewRequests.delete(requestID)
          await opt.write("workspace review gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteReview({ workspace: opt.workspace, worktree: opt.worktree, sessionID }))
          return true
        }),

        // 门禁 4：当前 workspace/worktree 还没有完成策略运行逻辑分析。
        // 在写代码、生成方案或其它实现动作前，先要求启动 workspace-analyzer。
        step("analysis", async () => {
          if (analysis && analysis.state !== "requested") return false
          if (!analysis) opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
          await opt.write("workspace analysis gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: analysis?.state ?? "missing",
          })
          output.system.push(noteAnalysis())
          return true
        }),

        // 门禁 5：分析已经完成，但策略流程图还没生成或需要重新生成。
        // 要求启动 strategy-flowchart-generator，把分析结果转换成 Mermaid 流程图。
        step("chart", async () => {
          const chart = opt.charts.get(opt.id)
          if (analysis?.state !== "done" || (chart && chart.state !== "requested")) return false
          if (!chart) opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
          await opt.write("workspace flowchart gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: chart?.state ?? "missing",
          })
          output.system.push(noteChart(analysis))
          return true
        }),
      ])
    },
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false

      return flow([
        // 门禁 1：主 agent 即将启动流程图子 agent。
        // 先把 chart 标记为 generating，避免下一轮 system 继续重复要求生成流程图。
        step("chart", async () => {
          if (!flowchart({ tool: input.tool, args: output.args })) return false
          opt.charts.set(opt.id, freshChart(opt.workspace, opt.worktree))
          await opt.write("workspace flowchart started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 门禁 2：主 agent 即将启动审查子 agent。
        // 这里只记录审查开始，真实的通过/失败判断在 after 阶段处理。
        step("review", async () => {
          if (!review({ tool: input.tool, args: output.args })) return false
          await opt.write("workspace review started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 门禁 3：主 agent 即将启动分析子 agent。
        // 先把 analysis 标记为 running，避免下一轮 system 重复注入 analyzer 门禁。
        step("analysis", async () => {
          if (!analyze({ tool: input.tool, args: output.args })) return false
          opt.workspaces.set(opt.id, freshAnalysis(opt.workspace, opt.worktree))
          await opt.write("workspace analysis started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
      ])
    },
    after: async (input: Parameters<After>[0], output: Parameters<After>[1]) => {
      if (!opt.workspace || !opt.id) return false

      return flow([
        // 门禁 1：主 agent 已成功保存 analysis 到 strategy-service。
        // 清理 analysis pending，下一轮 system 才能继续推进 flowchart 门禁。
        step("save_analysis", async () => {
          if (!mcp(input, "save_analysis") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          if (opt.pending.get(opt.id)?.kind === "analysis") opt.pending.delete(opt.id)
          await opt.write("workspace analysis saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 门禁 2：主 agent 已成功保存 flowchart 到 strategy-service。
        // 清理 flowchart pending，表示“分析 -> 流程图”这段门禁链已经完成。
        step("save_chart", async () => {
          if (!mcp(input, "save_flowchart") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          if (opt.pending.get(opt.id)?.kind === "flowchart") opt.pending.delete(opt.id)
          await opt.write("workspace flowchart saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 门禁 3：主 agent 已成功保存最终审查结果。
        // 如果审查通过，重置 analysis/chart，让后续流程基于修复后的代码重新分析和画图。
        step("save_review", async () => {
          if (!mcp(input, "save_review") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "review") opt.pending.delete(opt.id)
          opt.fixes.delete(fixkey(opt.id, input.sessionID))
          if (item?.kind === "review" && item.state === "passed") {
            opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
            opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
          }
          await opt.write("workspace review saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: item?.kind === "review" ? item.state : undefined,
          })
          return true
        }),

        // 门禁 4：流程图子 agent 调用结束。
        // 解析 Mermaid，更新本地 chart 状态，并生成 smartx_save_flowchart 的待保存任务。
        step("chart_done", async () => {
          if (!flowchart(input)) return false
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
        }),

        // 门禁 5：审查子 agent 调用结束。
        // 未通过且未达到上限时进入修复门禁；通过、无法完成或达到上限时生成最终审查保存任务。
        step("review_done", async () => {
          if (!review(input)) return false
          const text = reviewText(output.output) || "审查报告为空。"
          const state = reviewState(text)
          const fix = opt.fixes.get(fixkey(opt.id, input.sessionID))
          if (state === "failed" && (!fix || fix.attempt < limit)) {
            const next = (fix?.attempt ?? 0) + 1
            opt.fixes.set(fixkey(opt.id, input.sessionID), {
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
              attempt: next,
              text,
            })
            await opt.write("workspace review needs fix", {
              sessionID: input.sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              attempt: next,
            })
            return true
          }
          opt.fixes.delete(fixkey(opt.id, input.sessionID))
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
        }),

        // 门禁 6：分析子 agent 调用结束。
        // 解析 JSON 数组，更新 analysis 状态，同时把 chart 置为 requested，等待后续生成流程图。
        step("analysis_done", async () => {
          if (!analyze(input)) return false
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
        }),
      ])
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
