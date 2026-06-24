import type { Hooks } from "@opencode-ai/plugin"
import {
  analyze,
  doneAnalysis,
  doneChart,
  type Dirt,
  flowchart,
  freshAnalysis,
  freshChart,
  items,
  type Life,
  mermaid,
  type Mode,
  noteBoot,
  noteChart,
  noteClose,
  noteFinal,
  noteResumeProject,
  noteRefresh,
  noteReview,
  noteSaveProject,
  type Project,
  requestAnalysis,
  requestChart,
  review,
  reviewState,
  reviewText,
  serial,
  validAnalysis,
  validChart,
  validProject,
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

type ProjectRow = {
  workspacePath: string
  worktreePath: string
  exists: boolean
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
  | {
      kind: "debug"
      workspacePath: string
      worktreePath: string
      sessionID: string
    }

export type Fix = {
  workspacePath: string
  worktreePath: string
  sessionID: string
  attempt: number
  text: string
}

export type Memory = {
  exists: boolean
  restored: boolean
  stale: boolean
}

const limit = 3

type Opt = {
  workspaces: Map<string, Analysis>
  charts: Map<string, Chart>
  projects: Map<string, Project>
  pending: Map<string, Pending>
  dirts: Map<string, Dirt>
  memory: Map<string, Memory>
  modes: Map<string, Mode>
  fixes: Map<string, Fix>
  reviewRequests: Set<string>
  finalRequests: Set<string>
  subs: Set<string>
  workspace: string
  worktree: string
  id: string
  load: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart: (workspace: string, worktree: string) => Promise<Chart | undefined>
  loadProject: (workspace: string, worktree: string) => Promise<Project | undefined>
  hold: (session: string) => boolean
  saveReview: (input: SaveReview) => Promise<void>
  write: Log
}

type Reason = "manual" | "review" | "gate"
type Kind = "read" | "write" | "exec" | "analyze" | "chart" | "review" | "save" | "refresh" | "debug" | "project_init" | "project_resume" | "project_get" | "project_save" | "project_validate" | "other"
type View = {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  wait?: Pending
  dirt: Dirt
  mem: Memory
  mode: Mode
  life: Life
}

function mcp(input: { tool: string }, name: string) {
  return input.tool === name || input.tool.endsWith("_" + name)
}

function start(input: { tool: string }) {
  return input.tool === "smartx_start" || input.tool === "smartx-start"
}

function skill(input: { tool: string; args?: unknown }) {
  if (input.tool !== "skill") return ""
  if (!input.args || typeof input.args !== "object") return ""
  const args = input.args as Record<string, unknown>
  return typeof args.name === "string" ? args.name : ""
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

function clean(input: unknown) {
  if (typeof input !== "string") return ""
  return input.trim().toLowerCase()
}

function pass(input: unknown) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  if (args.state !== "passed") return false
  if (!Array.isArray(args.items)) return false
  if (!args.items.length) return false
  return args.items.every((item) => item && typeof item === "object" && clean((item as Record<string, unknown>).status) === "passed")
}

function fixkey(id: string, session: string) {
  return id + "\x00" + session
}

function sessionkey(id: string, session: string) {
  return id + "\x00" + session
}

function cleanDirt(): Dirt {
  return {
    state: "clean",
    updated: 0,
    reason: "",
  }
}

function cleanMemory(project?: Project): Memory {
  return {
    exists: project?.exists === true,
    restored: false,
    stale: false,
  }
}

async function sync(opt: Opt) {
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
  const project = opt.projects.get(opt.id) ?? (await opt.loadProject(opt.workspace, opt.worktree).catch(() => undefined))
  if (project && validProject(project)) opt.projects.set(opt.id, project)
  if (project && !validProject(project)) opt.projects.delete(opt.id)
  return {
    analysis,
    chart: opt.charts.get(opt.id),
    project: opt.projects.get(opt.id),
  }
}

function kind(input: { tool: string; args?: unknown }) {
  if (mcp(input, "init_project_state")) return "project_init" as const
  if (mcp(input, "resume_project_state")) return "project_resume" as const
  if (mcp(input, "get_project_state")) return "project_get" as const
  if (mcp(input, "save_project_state")) return "project_save" as const
  if (mcp(input, "validate_project_state")) return "project_validate" as const
  if (mcp(input, "refresh_workspace")) return "refresh" as const
  if (mcp(input, "save_analysis") || mcp(input, "save_flowchart")) return "save" as const
  if (start(input)) return "debug" as const
  const name = skill(input)
  if (name === "smartx-develop") return "write" as const
  if (name === "smartx-debug") return "debug" as const
  if (input.tool === "task") {
    const args = input.args
    const sub = args && typeof args === "object" ? (args as Record<string, unknown>).subagent_type : undefined
    if (sub === "workspace-analyzer") return "analyze" as const
    if (sub === "strategy-flowchart-generator") return "chart" as const
    if (sub === "strategy-reviewer") return "review" as const
  }
  if (["read", "grep", "glob", "ls", "list", "codesearch", "lsp", "webfetch", "websearch"].includes(input.tool)) return "read" as const
  if (["edit", "write", "apply_patch", "multiedit"].includes(input.tool)) return "write" as const
  if (input.tool === "bash") return "exec" as const
  return "other" as const
}

// 把持久化的分析/流程图产物、待保存状态和本地 dirty 元数据折叠成一个
// 生命周期视图，避免门禁策略散落在多个分支里。
function view(opt: Opt, input: { analysis?: Analysis; chart?: Chart; project?: Project }) {
  const wait = opt.pending.get(opt.id)
  const dirt = opt.dirts.get(opt.id) ?? cleanDirt()
  const mem = opt.memory.get(opt.id) ?? cleanMemory(input.project)
  const mode = opt.modes.get(opt.id) ?? "boot"
  const busy = mode === "final" ? "finalizing" : mode === "refresh" ? "refreshing" : "booting"
  const life =
    wait?.kind === "analysis" || wait?.kind === "flowchart"
      ? busy
      : !input.analysis || input.analysis.state === "requested"
        ? mode === "final"
          ? "finalizing"
          : mode === "refresh"
            ? "refreshing"
            : "idle"
        : input.analysis.state === "running"
          ? busy
          : !input.chart || input.chart.state === "requested" || input.chart.state === "generating" || input.chart.state === "error"
            ? busy
            : dirt.state === "dirty"
              ? "dirty"
              : "ready"
  return {
    analysis: input.analysis,
    chart: input.chart,
    project: input.project,
    wait,
    dirt,
    mem,
    mode,
    life,
  } satisfies View
}

// 新门禁按阶段工作：初始化时严格，中间开发和调试阶段放松，只在
// review 或最终收口这类动作前重新收紧。
function gate(next: View, value: Kind) {
  if (!next.mem.restored) {
    if (value === "read" || value === "project_init" || value === "project_resume" || value === "project_get" || value === "project_validate" || value === "other") return ""
    return next.mem.exists
      ? "SmartX workflow requires restoring project memory through resume_project_state before sustained work."
      : "SmartX workflow requires initializing project memory through init_project_state before sustained work."
  }
  if (next.wait?.kind === "review") return next.life === "ready" || next.life === "dirty" ? "" : ""
  if (next.wait?.kind === "debug" && value === "debug") return ""
  if (next.life === "idle") {
    if (value === "read" || value === "analyze" || value === "refresh" || value === "other") return ""
    if (value === "save") return "SmartX workflow requires creating the initial workspace baseline first."
    return "SmartX workflow requires initial workspace analysis and flowchart generation before implementation."
  }
  if (next.life === "booting") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is still building the initial workspace baseline. Finish analysis and flowchart first."
  }
  if (next.life === "ready") return ""
  if (next.life === "dirty") {
    if (value === "review") return "SmartX workflow requires refreshing workspace analysis and flowchart before review."
    return ""
  }
  if (next.life === "refreshing") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is refreshing the workspace baseline after code changes. Finish analysis and flowchart first."
  }
  if (next.life === "finalizing") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is generating the final workspace snapshot. Finish analysis and flowchart first."
  }
  return ""
}

// 根会话里任何成功的写入或执行都会让当前基线失效，直到下一次
// 分析 + 流程图刷新完整结束。
function mark(opt: Opt, reason: string) {
  opt.dirts.set(opt.id, {
    state: "dirty",
    updated: Date.now(),
    reason,
  })
}

// reset 总是重新进入基线流水线。mode 用来告诉后续 hook，
// 当前这轮到底是首次初始化，还是代码修改后的刷新。
function reset(opt: Opt, mode?: Mode) {
  opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
  opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
  opt.modes.set(opt.id, mode ?? (opt.dirts.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
  const wait = opt.pending.get(opt.id)
  if (wait?.kind === "analysis" || wait?.kind === "flowchart" || wait?.kind === "debug") opt.pending.delete(opt.id)
}

// 自动收口只在主会话的脏工作区生效，并且不能打断 review 修复、显式收口或顺序型待办。
function closing(opt: Opt, next: View, session: string) {
  if (opt.subs.has(session)) return false
  if (next.mem.stale) return false
  if (next.life !== "dirty" || next.wait) return false
  if (opt.hold(session)) return false
  if (opt.reviewRequests.has(sessionkey(opt.id, session))) return false
  if (opt.finalRequests.has(sessionkey(opt.id, session))) return false
  return !opt.fixes.has(fixkey(opt.id, session))
}

function saving(opt: Opt, next: View, session: string) {
  if (opt.subs.has(session)) return false
  if (!next.mem.restored || !next.mem.stale || next.wait) return false
  if (opt.hold(session)) return false
  if (opt.reviewRequests.has(sessionkey(opt.id, session))) return false
  if (opt.finalRequests.has(sessionkey(opt.id, session))) return true
  if (next.life !== "dirty") return false
  return !opt.fixes.has(fixkey(opt.id, session))
}

function noteFix(input: Fix) {
  const last = input.attempt >= limit
  return [
    "最新一轮 SmartX 策略审查未通过，并且该轮审查结果已经通过 `smartx_save_review` 保存。",
    "你是主 agent，必须自己根据审查报告修复代码。",
    `这是第 ${input.attempt} 次修复，最多 ${limit} 次。`,
    "规则：",
    "- 阅读下面的审查报告，修改当前工作区代码，解决报告中的具体问题。",
    "- 修改范围聚焦在 SmartX 策略缺陷和用户需求上。",
    "- 修改后，从对应 package 或项目目录运行你能合理执行的本地验证。",
    last
      ? "- 这是最后一次自动修复。不要再次调用 `strategy-reviewer`，不要调用 `smartx_start`；验证后直接用中文给出最终结论，并总结已保存的第三轮审查结果和最后修复内容。"
      : "- 然后再次调用 `task` 工具，使用 `subagent_type: strategy-reviewer` 和 `description: Review strategy implementation` 进行复审。",
    last ? "" : "- 传给 reviewer 的 prompt 必须包含相同的需求上下文，以及本轮修复摘要。",
    "- 在新的 `strategy-reviewer` 审查完成前，不要再次调用 `smartx_save_review`。",
    "",
    "待修复的审查报告：",
    input.text,
  ]
    .filter(Boolean)
    .join("\n")
}

function noteDebug(input: Extract<Pending, { kind: "debug" }>) {
  return [
    "SmartX 策略审查已经全部通过，最新分析和策略流程图也已经保存。",
    "下一步必须开始调试流程：请调用 `smartx_start`。",
    `调试工作区：${input.workspacePath}`,
    `调试 worktree：${input.worktreePath}`,
    "调用成功后，现有顺序约束会继续要求你调用 `smartx_logs` 查看调试日志。",
    "不要把这段系统提示复述给用户。",
  ].join("\n")
}

function noteSave(input: Pending) {
  if (input.kind === "analysis") {
    return [
      "工作区分析任务已经完成。继续之前，必须调用 strategy-service MCP 工具 `smartx_save_analysis`，参数必须严格使用下面这段 JSON：",
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
      "MCP 工具调用成功后，再继续当前任务。",
    ].join("\n")
  }
  if (input.kind === "review") {
    return [
      "策略审查任务已经完成。继续之前，必须把下面的中文审查报告转换成 strategy-service MCP 工具 `smartx_save_review` 的严格 JSON 参数并调用保存。",
      "固定字段：",
      `- workspacePath: ${input.workspacePath}`,
      `- worktreePath: ${input.worktreePath}`,
      `- state: ${input.state}`,
      "生成字段：",
      "- summary：简洁的中文审查摘要",
      "- items：中文审查项数组，每项包含 name、status、detail、suggestion",
      "- suggestions：中文建议数组",
      "规则：",
      "- 所有自然语言字段都必须使用中文。",
      "- 忠实转换报告内容，不要编造额外问题。",
      "- 报告中出现固定检查项时，尽量保留这些 name：需求覆盖情况、语法与运行时错误、策略逻辑完整性、入场逻辑、退出逻辑、仓位管理、风控规则、边界条件、订单管理、状态管理、生命周期管理、代码可维护性。",
      "- “策略逻辑完整性”必须保持详细并面向需求；如果报告包含相关内容，要写明用户需求、实现证据和缺失逻辑。",
      "- item status 只能使用：passed、warning、failed、error。",
      "- 如果报告说明无法完成审查，整体 state 保持为 error。",
      "",
      "审查报告：",
      input.text,
      "MCP 工具调用成功后，再继续当前任务。",
    ].join("\n")
  }
  if (input.kind === "debug") return noteDebug(input)
  return [
    "策略流程图任务已经完成。继续之前，必须调用 strategy-service MCP 工具 `smartx_save_flowchart`，参数必须严格使用下面这段 JSON：",
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
    "MCP 工具调用成功后，再继续当前任务。",
  ].join("\n")
}

export function createWorkspace(opt: Opt) {
  return {
    reset: async (reason: Reason, detail = "") => {
      if (!opt.workspace || !opt.id) return false
      reset(opt)
      await opt.write("workspace refresh requested", {
        workspace: opt.workspace,
        worktree: opt.worktree,
        reason,
        detail,
      })
      return true
    },
    system: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      const data = await sync(opt)
      const next = view(opt, data)

      const sessionID = input.sessionID
      return flow([
        step("project_save", async () => {
          if (!sessionID || !saving(opt, next, sessionID)) return false
          await opt.write("project memory save reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteSaveProject())
          return true
        }),

        step("project_resume", async () => {
          if (next.mem.restored) return false
          await opt.write("project memory restore gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            exists: next.mem.exists,
          })
          output.system.push(noteResumeProject(next.mem.exists))
          return true
        }),
        // 优先级最高：子 agent 一旦产出了分析、流程图或审查结果，
        // 主 agent 必须先保存，后续阶段才能信任这份状态。
        step("save", async () => {
          const wait = next.wait
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

        // 未通过的审查修复循环优先于初始化/刷新提示，确保主 agent
        // 始终先根据最新已保存的审查报告修代码。
        step("fix", async () => {
          const session = sessionID
          if (!session) return false
          const fix = opt.fixes.get(fixkey(opt.id, session))
          if (!fix) return false
          await opt.write("workspace review fix injected", {
            sessionID: session,
            workspace: opt.workspace,
            worktree: opt.worktree,
            attempt: fix.attempt,
          })
          output.system.push(noteFix(fix))
          if (fix.attempt >= limit) opt.fixes.delete(fixkey(opt.id, session))
          return true
        }),

        // 审查只能从干净且 ready 的基线开始。工作区一旦 dirty，
        // 先转去刷新路径，再进入 review。
        step("review", async () => {
          if (!sessionID) return false
          const requestID = opt.id + "\x00" + sessionID
          if (!opt.reviewRequests.has(requestID)) return false
          if (next.life === "dirty") {
            await opt.write("workspace refresh gate injected", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              action: "review",
            })
            output.system.push(noteRefresh("代码审查"))
            return true
          }
          if (next.life !== "ready") return false
          opt.reviewRequests.delete(requestID)
          await opt.write("workspace review gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteReview({ workspace: opt.workspace, worktree: opt.worktree, sessionID }))
          return true
        }),

        // 最终收口和 review 分开处理。dirty 时先做最后一次快照刷新，
        // clean 时不打断，直接允许主 agent 给出最终结论。
        step("final", async () => {
          if (!sessionID) return false
          const requestID = opt.id + "\x00" + sessionID
          if (!opt.finalRequests.has(requestID)) return false
          if (next.life === "dirty") {
            opt.finalRequests.delete(requestID)
            reset(opt, "final")
            await opt.write("workspace final gate injected", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
            })
            output.system.push(noteFinal())
            return true
          }
          if (next.life === "ready") opt.finalRequests.delete(requestID)
          return false
        }),

        // 主 agent 到了自然收尾点时，先提醒它做最后一次快照刷新。
        // 这一步不直接重置状态，而是把“是否准备结束”交给模型自己判断。
        step("close", async () => {
          if (!sessionID || !closing(opt, next, sessionID)) return false
          await opt.write("workspace close reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteClose())
          return true
        }),

        // 首次触达工作区时的初始化提示。只有这里会强制要求先建立第一份 workspace 基线。
        step("boot", async () => {
          if (next.life !== "idle") return false
          if (!next.analysis) opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
          opt.modes.set(opt.id, "boot")
          await opt.write("workspace boot gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: next.analysis?.state ?? "missing",
          })
          output.system.push(noteBoot())
          return true
        }),

        // 分析结果仍然是流程图的唯一事实来源，所以即使外层生命周期
        // 已经放松，流程图生成仍然必须排在分析之后。
        step("chart", async () => {
          const chart = next.chart
          if (next.analysis?.state !== "done" || chart?.state === "done" || chart?.state === "generating") return false
          if (!chart || chart.state === "error") opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
          await opt.write("workspace flowchart gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: chart?.state ?? "missing",
          })
          output.system.push(noteChart(next.analysis))
          return true
        }),

        // dirty 工作区因为 review 进入刷新阶段时，要提醒模型现在是在
        // 做 refresh，而不是重新开始一轮全新的 bootstrap。
        step("refresh", async () => {
          if (next.life !== "refreshing") return false
          if (next.analysis?.state === "done" && (!next.chart || next.chart.state === "requested" || next.chart.state === "error")) return false
          await opt.write("workspace refresh reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteRefresh())
          return true
        }),

        // finalizing 与普通 refresh 使用同一条分析/流程图流水线，
        // 区别只在于这里代表最终收口前的最后一次快照刷新。
        step("finalizing", async () => {
          if (next.life !== "finalizing") return false
          if (next.analysis?.state === "done" && (!next.chart || next.chart.state === "requested" || next.chart.state === "error")) return false
          await opt.write("workspace final reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteFinal())
          return true
        }),
      ])
    },
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (!opt.subs.has(input.sessionID)) {
        const data = await sync(opt)
        const next = view(opt, data)
        const value = kind({ tool: input.tool, args: output.args })
        const text = gate(next, value)
        if (text) {
          // 只有在生命周期边界才做硬拦截。读取类动作可以继续，
          // 写入或收尾动作在需要时才触发基线重置。
          if (next.life === "idle") reset(opt, "boot")
          if (next.life === "dirty" && value === "review") reset(opt, "refresh")
          await opt.write("workspace hard gate blocked tool", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            tool: input.tool,
            pending: next.wait?.kind,
            analysis: next.analysis?.state ?? "missing",
            chart: next.chart?.state ?? "missing",
            life: next.life,
            kind: value,
          })
          throw new Error(text)
        }
      }

      return flow([
        // 在流程图子 agent 真正启动前先把 chart 标成 running，
        // 避免下一轮 system 重复注入同一条流程图提示。
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

        // review 仍然坚持 save-first。这里立即记录 running，
        // 让后端能反映出一轮审查已经在进行中。
        step("review", async () => {
          if (!review({ tool: input.tool, args: output.args })) return false
          await opt
            .saveReview({
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              state: "running",
              summary: "审查任务已启动，正在等待 strategy-reviewer 返回结果。",
              items: [
                {
                  name: "审查任务",
                  status: "running",
                  detail: "已检测到 strategy-reviewer 子 agent 启动。",
                  suggestion: "",
                },
              ],
              suggestions: [],
            })
            .catch((err) =>
              opt.write("workspace review running save failed", {
                sessionID: input.sessionID,
                workspace: opt.workspace,
                worktree: opt.worktree,
                error: err instanceof Error ? err.message : String(err),
              }),
            )
          await opt.write("workspace review started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 分析启动时顺手写下当前 mode，后面的 save/gate 才知道
        // 这一轮属于 boot 还是 refresh。
        step("analysis", async () => {
          if (!analyze({ tool: input.tool, args: output.args })) return false
          opt.modes.set(opt.id, opt.modes.get(opt.id) ?? (opt.dirts.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
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
        step("project_init", async () => {
          if (!mcp(input, "init_project_state") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            exists: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, {
            exists: true,
            restored: true,
            stale: false,
          })
          await opt.write("project memory initialized through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        step("project_resume", async () => {
          if (!mcp(input, "resume_project_state") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            exists: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, {
            exists: true,
            restored: true,
            stale: false,
          })
          await opt.write("project memory resumed through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        step("project_save", async () => {
          if (!mcp(input, "save_project_state") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.memory.set(opt.id, {
            exists: true,
            restored: true,
            stale: false,
          })
          await opt.write("project memory saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 根会话里的成功修改不会立刻打断开发，
        // 但会让后续收尾阶段使用的基线失效。
        step("dirty", async () => {
          if (opt.subs.has(input.sessionID) || !ok(output)) return false
          const value = kind({ tool: input.tool, args: input.args })
          if (value !== "write" && value !== "exec") return false
          mark(opt, input.tool)
          const mem = opt.memory.get(opt.id) ?? cleanMemory(opt.projects.get(opt.id))
          opt.memory.set(opt.id, {
            exists: mem.exists,
            restored: mem.restored,
            stale: mem.restored,
          })
          await opt.write("workspace dirtied", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            tool: input.tool,
          })
          return false
        }),

        // 手动 refresh 会显式重新进入基线流水线，
        // 不管这次失效是来自代码修改还是用户主动要求。
        step("refresh", async () => {
          if (!mcp(input, "refresh_workspace") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          reset(opt, "refresh")
          await opt.write("workspace refresh requested", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            reason: "manual",
            detail: typeof input.args?.reason === "string" ? input.args.reason : "",
          })
          return true
        }),

        // 分析保存会把事务从“已产出分析”推进到“可以生成流程图”。
        // 这里还不能清掉 dirty，因为基线在流程图保存前都不完整。
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

        // 流程图保存才真正完成一轮基线事务，
        // 也是唯一一个把 dirty 清回 clean 的地方。
        step("save_chart", async () => {
          if (!mcp(input, "save_flowchart") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "flowchart") opt.pending.delete(opt.id)
          if (item?.kind === "flowchart" && item.state === "done")
            opt.dirts.set(opt.id, {
              state: "clean",
              updated: Date.now(),
              reason: "",
            })
          await opt.write("workspace flowchart saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 审查完全通过后直接排队进入 debug。
        // 这里不再强制重新分析，只有后续编辑把工作区打脏时才刷新。
        step("save_review", async () => {
          if (!mcp(input, "save_review") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "review") opt.pending.delete(opt.id)
          const done = item?.kind === "review" && pass(input.args)
          if (done) {
            opt.fixes.delete(fixkey(opt.id, input.sessionID))
            opt.pending.set(opt.id, {
              kind: "debug",
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
            })
          }
          if (item?.kind === "review" && !done && item.state !== "error") {
            const fix = opt.fixes.get(fixkey(opt.id, input.sessionID))
            const attempt = Math.min(fix?.attempt ?? 1, limit)
            opt.fixes.set(fixkey(opt.id, input.sessionID), {
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
              attempt,
              text: item.text,
            })
          }
          await opt.write("workspace review saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: item?.kind === "review" ? item.state : undefined,
            passed: done,
          })
          return true
        }),

        // debug 需要的是已保存的通过审查和专门的 debug pending，
        // 不要求额外刷新到最终快照后再启动。
        step("start_debug", async () => {
          if (!start(input) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind !== "debug" || item.sessionID !== input.sessionID) return false
          opt.pending.delete(opt.id)
          await opt.write("workspace review debug started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        // 子 agent 完成时只是在本地生成产物；
        // 下一轮 system 注入的 save 提醒才会把它变成可持久化状态。
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

        // review 完成后先把报告落到本地；
        // 真正的保存和修复分流在后面的 save_review 阶段决定。
        step("review_done", async () => {
          if (!review(input)) return false
          const text = reviewText(output.output) || "审查报告为空。"
          const state = reviewState(text)
          const fix = opt.fixes.get(fixkey(opt.id, input.sessionID))
          if (state === "failed") {
            const attempt = Math.min((fix?.attempt ?? 0) + 1, limit)
            opt.fixes.set(fixkey(opt.id, input.sessionID), {
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
              attempt,
              text,
            })
            await opt.write("workspace review needs fix", {
              sessionID: input.sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              attempt,
            })
          }
          if (state !== "failed") opt.fixes.delete(fixkey(opt.id, input.sessionID))
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

        // 分析完成后会重新启动事务里的流程图半段，
        // 后续流程图仍然必须基于这次最新分析文本重新生成。
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

export async function saveReviewRemote(service: string, input: SaveReview) {
  if (!service) return
  const resp = await fetch(new URL("/api/workbench/review", service), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!resp.ok) throw new Error(`save review failed: ${resp.status}`)
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

export async function loadProjectRemote(service: string, workspace: string, worktree: string) {
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
    exists: body.data.exists,
    updated: body.data.updatedAt ?? Date.now(),
  }
}
