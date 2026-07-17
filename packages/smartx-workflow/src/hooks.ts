import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { key, wantsFinal, wantsReview, type Analysis, type Chart, type Dirt, type Mode } from "./state.js"
import {
  callRemote,
  disabled,
  loadChartRemote,
  loadProjectRemote,
  loadRemote,
  loadRunRemote,
  loadWorkflowRemote,
  startRunRemote,
  updateRunRemote,
} from "./remote.js"
import { noteReviewer } from "./note.js"
import type { Automation, Fix, Memory, Pending, Project, Run, RunStart, RunUpdate, SaveReview } from "./types.js"
import { createWorkspace } from "./workspace.js"
import { ambient, python } from "./python.js"

const pythonPolicy =
  "In a SmartX workspace, run all Python through smartx_python. Use code for inline source or file for a workspace-relative .py script; do not invoke Python, package managers, or virtual environments through Bash."

function recover(input: Record<string, unknown>, run: Run, workspace: string, worktree: string): Fix | undefined {
  if (input.sessionId !== run.sessionId || input.state !== "failed" || typeof input.summary !== "string") return
  if (!input.summary.trim() || !Array.isArray(input.items) || !input.items.length) return
  const rows = input.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return ""
    const row = item as Record<string, unknown>
    if (typeof row.name !== "string" || typeof row.detail !== "string") return ""
    const tip = typeof row.suggestion === "string" && row.suggestion.trim() ? `建议：${row.suggestion.trim()}` : ""
    return [`${row.name.trim()}：${row.detail.trim()}`, tip].filter(Boolean).join("\n")
  })
  if (rows.some((row) => !row)) return
  const tips = Array.isArray(input.suggestions)
    ? input.suggestions.filter((item): item is string => typeof item === "string" && !!item.trim())
    : []
  return {
    workspacePath: workspace,
    worktreePath: worktree,
    sessionID: run.sessionId,
    attempt: run.reviewRound,
    reviewText: [input.summary.trim(), ...rows, ...(tips.length ? ["综合建议：", ...tips] : [])].join("\n\n"),
    changed: false,
    resumes: 0,
  }
}

type Dep = {
  workspaces?: Map<string, Analysis>
  charts?: Map<string, Chart>
  projects?: Map<string, Project>
  pending?: Map<string, Pending>
  dirtyStates?: Map<string, Dirt>
  memory?: Map<string, Memory>
  baselineModes?: Map<string, Mode>
  reviewFixes?: Map<string, Fix>
  reviewRequests?: Set<string>
  reviewRuns?: Set<string>
  finalRequests?: Set<string>
  childSessions?: Set<string>
  runs?: Map<string, Run>
  parent?: (id: string) => Promise<boolean>
  service?: string
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart?: (workspace: string, worktree: string) => Promise<Chart | undefined>
  loadProject?: (workspace: string, worktree: string) => Promise<Project | undefined>
  saveReview?: (input: SaveReview) => Promise<void>
  loadRun?: (workspace: string, session: string) => Promise<Run | undefined>
  startRun?: (input: RunStart) => Promise<Run>
  updateRun?: (input: RunUpdate) => Promise<Run>
  workflow?: () => Promise<Automation>
  baseline?: () => Promise<boolean>
  call?: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>
  dispatch?: (session: string, action: "review" | "fix", prompt: string) => Promise<void>
  runtime?: NonNullable<Parameters<typeof python>[0]>
}

/** 组装插件 hook，把 session 配对与 workspace 工作流接到同一个入口上。 */
export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const workspaces = dep.workspaces ?? new Map<string, Analysis>()
  const charts = dep.charts ?? new Map<string, Chart>()
  const projects = dep.projects ?? new Map<string, Project>()
  const pending = dep.pending ?? new Map<string, Pending>()
  const dirtyStates = dep.dirtyStates ?? new Map<string, Dirt>()
  const memory = dep.memory ?? new Map<string, Memory>()
  const baselineModes = dep.baselineModes ?? new Map<string, Mode>()
  const reviewFixes = dep.reviewFixes ?? new Map<string, Fix>()
  const reviewRequests = dep.reviewRequests ?? new Set<string>()
  const reviewRuns = dep.reviewRuns ?? new Set<string>()
  const finalRequests = dep.finalRequests ?? new Set<string>()
  const childSessions = dep.childSessions ?? new Set<string>()
  const runs = dep.runs ?? new Map<string, Run>()
  const workspace = ctx.directory
  const worktree = ctx.worktree || ctx.directory
  const id = workspace ? key(workspace, worktree) : ""
  const service = dep.service ?? Bun.env.STRATEGY_SERVICE_URL ?? ""
  const flags = new Map<string, Automation>()
  const driving = new Set<string>()
  const active =
    dep.workflow ??
    (dep.baseline
      ? async () => ({ ...disabled, baseline: await dep.baseline!() })
      : () => loadWorkflowRemote(service))
  const flag = async (session: string, fresh = false) => {
    if (!fresh && flags.has(session)) return flags.get(session) ?? disabled
    const cfg = await active().catch(() => disabled)
    flags.set(session, cfg)
    return cfg
  }
  const load = dep.loadRun ?? ((workspace: string, session: string) => loadRunRemote(service, workspace, session))
  const start = dep.startRun ?? ((input: RunStart) => startRunRemote(service, input))
  const update = dep.updateRun ?? ((input: RunUpdate) => updateRunRemote(service, input))
  const call = dep.call ?? ((name: string, args: Record<string, unknown>) => callRemote(service, name, args))
  const dispatch =
    dep.dispatch ??
    (async (session: string, action: "review" | "fix", prompt: string) => {
      const parts =
        action === "review"
          ? [
              {
                type: "subtask" as const,
                prompt,
                description: "策略审查",
                agent: "strategy-reviewer",
              },
            ]
          : [{ type: "text" as const, text: prompt, synthetic: true }]
      const result = await ctx.client.session.promptAsync({
        path: { id: session },
        query: { directory: workspace },
        body: { agent: "smartx-helper", parts },
      })
      if (result.error) throw new Error(`session ${action} dispatch failed`)
    })
  /** 统一把插件内部事件写入 opencode 日志。 */
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
  const workspaceFlow = createWorkspace({
    workspaces,
    charts,
    projects,
    pending,
    dirtyStates,
    memory,
    baselineModes,
    reviewFixes,
    reviewRequests,
    reviewRuns,
    finalRequests,
    childSessions,
    runs,
    parent:
      dep.parent ??
      (async (id) => {
        const result = await ctx.client.session.get({ path: { id } })
        if (!result.data) throw new Error("session not found")
        return !!result.data.parentID
      }),
    workspace,
    worktree,
    id,
    load: dep.load ?? ((workspace, worktree) => loadRemote(service, workspace, worktree)),
    loadChart: dep.loadChart ?? ((workspace, worktree) => loadChartRemote(service, workspace, worktree)),
    loadProject: dep.loadProject ?? ((workspace, worktree) => loadProjectRemote(service, workspace, worktree)),
    saveReview:
      dep.saveReview ??
      (async (input) => {
        await call("save_review", { ...input })
      }),
    loadRun: load,
    startRun: start,
    updateRun: update,
    write,
  })

  const save = async (run: Run, input: Omit<RunUpdate, "id" | "workspacePath" | "sessionId">) => {
    const row = await update({
      id: run.id,
      workspacePath: run.workspacePath,
      sessionId: run.sessionId,
      ...input,
    })
    runs.set(id + "\x00" + run.sessionId, row)
    return row
  }
  const done = (run: Run) =>
    run.stage === "done" || run.state === "failed" || run.state === "review_exhausted" || run.state === "cancelled"
  const next = (run: Run) => {
    if (run.backtestEnabled) return { stage: "backtest", state: "requested" } as const
    return { stage: "done", state: "passed" } as const
  }
  const ready = (cfg: Automation) => {
    if (memory.get(id)?.needsSave) return false
    if (!cfg.baseline) return true
    return (
      dirtyStates.get(id)?.state !== "dirty" &&
      workspaces.get(id)?.state === "done" &&
      charts.get(id)?.state === "done"
    )
  }
  const drive = async (session: string) => {
    if (!id || driving.has(session)) return
    driving.add(session)
    let run: Run | undefined
    try {
      if (childSessions.has(session) || (await workspaceFlow.child(session))) return
      const cfg = await flag(session, true)
      if (!cfg.review && !cfg.debug && !cfg.backtest) return
      run = await load(workspace, session).catch(() => undefined)
      const scope = id + "\x00" + session
      const dirt = dirtyStates.get(id)
      if (
        (!run || done(run)) &&
        dirt?.state === "dirty" &&
        (!dirt.session || dirt.session === session) &&
        dirt.updated > (run?.updatedAt ?? 0)
      ) {
        run = await start({
          workspacePath: workspace,
          sessionId: session,
          codeRevision: String(dirt.updated),
          review: cfg.review,
          debug: cfg.debug,
          backtest: cfg.backtest,
        })
      }
      if (!run) return
      runs.set(scope, run)
      if (done(run)) return
      if (!ready(cfg)) {
        await dispatch(session, "fix", "继续执行当前未完成的自动工作流步骤。")
        return
      }
      finalRequests.delete(scope)
      if (run.stage === "review") {
        if (run.state === "dispatching") {
          if (Date.now() - run.updatedAt < 30_000) return
          run = await save(run, { stage: "review", state: "requested" })
        }
        if (run.state === "requested") {
          run = await save(run, { stage: "review", state: "dispatching" })
          const req = await call("get_requirements", { workspacePath: workspace, sessionId: session })
          await dispatch(session, "review", noteReviewer(req.requirements ?? []))
          await write("automatic review dispatched after idle", {
            sessionID: session,
            workspace,
            workflowId: run.id,
            reviewRound: run.reviewRound + 1,
          })
          return
        }
        if (run.state === "running") {
          await save(run, {
            stage: "done",
            state: "failed",
            error: "自动审查已经结束，但结构化结果未能保存。",
          })
          return
        }
        if (run.state !== "fixing") return
        const fix =
          reviewFixes.get(scope) ??
          recover(
            await call("get_review", { workspacePath: workspace, worktreePath: worktree, sessionId: session }),
            run,
            workspace,
            worktree,
          )
        if (!fix) {
          await save(run, { stage: "done", state: "failed", error: "自动审查修复上下文已丢失。" })
          return
        }
        reviewFixes.set(scope, fix)
        if (fix.changed && ready(cfg)) {
          await save(run, { stage: "review", state: "dispatching", reviewRound: run.reviewRound })
          const req = await call("get_requirements", { workspacePath: workspace, sessionId: session })
          await dispatch(session, "review", noteReviewer(req.requirements ?? []))
          return
        }
        const resumes = fix.resumes ?? 0
        if (resumes >= 2) {
          await save(run, {
            stage: "done",
            state: "failed",
            reviewRound: run.reviewRound,
            error: fix.changed ? "自动修复后的收口步骤连续两次没有完成。" : "自动修复连续两次未产生代码变更。",
          })
          return
        }
        reviewFixes.set(scope, { ...fix, resumes: resumes + 1 })
        await dispatch(session, "fix", "继续执行当前未完成的自动修复步骤。")
        return
      }
      if (run.stage === "debug") {
        if (run.state === "passed") run = await save(run, next(run))
        if (run.stage === "backtest" && run.state === "requested") {
          await call("run_backtest", {
            workspacePath: workspace,
            sessionId: session,
            workflowId: run.id,
            requestKey: `pipeline:${run.id}`,
          })
          return
        }
        if (run.stage !== "debug") return
        if (run.state === "requested") {
          await call("start", {
            workspacePath: workspace,
            sessionId: session,
            workflowId: run.id,
            requestKey: `pipeline:${run.id}:start`,
          })
          run = (await load(workspace, session)) ?? run
          runs.set(scope, run)
        }
        if (run.stage !== "debug" || run.state !== "running") return
        const out = await call("logs", {
          workspacePath: workspace,
          sessionId: session,
          workflowId: run.id,
          debugId: run.debugId,
          requestKey: `pipeline:${run.id}:logs`,
        })
        if (out.state === "passed") {
          run = await save(run, { ...next(run), summary: "自动调试通过。" })
          if (run.stage === "backtest") {
            await call("run_backtest", {
              workspacePath: workspace,
              sessionId: session,
              workflowId: run.id,
              requestKey: `pipeline:${run.id}`,
            })
          }
          return
        }
        await save(run, {
          stage: "done",
          state: "failed",
          error: typeof out.summary === "string" ? out.summary : "自动调试未通过。",
        })
        return
      }
      if (run.stage === "backtest" && run.state === "requested") {
        await call("run_backtest", {
          workspacePath: workspace,
          sessionId: session,
          workflowId: run.id,
          requestKey: `pipeline:${run.id}`,
        })
      }
    } catch (err) {
      await write("automatic workflow idle dispatch failed", {
        sessionID: session,
        workspace,
        workflowId: run?.id,
        error: String(err),
      })
      if (run && !done(run))
        await save(run, { stage: "done", state: "failed", error: "自动工作流调度失败，请查看服务日志。" }).catch(
          () => {},
        )
    } finally {
      driving.delete(session)
    }
  }

  void write("plugin loaded", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    tool: {
      smartx_python: python({
        ...dep.runtime,
        start: (session) => workspaceFlow.taint(session, "smartx_python", flags.get(session)?.baseline ?? false),
      }),
    },
    event: async (input) => {
      /** 记录子 session，避免把主工作区门禁错误地下放给子 agent。 */
      if (input.event.type === "session.created") {
        const info = input.event.properties?.info
        if (!info?.parentID || !info.id) return
        childSessions.add(info.id)
      }
      if (input.event.type === "session.status" && input.event.properties.status.type === "idle") {
        await drive(input.event.properties.sessionID)
      }
    },
    "chat.message": async (input, output) => {
      /** 从用户文本里捕获 review/final 意图，留给 system 阶段注入提示。 */
      if (!id || !input.sessionID) return
      const text = output.parts
        .filter(
          (part): part is typeof part & { type: "text"; text: string } =>
            part.type === "text" && typeof part.text === "string",
        )
        .map((part) => part.text)
        .join("\n")

      // 解析到用户的文本
      write("chat.message", {
        sessionID: input.sessionID,
        workspace,
        worktree,
        text,
      })

      //识别是否是审查请求
      if (wantsReview(text)) {
        const request = id + "\x00" + input.sessionID
        const active =
          reviewRuns.has(request) || pending.get(request)?.kind === "review" || reviewFixes.has(request)
        if (!active) {
          reviewRequests.add(request)
          await write("workspace review requested", {
            sessionID: input.sessionID,
            workspace,
            worktree,
          })
        }
        if (active)
          await write("workspace duplicate review ignored", {
            sessionID: input.sessionID,
            workspace,
            worktree,
          })
      }

      //识别到是要求收尾的请求
      if (wantsFinal(text)) {
        finalRequests.add(id + "\x00" + input.sessionID)
        await write("workspace final requested", {
          sessionID: input.sessionID,
          workspace,
          worktree,
        })
      }
    },
    "experimental.chat.system.transform": async (input, output) => {
      /** 执行 workspace 级门禁提示。 */
      if (!input.sessionID) return
      output.system.push(pythonPolicy)
      await workspaceFlow.system(input, output, await flag(input.sessionID, true))
    },
    "tool.execute.before": async (input, output) => {
      /** 工具执行前做硬门禁和启动态标记。 */
      if (input.tool === "bash" && ambient(output.args))
        throw new Error("SmartX Python must run through smartx_python. Use code or a workspace-relative .py file.")
      await workspaceFlow.before(input, output, await flag(input.sessionID))
    },
    "tool.execute.after": async (input, output) => {
      /** 工具执行后推进 workspace 状态。 */
      await workspaceFlow.after(input, output, await flag(input.sessionID))
    },
  }
}
