import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { basename } from "node:path"
import {
  key,
  wantsBacktest,
  wantsContinue,
  wantsDebug,
  wantsFinal,
  wantsReview,
  type Analysis,
  type Chart,
  type Dirt,
  type Mode,
} from "./state.js"
import {
  callRemote,
  disabled,
  loadChartRemote,
  loadProjectRemote,
  loadRemote,
  loadRunRemote,
  loadWorkflowRemote,
  resumeRunRemote,
  startRunRemote,
  updateRunRemote,
} from "./remote.js"
import { noteReviewer } from "./note.js"
import { reviewText } from "./parse.js"
import { nextStage, planned } from "./pipeline.js"
import type {
  Automation,
  Fix,
  Memory,
  Pending,
  Project,
  Run,
  RunStart,
  RunUpdate,
  SaveReview,
  StageRequest,
} from "./types.js"
import { createWorkspace } from "./workspace.js"
import { ambient, python } from "./python.js"
import { revision } from "./life.js"

const pythonPolicy =
  "In a SmartX workspace, run all Python through smartx_python. Use code for inline source or file for a .py script path; do not invoke Python, package managers, or virtual environments through Bash."

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
  stageRequests?: Map<string, StageRequest>
  reviewRuns?: Set<string>
  finalRequests?: Set<string>
  childSessions?: Set<string>
  workflowRuns?: Map<string, Run>
  parent?: (id: string) => Promise<boolean>
  service?: string
  load?: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  loadChart?: (workspace: string, worktree: string) => Promise<Chart | undefined>
  loadProject?: (workspace: string, worktree: string) => Promise<Project | undefined>
  saveReview?: (input: SaveReview) => Promise<void>
  loadRun?: (workspace: string, session: string) => Promise<Run | undefined>
  startRun?: (input: RunStart) => Promise<Run>
  updateRun?: (input: RunUpdate) => Promise<Run>
  resumeRun?: (workspace: string, session: string) => Promise<Run | undefined>
  workflow?: () => Promise<Automation>
  call?: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>
  dispatch?: (session: string, action: "review" | "fix", prompt: string, workflow?: string) => Promise<void>
  loadReview?: (session: string, workflow: string) => Promise<{ reviewId: string; reviewText: string } | undefined>
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
  const stageRequests = dep.stageRequests ?? new Map<string, StageRequest>()
  const reviewRuns = dep.reviewRuns ?? new Set<string>()
  const finalRequests = dep.finalRequests ?? new Set<string>()
  //子会话
  const childSessions = dep.childSessions ?? new Set<string>()
  // strategy-service 持久化 Workflow Run 的进程内快照缓存，不是恢复事实来源。
  const workflowRuns = dep.workflowRuns ?? new Map<string, Run>()
  const workspace = ctx.directory
  const worktree = ctx.worktree || ctx.directory
  const id = workspace ? key(workspace, worktree) : ""
  const strategy = basename(workspace) || "-"
  const service = dep.service ?? Bun.env.STRATEGY_SERVICE_URL ?? ""

  const workflowAutomations = new Map<string, Automation>()
  const driving = new Set<string>()
  const queue = (scope: string, rev: string, stage: "review" | "debug" | "backtest") => {
    const current = stageRequests.get(scope) ?? {
      review: false,
      debug: false,
      backtest: false,
      revision: `manual:${rev}`,
    }
    stageRequests.set(scope, { ...current, [stage]: true })
  }
  // 加载 baseline、自动审查、自动调试和自动回测开关：优先使用注入实现，否则读取远端。
  const loadWorkflowAutomation = dep.workflow ?? (() => loadWorkflowRemote(service))

  // 按 session 复用四个工作流自动化开关；system transform 传 fresh=true 时重新读取。
  const getWorkflowAutomation = async (session: string, fresh = false) => {
    // false 走这个
    if (!fresh && workflowAutomations.has(session)) return workflowAutomations.get(session) ?? disabled

    // true 走这个
    const automation = await loadWorkflowAutomation().catch(() => disabled)
    workflowAutomations.set(session, automation)
    return automation
  }
  const loadWorkflowRun =
    dep.loadRun ?? ((workspace: string, session: string) => loadRunRemote(service, workspace, session))
  const startWorkflowRun = dep.startRun ?? ((input: RunStart) => startRunRemote(service, input))
  const updateWorkflowRun = dep.updateRun ?? ((input: RunUpdate) => updateRunRemote(service, input))
  const resumeWorkflowRun = dep.resumeRun ?? ((workspace, session) => resumeRunRemote(service, workspace, session))
  const callStrategyTool =
    dep.call ?? ((name: string, args: Record<string, unknown>) => callRemote(service, name, args))
  const loadReview =
    dep.loadReview ??
    (async (session: string, workflow: string) => {
      const result = await ctx.client.session.messages({
        path: { id: session },
        query: { directory: workspace, limit: 200 },
      })
      const rows = result.data ?? []
      const parents = new Set(
        rows
          .filter((row) => row.info.role === "user")
          .filter((row) =>
            row.parts.some((part) => part.type === "text" && part.metadata?.smartxWorkflowId === workflow),
          )
          .map((row) => row.info.id),
      )
      const task = rows
        .flatMap((row) => {
          if (row.info.role !== "assistant" || !parents.has(row.info.parentID)) return []
          return row.parts
            .filter(
              (part) =>
                part.type === "tool" && part.tool === "task" && part.state.input.subagent_type === "strategy-reviewer",
            )
            .map((part) => ({ part, time: row.info.time.created }))
        })
        .sort((a, b) => a.time - b.time)
        .at(-1)?.part
      if (!task || task.type !== "tool" || task.state.status !== "completed") return
      const text = reviewText(task.state.output)
      if (!text) return
      return { reviewId: task.id, reviewText: text }
    })

  const dispatch =
    // 测试或宿主可以注入 dispatch；正常运行时使用下面的 OpenCode 异步消息实现。
    dep.dispatch ??
    (async (session: string, action: "review" | "fix", prompt: string, workflow?: string) => {
      // review 直接创建 reviewer 子任务；fix 则唤醒主 agent 继续修改代码或保存结果。
      const parts =
        action === "review"
          ? [
              {
                // 空文本只承担 workflow 元数据载体，不向用户显示控制指令。
                type: "text" as const,
                text: "",
                synthetic: true,
                ignored: true,
                // workflowId 把多轮 reviewer 消息稳定绑定到同一条自动 Run。
                metadata: { smartxWorkflowId: workflow, smartxWorkflowAction: action },
              },
              {
                // SubtaskPart 让 OpenCode 确定性启动 strategy-reviewer，而不是等待模型自行选择工具。
                type: "subtask" as const,
                prompt,
                description: "策略审查",
                agent: "strategy-reviewer",
              },
            ]
          : [
              {
                // 修复/保存由 smartx-helper 主 agent 执行，所以只发送一条隐藏控制文本。
                type: "text" as const,
                text: prompt,
                synthetic: true,
                // 同样携带 workflowId，前端可以隐藏控制消息但保留真实 assistant 输出。
                metadata: { smartxWorkflowId: workflow, smartxWorkflowAction: action },
              },
            ]
      // promptAsync 立即提交续跑请求，不阻塞当前 idle 事件等待整轮模型完成。
      const result = await ctx.client.session.promptAsync({
        // 把续跑消息发送回产生代码 revision 的原主会话。
        path: { id: session },
        // directory 保证续跑仍处于当前 SmartX workspace。
        query: { directory: workspace },
        // 所有自动审查和自动修复都由 smartx-helper 主 agent 承接。
        body: { agent: "smartx-helper", parts },
      })
      // 提交失败必须显式抛出，外层 drive 会把非终态 Run 收敛为 failed。
      if (result.error) throw new Error(`session ${action} dispatch failed`)
    })
  /** 统一把插件内部事件写入 opencode 日志。 */
  const write = async (message: string, extra?: Record<string, unknown>) => {
    const session = typeof extra?.sessionID === "string" && extra.sessionID ? extra.sessionID : "-"
    const flow = typeof extra?.workflowId === "string" && extra.workflowId ? extra.workflowId : ""
    const cached = session === "-" ? undefined : workflowRuns.get(id + "\x00" + session)
    const run = !flow || cached?.id === flow ? cached : undefined
    const workflow = flow || run?.id || "-"
    const stage = run?.stage ?? "-"
    const state = run?.state ?? "-"
    const prefix = `[smartx-workflow][session=${session}][strategy=${strategy}][workflow=${workflow}][stage=${stage}][state=${state}]`
    await ctx.client.app
      .log({
        body: {
          service: "smartx-workflow",
          level: "info",
          message: `${prefix} ${message}`,
          extra: {
            ...extra,
            strategy,
            sessionID: session,
            workflowId: workflow,
            workflowStage: stage,
            workflowState: state,
          },
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
    stageRequests,
    reviewRuns,
    finalRequests,
    childSessions,
    workflowRuns,
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
        await callStrategyTool("save_review", { ...input })
      }),
    loadRun: loadWorkflowRun,
    startRun: startWorkflowRun,
    updateRun: updateWorkflowRun,
    resumeRun: resumeWorkflowRun,
    write,
  })

  /** 将 Run 状态写入 strategy-service，并同步更新当前插件进程的会话缓存。 */
  const saveWorkflowRun = async (run: Run, input: Omit<RunUpdate, "id" | "workspacePath" | "sessionId">) => {
    // id/workspace/session 使用已有 Run 的可信身份，调用方只能提供阶段变化。
    const row = await updateWorkflowRun({
      id: run.id,
      workspacePath: run.workspacePath,
      sessionId: run.sessionId,
      ...input,
    })
    // 缓存键同时包含 workspace/worktree 和 session，避免不同会话串用 Run。
    workflowRuns.set(id + "\x00" + run.sessionId, row)
    // 返回服务端最新 revision，后续判断不得继续使用旧 Run。
    return row
  }
  /** 判断 Workflow Run 是否已经终止；终态不得再启动任何阶段。 */
  const workflowStopped = (run: Run) =>
    run.stage === "done" ||
    run.state === "failed" ||
    run.state === "review_exhausted" ||
    run.state === "cancelled" ||
    run.state === "paused"
  /** 所有自动阶段启动前共用的工作区就绪判断。 */
  const readyForWorkflow = (automation: Automation) => {
    // 项目记忆尚未保存时不能启动自动阶段，否则运行结果与交接状态可能不一致。
    if (memory.get(id)?.needsSave) return false
    // baseline 关闭时不要求 analysis/flowchart，只保留 project memory 门槛。
    if (!automation.baseline) return true
    // baseline 开启时必须同时满足：代码不脏、analysis done、flowchart done。
    return (
      dirtyStates.get(id)?.state !== "dirty" && workspaces.get(id)?.state === "done" && charts.get(id)?.state === "done"
    )
  }

  /** 推进审查阶段；只处理 reviewer、报告交接和修复复审。 */
  const driveReview = async (run: Run, session: string, scope: string, automation: Automation) => {
    const current =
      run.state === "dispatching" && Date.now() - run.updatedAt >= 30_000
        ? await saveWorkflowRun(run, { stage: "review", state: "requested" })
        : run
    // 30 秒内认为另一个 promptAsync 仍可能在途，避免重复启动 reviewer。
    if (current.state === "dispatching") return
    if (current.state === "requested") {
      // 先持久化 dispatching，再提交 reviewer，防止重复 idle 产生两个副作用。
      const claimed = await saveWorkflowRun(current, { stage: "review", state: "dispatching" })
      const req = await callStrategyTool("get_requirements", { workspacePath: workspace, sessionId: session })
      await dispatch(session, "review", noteReviewer(req.requirements ?? []), claimed.id)
      await write("automatic review dispatched after idle", {
        sessionID: session,
        workspace,
        workflowId: claimed.id,
        reviewRound: claimed.reviewRound + 1,
      })
      return
    }
    if (current.state === "running") {
      const saved = pending.get(scope)
      const restored =
        saved?.kind === "review" ? undefined : await loadReview(session, current.id).catch(() => undefined)
      if (restored) {
        pending.set(scope, {
          kind: "review",
          reviewId: restored.reviewId,
          sessionId: session,
          workspacePath: workspace,
          worktreePath: worktree,
          reviewText: restored.reviewText,
        })
        await write("workspace review handoff restored from session", {
          sessionID: session,
          workspace,
          workflowId: current.id,
          reviewId: restored.reviewId,
        })
      }
      if (pending.get(scope)?.kind === "review") {
        await dispatch(
          session,
          "fix",
          "继续处理已经返回的审查报告，并调用 smartx_save_review 保存审查结果。",
          current.id,
        )
        return
      }
      await saveWorkflowRun(current, {
        stage: "review",
        state: "failed",
        error: "自动审查已经结束，但结构化结果未能保存。",
      })
      return
    }
    // passed 会由编排器进入下一阶段；其他终态在进入阶段驱动器前已经停止。
    if (current.state !== "fixing") return
    const fix =
      reviewFixes.get(scope) ??
      recover(
        await callStrategyTool("get_review", { workspacePath: workspace, worktreePath: worktree, sessionId: session }),
        current,
        workspace,
        worktree,
      )
    if (!fix) {
      await saveWorkflowRun(current, { stage: "review", state: "failed", error: "自动审查修复上下文已丢失。" })
      return
    }
    reviewFixes.set(scope, fix)
    if (fix.changed && readyForWorkflow(automation)) {
      await saveWorkflowRun(current, { stage: "review", state: "dispatching", reviewRound: current.reviewRound })
      const req = await callStrategyTool("get_requirements", { workspacePath: workspace, sessionId: session })
      await dispatch(session, "review", noteReviewer(req.requirements ?? []), current.id)
      return
    }
    const resumes = fix.resumes ?? 0
    if (resumes >= 2) {
      await saveWorkflowRun(current, {
        stage: "review",
        state: "failed",
        reviewRound: current.reviewRound,
        error: fix.changed ? "自动修复后的收口步骤连续两次没有完成。" : "自动修复连续两次未产生代码变更。",
      })
      return
    }
    reviewFixes.set(scope, { ...fix, resumes: resumes + 1 })
    await dispatch(session, "fix", "继续执行当前未完成的自动修复步骤。", current.id)
  }

  /** 推进调试阶段；只负责 start、logs 和调试结论。 */
  const driveDebug = async (run: Run, session: string, scope: string) => {
    let current = run
    if (current.state === "requested") {
      await callStrategyTool("start", {
        workspacePath: workspace,
        sessionId: session,
        workflowId: current.id,
        requestKey: `pipeline:${current.id}:start`,
      })
      current = (await loadWorkflowRun(workspace, session)) ?? current
      workflowRuns.set(scope, current)
    }
    if (current.stage !== "debug" || current.state !== "running") return current
    const out = await callStrategyTool("logs", {
      workspacePath: workspace,
      sessionId: session,
      workflowId: current.id,
      debugId: current.debugId,
      requestKey: `pipeline:${current.id}:logs`,
    })
    if (out.state === "passed") {
      current = await saveWorkflowRun(current, { stage: "debug", state: "passed", summary: "策略启动烟测通过。" })
      return saveWorkflowRun(current, nextStage(current))
    }
    return saveWorkflowRun(current, {
      stage: "debug",
      state: "failed",
      error: typeof out.summary === "string" ? out.summary : "自动调试未通过。",
    })
  }

  /** 推进回测阶段；只负责提交带稳定幂等键的回测任务。 */
  const driveBacktest = async (run: Run, session: string) => {
    if (run.state !== "requested") return
    const out = await callStrategyTool("run_backtest", {
      workspacePath: workspace,
      sessionId: session,
      workflowId: run.id,
      requestKey: `pipeline:${run.id}`,
    })
    if (out.accepted !== true) throw new Error(`backtest was not accepted: ${String(out.reason ?? "unknown")}`)
  }

  /**
   * 主会话 idle 后的自动流水线驱动器。
   * 公共层只负责恢复、创建、就绪门槛和阶段分发；阶段细节由三个独立驱动器处理。
   * 每次 idle 都从 strategy-service 恢复 Run，因此模型 stop 或插件重启后仍可续跑。
   */
  const driveWorkflow = async (session: string) => {
    // [自动工作流] idle 事件进入编排器，从持久化状态决定本轮下一步。
    // 没有 workspace 不能建立作用域；同一 session 已在驱动时忽略重复 idle 事件。
    if (!id || driving.has(session)) return
    // single-flight 标记必须在任何异步读取之前写入，防止并发启动两个 reviewer。
    driving.add(session)
    // 保存当前 Run，catch 中需要用它记录真实失败阶段。
    let run: Run | undefined
    try {
      // 子 agent 会话不能拥有自动 Run；parent() 用于覆盖插件重启后内存集合丢失的情况。
      if (childSessions.has(session) || (await workspaceFlow.child(session))) return
      // 当前设置只用于创建下一条 Run；已有 Run 始终使用自身固化的阶段开关。
      const automation = await getWorkflowAutomation(session, true)
      const scope = id + "\x00" + session
      const manual = stageRequests.get(scope)
      const hasEnabledStage =
        automation.review || automation.debug || automation.backtest || !!manual?.review || !!manual?.debug || !!manual?.backtest
      // 先加载持久化 Run；即使当前设置全关，已有非终态 Run 也必须按创建时的计划续跑。
      // strategy-service 是恢复事实来源；workflowRuns 只缓存当前插件进程使用的 Run 快照。
      run = await loadWorkflowRun(workspace, session).catch(() => undefined)
      if (run && !workflowStopped(run) && manual && planned(run, manual)) stageRequests.delete(scope)
      // scope 把工作区和 session 组合成 pending/fix/run 的统一键。
      // dirt 记录最近活动、源码 revision 和 revision 所属主会话。
      const dirt = dirtyStates.get(id)
      // 只有 edit/write/apply_patch/multiedit 产生的 revision 才能触发自动工作流。
      const code = dirt ? revision(dirt) : 0
      const ref = manual && run?.codeRevision === String(code) ? manual.revision : code ? String(code) : manual?.revision
      const fresh = !!code && ref !== manual?.revision
      // owner 防止另一个主会话的 idle 接管本会话产生的源码 revision。
      const own = dirt?.owner
      const hold = run?.state === "paused" || run?.state === "cancelled"
      // 没有活动 Run，或上一条 Run 已终止时，尝试为新的源码 revision 创建 Run。
      if (
        // 活动 Run 必须继续复用；只有缺失或终态 Run 才允许创建下一条。
        (!run || (workflowStopped(run) && (!hold || !!manual))) &&
        // 三个阶段全关时不为新 revision 创建 Run。
        hasEnabledStage &&
        // 自动 Run 需要源码 revision；人工阶段请求可以使用稳定的 manual revision。
        !!ref &&
        (!!manual || dirt?.state === "dirty") &&
        // revision 必须明确属于当前 session。
        (!code || own === session) &&
        // 相同 revision 已有终态 Run 时不重复创建。
        run?.codeRevision !== ref
      ) {
        // start 在服务端按 workspace/session/revision 幂等创建流水线 Run。
        run = await startWorkflowRun({
          workspacePath: workspace,
          sessionId: session,
          codeRevision: ref,
          // 创建时固化三个阶段开关，保证 Run 中途切换设置不会改变既定链路。
          review: fresh ? automation.review || manual?.review === true : manual?.review === true,
          debug: fresh ? automation.debug || manual?.debug === true : manual?.debug === true,
          backtest: fresh ? automation.backtest || manual?.backtest === true : manual?.backtest === true,
        })
        stageRequests.delete(scope)
      }
      // 没有旧 Run，也没有符合条件的新源码 revision，本次 idle 无事可做。
      if (!run) return
      // 后续 system/before/after hook 复用这份最新 Run。
      workflowRuns.set(scope, run)
      // passed done、failed、review_exhausted、cancelled、paused 都禁止自动续跑。
      if (workflowStopped(run)) return
      // 所有自动阶段开始前都等待 project memory、analysis 和 flowchart 就绪。
      // 基线或项目记忆没就绪时，先唤醒主 agent 完成当前工作流门槛。
      if (!readyForWorkflow(automation)) {
        await dispatch(session, "fix", "继续执行当前未完成的自动工作流步骤。", run.id)
        return
      }
      // 工作区已经 ready，本轮 final 请求不再阻挡自动阶段。
      finalRequests.delete(scope)
      // passed 阶段只由公共编排器选择下一项，阶段驱动器互相不知道对方。
      if ((run.stage === "review" || run.stage === "debug") && run.state === "passed") {
        run = await saveWorkflowRun(run, nextStage(run))
        if (workflowStopped(run)) return
      }
      if (run.stage === "review") {
        await driveReview(run, session, scope, automation)
        return
      }
      if (run.stage === "debug") {
        run = await driveDebug(run, session, scope)
        if (run.stage !== "backtest" || workflowStopped(run)) return
      }
      if (run.stage === "backtest") await driveBacktest(run, session)
    } catch (err) {
      await write("automatic workflow idle dispatch failed", {
        sessionID: session,
        workspace,
        workflowId: run?.id,
        error: String(err),
      })
      if (run && !workflowStopped(run))
        await saveWorkflowRun(run, {
          stage: run.stage,
          state: "failed",
          error: "自动工作流调度失败，请查看服务日志。",
        }).catch(() => {})
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
        start: (session) =>
          workspaceFlow.taint(session, "smartx_python", workflowAutomations.get(session)?.baseline ?? false),
      }),
    },
    event: async (input) => {
      /** 记录子 session，避免把主工作区门禁错误地下放给子 agent。 */
      if (input.event.type === "session.created") {
        const info = input.event.properties?.info
        if (!info?.parentID || !info.id) return
        childSessions.add(info.id)
      }

      // [自动审查 03/15] 主会话进入 idle；这是自动审查不依赖模型主动继续的触发入口。
      // 每次主会话进入 idle 都调用 drive；这是自动审查不依赖模型主动继续的真正触发入口。
      if (input.event.type === "session.status" && input.event.properties.status.type === "idle") {
        // drive 内部会排除子会话、刷新开关、创建/恢复 Run，并按持久化状态续跑。
        await driveWorkflow(input.event.properties.sessionID)
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
      const rev = input.messageID ?? crypto.randomUUID()

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
        const active = reviewRuns.has(request) || pending.get(request)?.kind === "review" || reviewFixes.has(request)
        if (!active) {
          reviewRequests.add(request)
          queue(request, rev, "review")
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

      const request = id + "\x00" + input.sessionID
      if (wantsDebug(text)) {
        queue(request, rev, "debug")
        await write("workspace debug requested", { sessionID: input.sessionID, workspace, worktree })
      }
      if (wantsBacktest(text)) {
        queue(request, rev, "backtest")
        await write("workspace backtest requested", { sessionID: input.sessionID, workspace, worktree })
      }
      if (wantsContinue(text)) {
        const run = await loadWorkflowRun(workspace, input.sessionID).catch(() => undefined)
        if (run?.state === "paused" || run?.state === "cancelled") {
          const resumed = await resumeWorkflowRun(workspace, input.sessionID)
          if (resumed) {
            workflowRuns.set(request, resumed)
            if (resumed.stage === "review" && resumed.state === "requested") {
              reviewRuns.delete(request)
              if (pending.get(request)?.kind === "review") pending.delete(request)
              reviewRequests.add(request)
            }
          }
          await write("workspace workflow resumed", {
            sessionID: input.sessionID,
            workspace,
            worktree,
            workflowId: resumed?.id ?? run.id,
          })
        }
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
      /** 注入 workspace 级流程提示。 */
      if (!input.sessionID) return
      output.system.push(pythonPolicy)
      await workspaceFlow.system(input, output, await getWorkflowAutomation(input.sessionID, true))
    },
    "tool.execute.before": async (input, output) => {
      /** 工具执行前绑定可信上下文并记录阶段启动状态。 */
      if (input.tool === "bash" && ambient(output.args))
        throw new Error("SmartX Python must run through smartx_python. Use code or a .py file path.")
      await workspaceFlow.before(input, output, await getWorkflowAutomation(input.sessionID))
    },
    "tool.execute.after": async (input, output) => {
      /** 工具执行后推进 workspace 状态。 */
      await workspaceFlow.after(input, output, await getWorkflowAutomation(input.sessionID))
    },
  }
}
