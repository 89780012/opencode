import type { Hooks } from "@opencode-ai/plugin"
import { gate as block, closing, saving } from "./gate.js"
import { cleanDirt, cleanMemory, view as stateView } from "./life.js"
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
import {
  noteBoot,
  noteChart,
  noteClose,
  noteFinal,
  noteFix,
  noteRefresh,
  noteReview,
  noteResumeProject,
  noteSave,
  noteSaveProject,
  limit,
} from "./note.js"
import { items, mermaid, reviewState, reviewText, serial } from "./parse.js"
import { analyze, flowchart, kind, mcp, review } from "./tool.js"
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
  saveReview: (input: SaveReview) => Promise<void>
  write: Log
}

/** 统一判断工具执行结果是否失败，也兼容没有 `isError` 字段的返回值。*/
function ok(output: unknown) {
  if (!output || typeof output !== "object") return true
  if (!("isError" in output)) return true
  return output.isError !== true
}

/** 规范化路径，统一分隔符并转为小写，用于跨平台比较。*/
function normalizePath(input: string) {
  return input.replace(/\\/g, "/").toLowerCase()
}

/** 判断一次工具调用是否命中了当前 workspace / worktree。*/
function sameWorkspace(input: unknown, workspace: string, worktree: string, write: Log) {
  if (!input || typeof input !== "object") return false
  const a = input as Record<string, unknown>
  const wp = normalizePath(String(a.workspacePath ?? ""))
  if (wp !== normalizePath(workspace)) return false
  if (!a.worktreePath) {
    write("same workspace check", {
      workspace,
      worktree,
      wp,
      wt: "",
      ws: normalizePath(workspace),
      wtree: normalizePath(worktree),
    })
    return true
  }
  const result = normalizePath(String(a.worktreePath)) === normalizePath(worktree)
  write("same workspace check", {
    workspace,
    worktree,
    wp,
    wt: normalizePath(String(a.worktreePath)),
    ws: normalizePath(workspace),
    wtree: normalizePath(worktree),
  })
  return result
}

/** 规范化 review item 的 status，方便做大小写无关的比较。*/
function normalizeStatus(input: unknown) {
  if (typeof input !== "string") return ""
  return input.trim().toLowerCase()
}

/** 判断 `save_review` 提交的所有检查项是否都已通过。*/
function reviewPassed(input: unknown) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  if (args.state !== "passed") return false
  if (!Array.isArray(args.items) || !args.items.length) return false
  return args.items.every(
    (item) =>
      item && typeof item === "object" && normalizeStatus((item as Record<string, unknown>).status) === "passed",
  )
}

/** 生成 workspace + session 维度的修复记录 key。*/
function fixKey(id: string, session: string) {
  return id + "\x00" + session
}

/** 生成 workspace + session 维度的请求 key。*/
function requestKey(id: string, session: string) {
  return id + "\x00" + session
}

/** 从本地缓存或远端服务同步 analysis / chart / project 三类快照。*/
async function snapshot(opt: Opt) {
  const cached = opt.workspaces.get(opt.id)
  if (cached && !validAnalysis(cached)) opt.workspaces.delete(opt.id)
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
  const project =
    opt.projects.get(opt.id) ?? (await opt.loadProject(opt.workspace, opt.worktree).catch(() => undefined))
  if (project && validProject(project)) opt.projects.set(opt.id, project)
  if (project && !validProject(project)) opt.projects.delete(opt.id)
  return { analysis, chart: opt.charts.get(opt.id), project: opt.projects.get(opt.id) }
}

/** 标记当前 workspace 已被写脏，后续 review / final 需要刷新基线。*/
function mark(opt: Opt, reason: string) {
  opt.dirtyStates.set(opt.id, {
    state: "dirty",
    updated: Date.now(),
    reason,
  })
}

/** 将 workspace 重新推回 analysis -> flowchart 的基线起点。*/
function reset(opt: Opt, mode?: Mode) {
  opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
  opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
  opt.baselineModes.set(opt.id, mode ?? (opt.dirtyStates.get(opt.id)?.state === "dirty" ? "refresh" : "boot"))
  const pendingSave = opt.pending.get(opt.id)
  if (pendingSave?.kind === "analysis" || pendingSave?.kind === "flowchart") opt.pending.delete(opt.id)
}

/** workspace 级编排器，负责 system 注入、before 门禁和 after 状态推进。*/
export function createWorkspace(opt: Opt) {
  return {
    /** 外部显式要求刷新时，重建基线并记录日志。*/
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
    /** 模型出手前，决定这一轮应该注入哪一种隐藏系统提示。*/
    system: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!opt.workspace || !opt.id) return false

      // 获取到当前快照
      const snap = await snapshot(opt)

      // 当前的状态管理
      const state = stateView({
        analysis: snap.analysis,
        chart: snap.chart,
        project: snap.project,
        pendingSave: opt.pending.get(opt.id),
        dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
        projectMemory: opt.memory.get(opt.id) ?? cleanMemory(snap.project),
        baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
      })
      const sessionID = input.sessionID

      return flow([
        /** 1. 当前轮需要先保存 project memory 时，优先注入保存提醒。*/
        step("project_save", async () => {
          // 只有当前会话已经恢复过记忆，且这轮确实产生了新进展时，才会走到这里。
          if (
            !sessionID ||
            !saving(state, {
              sub: opt.childSessions.has(sessionID),
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
        /** 2. project memory 尚未恢复时，先要求恢复或初始化记忆。*/
        step("project_resume", async () => {
          // 没有恢复态时，先把 project memory 这道门补上，避免直接进入持续开发。
          if (state.projectMemory.hasRestoredState) return false
          await opt.write("project memory restore gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: state.projectMemory.hasProjectState,
          })
          output.system.push(noteResumeProject(state.projectMemory.hasProjectState))
          return true
        }),
        /** 3. 当前轮已经有待保存的 baseline 产物时，先去做 MCP 保存。*/
        step("save", async () => {
          // analysis / flowchart 已经产出，但还没同步进策略服务时，先强制保存。
          const pendingSave = state.pendingSave
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
        /** 4. 审查结果需要继续修复时，先把修复指令注入给主 agent。*/
        step("fix", async () => {
          // 审查没通过且还在修复轮次内时，先让主 agent 按审查意见继续修。
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
        /** 5. 用户明确要求 review 时，优先进入审查流程。*/
        step("review", async () => {
          // 只有用户已经显式请求 review，才会进入这条分支。
          if (!sessionID) return false
          const requestID = requestKey(opt.id, sessionID)
          if (!opt.reviewRequests.has(requestID)) return false
          // 允许在 dirty 状态下进行审查，不强制刷新基线
          if (state.life !== "ready" && state.life !== "dirty") return false
          opt.reviewRequests.delete(requestID)
          await opt.write("workspace review gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteReview({ workspace: opt.workspace, worktree: opt.worktree, sessionID }))
          return true
        }),
        /** 6. 用户明确要求最终收口时，若工作区已写脏则先切到 final 模式。*/
        step("final", async () => {
          // final 请求是显式意图，所以这里只处理用户已经要求收口的情况。
          if (!sessionID) return false
          const requestID = requestKey(opt.id, sessionID)
          if (!opt.finalRequests.has(requestID)) return false
          // 工作区已变脏时，先切到 final 模式并重建基线，再继续收口。
          if (state.life === "dirty") {
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
          // 如果已经干净收口完成，就清掉这次 final 请求。
          if (state.life === "ready") opt.finalRequests.delete(requestID)
          return false
        }),
        /** 7. 自动 final 检测：当审查通过且调试完成时自动触发最终收口 */
        step("auto_final", async () => {
          // 确保必要的 ID 存在
          if (!sessionID || !opt.id) return false

          // 安全地检查 pendingSave 的类型和状态
          const pendingSave = state.pendingSave
          const isReviewPassed =
            pendingSave != null &&
            typeof pendingSave === "object" &&
            "kind" in pendingSave &&
            pendingSave.kind === "review" &&
            "state" in pendingSave &&
            pendingSave.state === "passed"

          // 检查是否满足自动 final 条件：
          // 1. 审查刚刚完成且状态为 passed
          // 2. 工作区有代码变更（dirty 状态）
          // 3. 没有其他 pending 的 review/final 请求
          const hasDirtyChanges = state.life === "dirty"
          const requestID = requestKey(opt.id, sessionID)
          const noExistingRequests = !opt.reviewRequests.has(requestID) && !opt.finalRequests.has(requestID)

          if (isReviewPassed && hasDirtyChanges && noExistingRequests) {
            // 清除 review pending 状态
            opt.pending.delete(opt.id)
            // 触发 final 流程
            opt.finalRequests.add(requestID)
            await opt.write("workspace auto final triggered", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              reason: "review passed",
            })
            return true
          }
          return false
        }),
        /** 8. 工作区自然收尾时，提醒先完成 project memory 保存。*/
        step("close", async () => {
          // 只有不是子会话、没有挂起修复、也没有 review/final 请求时，才会自然收尾。
          if (
            !sessionID ||
            !closing(state, {
              sub: opt.childSessions.has(sessionID),
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
        /** 8. 首次进入或 analysis 缺失时，先建立初始 workspace 基线。*/
        step("boot", async () => {
          // 首次进入且 life 处于 idle，说明还没有现成的 initial baseline。
          if (state.life !== "idle") return false
          if (!state.analysis) opt.workspaces.set(opt.id, requestAnalysis(opt.workspace, opt.worktree))
          opt.baselineModes.set(opt.id, "boot")
          await opt.write("workspace boot gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: state.analysis?.state ?? "missing",
          })
          output.system.push(noteBoot())
          return true
        }),
        /** 9. analysis 已完成但 flowchart 还没准备好时，先推进流程图生成。*/
        step("chart", async () => {
          // analysis 必须已经 done，才有资格启动 flowchart。
          const chart = state.chart
          if (state.analysis?.state !== "done" || chart?.state === "done" || chart?.state === "generating") return false
          if (!chart || chart.state === "error") opt.charts.set(opt.id, requestChart(opt.workspace, opt.worktree))
          await opt.write("workspace flowchart gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            state: chart?.state ?? "missing",
          })
          output.system.push(noteChart(state.analysis))
          return true
        }),
        /** 10. 基线刷新中时，继续提醒完成 refresh 流程。*/
        step("refresh", async () => {
          // refresh 模式下，如果新的 analysis / chart 还没同步好，先继续提醒刷新。
          if (state.life !== "refreshing") return false
          if (
            state.analysis?.state === "done" &&
            (!state.chart || state.chart.state === "requested" || state.chart.state === "error")
          )
            return false
          await opt.write("workspace refresh reminder injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          output.system.push(noteRefresh())
          return true
        }),
        /** 11. 最终收口阶段时，继续提醒完成最后一次刷新。*/
        step("finalizing", async () => {
          // final 模式本质上也是刷新流程，只是目标换成最终收口。
          if (state.life !== "finalizing") return false
          if (
            state.analysis?.state === "done" &&
            (!state.chart || state.chart.state === "requested" || state.chart.state === "error")
          )
            return false
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
    /** 工具执行前做硬门禁，并记录 analysis / review / chart 的启动状态。*/
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1]) => {
      if (!opt.workspace || !opt.id) return false
      if (!opt.childSessions.has(input.sessionID)) {
        // 1. 先读取当前工作区快照，拿到 analysis / chart / project 的最新状态。
        const snap = await snapshot(opt)
        // 2. 再把分散状态折叠成统一生命周期视图，方便后面做一次性判断。
        const state = stateView({
          analysis: snap.analysis,
          chart: snap.chart,
          project: snap.project,
          pendingSave: opt.pending.get(opt.id),
          dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
          projectMemory: opt.memory.get(opt.id) ?? cleanMemory(snap.project),
          baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
        })
        // 3. 把当前即将执行的工具归类成工作流动作类型。
        const action = kind({ tool: input.tool, args: output.args })
        // 4. 根据“当前状态 + 即将执行的动作”计算门禁结果；有返回文案就说明必须拦截。
        const blockText = block(state, action)
        if (blockText) {
          // 还没建立 initial baseline，却已经想执行实现类动作时，先把状态重置回 boot 起点。
          if (state.life === "idle") reset(opt, "boot")
          await opt.write("workspace hard gate blocked tool", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            tool: input.tool,
            pending: state.pendingSave?.kind,
            analysis: state.analysis?.state ?? "missing",
            chart: state.chart?.state ?? "missing",
            life: state.life,
            kind: action,
          })
          throw new Error(blockText)
        }
      }

      return flow([
        /** flowchart 子 agent 即将启动时，把 chart 标成 generating。*/
        step("chart", async () => {
          // 只有真正启动了 strategy-flowchart-generator，才会命中这里。
          if (!flowchart({ tool: input.tool, args: output.args })) return false
          opt.charts.set(opt.id, freshChart(opt.workspace, opt.worktree))
          await opt.write("workspace flowchart started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        /** review 子 agent 即将启动时，先把“审查进行中”写进远端状态。*/
        step("review", async () => {
          // 只有真正启动了 strategy-reviewer，才会预写 running review 结果。
          if (!review({ tool: input.tool, args: output.args })) return false
          await opt
            .saveReview({
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              state: "running",
              summary: "审查已开始，当前由 strategy-reviewer 接手处理。",
              items: [
                {
                  name: "审查进行中",
                  status: "running",
                  detail: "strategy-reviewer 子 agent 正在执行审查。",
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
        /** analysis 子 agent 即将启动时，把 analysis 标成 running，并确定当前 baseline 模式。*/
        step("analysis", async () => {
          // 只有真正启动了 workspace-analyzer，才会把 analysis 状态推进到 running。
          if (!analyze({ tool: input.tool, args: output.args })) return false
          opt.baselineModes.set(
            opt.id,
            opt.baselineModes.get(opt.id) ?? (opt.dirtyStates.get(opt.id)?.state === "dirty" ? "refresh" : "boot"),
          )
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
    /** 工具执行后推进 project memory、baseline 以及 review 队列状态。 */
    after: async (input: Parameters<After>[0], output: Parameters<After>[1]) => {
      if (!opt.workspace || !opt.id) return false

      return flow([
        step("project_init", async () => {
          // 只有 init_project_state 成功返回，才说明记忆是“新建成功”。
          if (
            !mcp(input, "init_project_state") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          ) {
            opt.write("project memory initialization failed", {
              sessionID: input.sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              error: "project memory initialization failed",
            })
            return false
          }

          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await snapshot(opt)
          await opt.write("project memory initialized through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("project_resume", async () => {
          // resume_project_state 成功后，才算把历史记忆真正接回来了。
          if (
            !mcp(input, "resume_project_state") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          ) {
            opt.write("project memory resume failed", {
              sessionID: input.sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              error: "project memory resume failed",
            })
            return false
          }
          opt.projects.set(opt.id, {
            workspace: opt.workspace,
            worktree: opt.worktree,
            hasProjectState: true,
            updated: Date.now(),
          })
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await snapshot(opt)
          await opt.write("project memory resumed through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("project_save", async () => {
          // save_project_state 只有在当前工作区、当前 worktree 且执行成功时才生效。
          if (
            !mcp(input, "save_project_state") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          )
            return false
          opt.memory.set(opt.id, { hasProjectState: true, hasRestoredState: true, needsSave: false })
          await opt.write("project memory saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),
        step("dirty", async () => {
          // 只要主会话里真正发生了写入或执行，就把 workspace 标成 dirty。
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
          // 手动调用 refresh_workspace 时，重置 analysis 和 flowchart 基线。
          if (
            !mcp(input, "refresh_workspace") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          )
            return false
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
          // analysis 保存成功后，清掉对应的 pending 状态。
          if (
            !mcp(input, "save_analysis") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          )
            return false
          if (opt.pending.get(opt.id)?.kind === "analysis") opt.pending.delete(opt.id)
          await opt.write("workspace analysis saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          return true
        }),

        step("save_chart", async () => {
          // flowchart 保存成功后，如果它本轮已经 done，就把 dirty 状态也顺手清掉。
          if (
            !mcp(input, "save_flowchart") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          )
            return false
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
          // review 保存后通过则清掉修复轮次，未通过则继续积累修复轮次。
          if (
            !mcp(input, "save_review") ||
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            !ok(output)
          )
            return false
          const item = opt.pending.get(opt.id)
          if (item?.kind === "review") opt.pending.delete(opt.id)
          const done = item?.kind === "review" && reviewPassed(input.args)
          if (done) opt.reviewFixes.delete(fixKey(opt.id, input.sessionID))
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
        step("chart_done", async () => {
          // flowchart 子 agent 返回后，把结果落到 chart 状态和 pending 队列里。
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
          // review 子 agent 返回后，先解析结论，再决定是否要继续修复。
          if (!review(input)) return false
          const text = reviewText(output.output) || "审查结果为空"
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
          // analysis 子 agent 返回后，更新 analysis 结果，并把 flowchart 重新拉回 requested。
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
