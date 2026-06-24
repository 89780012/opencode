import type { Hooks } from "@opencode-ai/plugin"
import { gate, closing, saving } from "./gate.js"
import { cleanDirt, cleanMemory, view } from "./life.js"
import {
  doneAnalysis,
  doneChart,
  freshAnalysis,
  freshChart,
  requestAnalysis,
  requestChart,
  validAnalysis,
  validChart,
  validProject,
} from "./model.js"
import { noteBoot, noteChart, noteClose, noteFinal, noteFix, noteRefresh, noteReview, noteResumeProject, noteSave, noteSaveProject, limit } from "./note.js"
import { items, mermaid, reviewState, reviewText, serial } from "./parse.js"
import { analyze, flowchart, kind, mcp, review, start } from "./tool.js"
import type { Analysis, Chart, Dirt, Fix, Memory, Mode, Pending, Project, SaveReview } from "./types.js"
import { flow, step } from "./workflow.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type Before = NonNullable<Hooks["tool.execute.before"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Reason = "manual" | "review" | "gate"

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

/** 统一判断工具执行结果是否失败，兼容没有 isError 字段的返回值。 */
function ok(output: unknown) {
  if (!output || typeof output !== "object") return true
  if (!("isError" in output)) return true
  return output.isError !== true
}

/** 判断一次工具调用是否命中了当前 workspace/worktree。 */
function same(input: unknown, workspace: string, worktree: string) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  return args.workspacePath === workspace && (args.worktreePath === worktree || (!args.worktreePath && worktree === workspace))
}

/** 规范化 review item status 的比较值。 */
function clean(input: unknown) {
  if (typeof input !== "string") return ""
  return input.trim().toLowerCase()
}

/** 判断 save_review 提交的所有检查项是否都已通过。 */
function pass(input: unknown) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  if (args.state !== "passed") return false
  if (!Array.isArray(args.items) || !args.items.length) return false
  return args.items.every((item) => item && typeof item === "object" && clean((item as Record<string, unknown>).status) === "passed")
}

/** 生成 workspace + session 维度的 fix 记录 key。 */
function fixkey(id: string, session: string) {
  return id + "\x00" + session
}

/** 生成 workspace + session 维度的请求 key。 */
function sessionkey(id: string, session: string) {
  return id + "\x00" + session
}

/** 从本地缓存或远端服务同步 analysis / chart / project 三类快照。 */
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
  return { analysis, chart: opt.charts.get(opt.id), project: opt.projects.get(opt.id) }
}

/** 标记当前 workspace 已被写脏，后续 review/final 需要刷新基线。 */
function mark(opt: Opt, reason: string) {
  opt.dirts.set(opt.id, {
    state: "dirty",
    updated: Date.now(),
    reason,
  })
}

/** 把 workspace 重新推回 analysis -> flowchart 的基线流程起点。 */
function reset(opt: Opt, mode?: Mode) {
  opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
  opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
  opt.modes.set(opt.id, mode ?? (opt.dirts.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
  const wait = opt.pending.get(opt.id)
  if (wait?.kind === "analysis" || wait?.kind === "flowchart" || wait?.kind === "debug") opt.pending.delete(opt.id)
}

/** workspace 级编排器：负责 system 注入、before 门禁、after 状态推进。 */
export function createWorkspace(opt: Opt) {
  return {
    /** 外部显式请求刷新时，重建基线并留下日志。 */
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
    /** 在模型出手前决定当前轮应该注入哪一种隐藏系统提示。 */
    system: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      const data = await sync(opt)
      const next = view({
        analysis: data.analysis,
        chart: data.chart,
        project: data.project,
        wait: opt.pending.get(opt.id),
        dirt: opt.dirts.get(opt.id) ?? cleanDirt(),
        mem: opt.memory.get(opt.id) ?? cleanMemory(data.project),
        mode: opt.modes.get(opt.id) ?? "boot",
      })
      const sessionID = input.sessionID

      return flow([
        step("project_save", async () => {
          if (
            !sessionID ||
            !saving(next, {
              sub: opt.subs.has(sessionID),
              hold: opt.hold(sessionID),
              review: opt.reviewRequests.has(sessionkey(opt.id, sessionID)),
              final: opt.finalRequests.has(sessionkey(opt.id, sessionID)),
              fix: opt.fixes.has(fixkey(opt.id, sessionID)),
            })
          )
            return false
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
        step("fix", async () => {
          if (!sessionID) return false
          const fix = opt.fixes.get(fixkey(opt.id, sessionID))
          if (!fix) return false
          await opt.write("workspace review fix injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            attempt: fix.attempt,
          })
          output.system.push(noteFix(fix))
          if (fix.attempt >= limit) opt.fixes.delete(fixkey(opt.id, sessionID))
          return true
        }),
        step("review", async () => {
          if (!sessionID) return false
          const requestID = sessionkey(opt.id, sessionID)
          if (!opt.reviewRequests.has(requestID)) return false
          if (next.life === "dirty") {
            await opt.write("workspace refresh gate injected", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              action: "review",
            })
            output.system.push(noteRefresh("浠ｇ爜瀹℃煡"))
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
        step("final", async () => {
          if (!sessionID) return false
          const requestID = sessionkey(opt.id, sessionID)
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
        step("close", async () => {
          if (
            !sessionID ||
            !closing(next, {
              sub: opt.subs.has(sessionID),
              hold: opt.hold(sessionID),
              review: opt.reviewRequests.has(sessionkey(opt.id, sessionID)),
              final: opt.finalRequests.has(sessionkey(opt.id, sessionID)),
              fix: opt.fixes.has(fixkey(opt.id, sessionID)),
            })
          )
            return false
          await opt.write("workspace close reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteClose())
          return true
        }),
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
    /** 在工具执行前做硬门禁，并记录 analysis/review/chart 的启动态。 */
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (!opt.subs.has(input.sessionID)) {
        const data = await sync(opt)
        const next = view({
          analysis: data.analysis,
          chart: data.chart,
          project: data.project,
          wait: opt.pending.get(opt.id),
          dirt: opt.dirts.get(opt.id) ?? cleanDirt(),
          mem: opt.memory.get(opt.id) ?? cleanMemory(data.project),
          mode: opt.modes.get(opt.id) ?? "boot",
        })
        const value = kind({ tool: input.tool, args: output.args })
        const text = gate(next, value)
        if (text) {
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
        step("review", async () => {
          if (!review({ tool: input.tool, args: output.args })) return false
          await opt
            .saveReview({
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              state: "running",
              summary: "瀹℃煡浠诲姟宸插惎鍔紝姝ｅ湪绛夊緟 strategy-reviewer 杩斿洖缁撴灉銆?",
              items: [
                {
                  name: "瀹℃煡浠诲姟",
                  status: "running",
                  detail: "宸叉娴嬪埌 strategy-reviewer 瀛?agent 鍚姩銆?",
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
    /** 在工具执行后推进 project memory、baseline 和 review/debug 队列状态。 */
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
          opt.memory.set(opt.id, { exists: true, restored: true, stale: false })
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
          opt.memory.set(opt.id, { exists: true, restored: true, stale: false })
          await opt.write("project memory resumed through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("project_save", async () => {
          if (!mcp(input, "save_project_state") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.memory.set(opt.id, { exists: true, restored: true, stale: false })
          await opt.write("project memory saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
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
        step("save_chart", async () => {
          if (!mcp(input, "save_flowchart") || !same(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "flowchart") opt.pending.delete(opt.id)
          if (item?.kind === "flowchart" && item.state === "done") opt.dirts.set(opt.id, cleanDirt())
          await opt.write("workspace flowchart saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
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
        step("review_done", async () => {
          if (!review(input)) return false
          const text = reviewText(output.output) || "瀹℃煡鎶ュ憡涓虹┖銆?"
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
