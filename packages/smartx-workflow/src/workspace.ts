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
  dirtyStates: Map<string, Dirt>
  memory: Map<string, Memory>
  baselineModes: Map<string, Mode>
  reviewFixes: Map<string, Fix>
  reviewRequests: Set<string>
  finalRequests: Set<string>
  childSessions: Set<string>
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

/** 缁熶竴鍒ゆ柇宸ュ叿鎵ц缁撴灉鏄惁澶辫触锛屽吋瀹规病鏈?isError 瀛楁鐨勮繑鍥炲€笺€?*/
function ok(output: unknown) {
  if (!output || typeof output !== "object") return true
  if (!("isError" in output)) return true
  return output.isError !== true
}

/** 鍒ゆ柇涓€娆″伐鍏疯皟鐢ㄦ槸鍚﹀懡涓簡褰撳墠 workspace/worktree銆?*/
function sameWorkspace(input: unknown, workspace: string, worktree: string) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  return args.workspacePath === workspace && (args.worktreePath === worktree || (!args.worktreePath && worktree === workspace))
}

/** 瑙勮寖鍖?review item status 鐨勬瘮杈冨€笺€?*/
function normalizeStatus(input: unknown) {
  if (typeof input !== "string") return ""
  return input.trim().toLowerCase()
}

/** 鍒ゆ柇 save_review 鎻愪氦鐨勬墍鏈夋鏌ラ」鏄惁閮藉凡閫氳繃銆?*/
function reviewPassed(input: unknown) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  if (args.state !== "passed") return false
  if (!Array.isArray(args.items) || !args.items.length) return false
  return args.items.every((item) => item && typeof item === "object" && normalizeStatus((item as Record<string, unknown>).status) === "passed")
}

/** 鐢熸垚 workspace + session 缁村害鐨?fix 璁板綍 key銆?*/
function fixKey(id: string, session: string) {
  return id + "\x00" + session
}

/** 鐢熸垚 workspace + session 缁村害鐨勮姹?key銆?*/
function requestKey(id: string, session: string) {
  return id + "\x00" + session
}

/** 浠庢湰鍦扮紦瀛樻垨杩滅鏈嶅姟鍚屾 analysis / chart / project 涓夌被蹇収銆?*/
async function sync(opt: Opt) {
  const loadedAnalysis = opt.workspaces.get(opt.id) ?? (await opt.load(opt.workspace, opt.worktree).catch(() => undefined))
  if (loadedAnalysis && validAnalysis(loadedAnalysis)) opt.workspaces.set(opt.id, loadedAnalysis)
  if (loadedAnalysis && !validAnalysis(loadedAnalysis)) opt.workspaces.delete(opt.id)
  const analysis = opt.workspaces.get(opt.id)
  const loadedChart =
    analysis?.state === "done"
      ? (opt.charts.get(opt.id) ?? (await opt.loadChart(opt.workspace, opt.worktree).catch(() => undefined)))
      : undefined
  if (loadedChart && validChart(loadedChart)) opt.charts.set(opt.id, loadedChart)
  if (loadedChart && !validChart(loadedChart)) opt.charts.delete(opt.id)
  const project = opt.projects.get(opt.id) ?? (await opt.loadProject(opt.workspace, opt.worktree).catch(() => undefined))
  if (project && validProject(project)) opt.projects.set(opt.id, project)
  if (project && !validProject(project)) opt.projects.delete(opt.id)
  return { analysis, chart: opt.charts.get(opt.id), project: opt.projects.get(opt.id) }
}

/** 鏍囪褰撳墠 workspace 宸茶鍐欒剰锛屽悗缁?review/final 闇€瑕佸埛鏂板熀绾裤€?*/
function mark(opt: Opt, reason: string) {
  opt.dirtyStates.set(opt.id, {
    state: "dirty",
    updated: Date.now(),
    reason,
  })
}

/** 鎶?workspace 閲嶆柊鎺ㄥ洖 analysis -> flowchart 鐨勫熀绾挎祦绋嬭捣鐐广€?*/
function reset(opt: Opt, mode?: Mode) {
  opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
  opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
  opt.baselineModes.set(opt.id, mode ?? (opt.dirtyStates.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
  const pendingSave = opt.pending.get(opt.id)
  if (pendingSave?.kind === "analysis" || pendingSave?.kind === "flowchart" || pendingSave?.kind === "debug") opt.pending.delete(opt.id)
}

/** workspace 绾х紪鎺掑櫒锛氳礋璐?system 娉ㄥ叆銆乥efore 闂ㄧ銆乤fter 鐘舵€佹帹杩涖€?*/
export function createWorkspace(opt: Opt) {
  return {
    /** 澶栭儴鏄惧紡璇锋眰鍒锋柊鏃讹紝閲嶅缓鍩虹嚎骞剁暀涓嬫棩蹇椼€?*/
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
    /** 鍦ㄦā鍨嬪嚭鎵嬪墠鍐冲畾褰撳墠杞簲璇ユ敞鍏ュ摢涓€绉嶉殣钘忕郴缁熸彁绀恒€?*/
    system: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      const data = await sync(opt)
      const next = view({
        analysis: data.analysis,
        chart: data.chart,
        project: data.project,
        pendingSave: opt.pending.get(opt.id),
        dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
        projectMemory: opt.memory.get(opt.id) ?? cleanMemory(data.project),
        baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
      })
      const sessionID = input.sessionID

      return flow([
        step("project_save", async () => {
          if (
            !sessionID ||
            !saving(next, {
              sub: opt.childSessions.has(sessionID),
              hold: opt.hold(sessionID),
              review: opt.reviewRequests.has(requestKey(opt.id, sessionID)),
              final: opt.finalRequests.has(requestKey(opt.id, sessionID)),
              fix: opt.reviewFixes.has(fixKey(opt.id, sessionID)),
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
          if (next.projectMemory.hasRestoredState) return false
          await opt.write("project memory restore gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: next.projectMemory.hasProjectState,
          })
          output.system.push(noteResumeProject(next.projectMemory.hasProjectState))
          return true
        }),
        step("save", async () => {
          const pendingSave = next.pendingSave
          if (!pendingSave) return false
          await opt.write("workspace mcp save reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            kind: pendingSave.kind,
          })
          output.system.push(noteSave(pendingSave))
          return true
        }),
        step("fix", async () => {
          if (!sessionID) return false
          const fix = opt.reviewFixes.get(fixKey(opt.id, sessionID))
          if (!fix) return false
          await opt.write("workspace review fix injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            attempt: fix.attempt,
          })
          output.system.push(noteFix(fix))
          if (fix.attempt >= limit) opt.reviewFixes.delete(fixKey(opt.id, sessionID))
          return true
        }),
        step("review", async () => {
          if (!sessionID) return false
          const requestID = requestKey(opt.id, sessionID)
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
        step("final", async () => {
          if (!sessionID) return false
          const requestID = requestKey(opt.id, sessionID)
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
              sub: opt.childSessions.has(sessionID),
              hold: opt.hold(sessionID),
              review: opt.reviewRequests.has(requestKey(opt.id, sessionID)),
              final: opt.finalRequests.has(requestKey(opt.id, sessionID)),
              fix: opt.reviewFixes.has(fixKey(opt.id, sessionID)),
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
          opt.baselineModes.set(opt.id, "boot")
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
    /** 鍦ㄥ伐鍏锋墽琛屽墠鍋氱‖闂ㄧ锛屽苟璁板綍 analysis/review/chart 鐨勫惎鍔ㄦ€併€?*/
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (!opt.childSessions.has(input.sessionID)) {
        const data = await sync(opt)
        const next = view({
          analysis: data.analysis,
          chart: data.chart,
          project: data.project,
          pendingSave: opt.pending.get(opt.id),
          dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
        projectMemory: opt.memory.get(opt.id) ?? cleanMemory(data.project),
          baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
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
            pending: next.pendingSave?.kind,
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
              summary: "鐎光剝鐓℃禒璇插瀹告彃鎯庨崝顭掔礉濮濓絽婀粵澶婄窡 strategy-reviewer 鏉╂柨娲栫紒鎾寸亯閵?",
              items: [
                {
                  name: "鐎光剝鐓℃禒璇插",
                  status: "running",
                  detail: "瀹稿弶顥呭ù瀣煂 strategy-reviewer 鐎?agent 閸氼垰濮╅妴?",
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
          opt.baselineModes.set(opt.id, opt.baselineModes.get(opt.id) ?? (opt.dirtyStates.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
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
    /** 鍦ㄥ伐鍏锋墽琛屽悗鎺ㄨ繘 project memory銆乥aseline 鍜?review/debug 闃熷垪鐘舵€併€?*/
    after: async (input: Parameters<After>[0], output: Parameters<After>[1]) => {
      if (!opt.workspace || !opt.id) return false

      return flow([
        step("project_init", async () => {
          if (!mcp(input, "init_project_state") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await opt.write("project memory initialized through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("project_resume", async () => {
          if (!mcp(input, "resume_project_state") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await opt.write("project memory resumed through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("project_save", async () => {
          if (!mcp(input, "save_project_state") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await opt.write("project memory saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("dirty", async () => {
          if (opt.childSessions.has(input.sessionID) || !ok(output)) return false
          const value = kind({ tool: input.tool, args: input.args })
          if (value !== "write" && value !== "exec") return false
          mark(opt, input.tool)
          const projectMemory = opt.memory.get(opt.id) ?? cleanMemory(opt.projects.get(opt.id))
          opt.memory.set(opt.id, {
            hasProjectState: projectMemory.hasProjectState,
            hasRestoredState: projectMemory.hasRestoredState,
            needsSave: projectMemory.hasRestoredState,
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
          if (!mcp(input, "refresh_workspace") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
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
          if (!mcp(input, "save_analysis") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          if (opt.pending.get(opt.id)?.kind === "analysis") opt.pending.delete(opt.id)
          await opt.write("workspace analysis saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("save_chart", async () => {
          if (!mcp(input, "save_flowchart") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "flowchart") opt.pending.delete(opt.id)
          if (item?.kind === "flowchart" && item.state === "done") opt.dirtyStates.set(opt.id, cleanDirt())
          await opt.write("workspace flowchart saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("save_review", async () => {
          if (!mcp(input, "save_review") || !sameWorkspace(input.args, opt.workspace, opt.worktree) || !ok(output)) return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "review") opt.pending.delete(opt.id)
          const done = item?.kind === "review" && reviewPassed(input.args)
          if (done) {
            opt.reviewFixes.delete(fixKey(opt.id, input.sessionID))
            opt.pending.set(opt.id, {
              kind: "debug",
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
            })
          }
          if (item?.kind === "review" && !done && item.state !== "error") {
            const fix = opt.reviewFixes.get(fixKey(opt.id, input.sessionID))
            const attempt = Math.min(fix?.attempt ?? 1, limit)
            opt.reviewFixes.set(fixKey(opt.id, input.sessionID), {
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
              attempt,
              reviewText: item.reviewText,
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
                errorText: "flowchart result is empty",
              }
          opt.charts.set(opt.id, next)
          opt.pending.set(opt.id, {
            kind: "flowchart",
            workspacePath: opt.workspace,
            worktreePath: opt.worktree,
            state,
            mermaidCode: next.mermaidCode,
            errorText: next.errorText,
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
          const text = reviewText(output.output) || "鐎光剝鐓￠幎銉ユ啞娑撹櫣鈹栭妴?"
          const state = reviewState(text)
          const fix = opt.reviewFixes.get(fixKey(opt.id, input.sessionID))
          if (state === "failed") {
            const attempt = Math.min((fix?.attempt ?? 0) + 1, limit)
            opt.reviewFixes.set(fixKey(opt.id, input.sessionID), {
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              sessionID: input.sessionID,
              attempt,
              reviewText: text,
            })
            await opt.write("workspace review needs fix", {
              sessionID: input.sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              attempt,
            })
          }
          if (state !== "failed") opt.reviewFixes.delete(fixKey(opt.id, input.sessionID))
          opt.pending.set(opt.id, {
            kind: "review",
            workspacePath: opt.workspace,
            worktreePath: opt.worktree,
            state,
            reviewText: text,
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
            summaryItems: list,
            summaryText: text,
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

