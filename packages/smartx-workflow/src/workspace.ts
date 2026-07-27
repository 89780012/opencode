import type { Hooks } from "@opencode-ai/plugin"
import { gate as block, closing, saving } from "./gate.js"
import { cleanDirt, cleanMemory, revision, view as stateView } from "./life.js"
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
  noteBacktest,
  noteChart,
  noteClose,
  noteDisabled,
  noteDebug,
  noteFinal,
  noteFix,
  noteRefresh,
  noteReview,
  noteResumeProject,
  noteSave,
  noteSaveProject,
  limit,
} from "./note.js"
import { items, mermaid, reviewText, serial } from "./parse.js"
import { nextStage } from "./pipeline.js"
import { analyze, backtest, baseline, debug, flowchart, kind, mcp, python, review } from "./tool.js"
import type {
  Analysis,
  Automation,
  Chart,
  Dirt,
  Fix,
  Memory,
  Mode,
  Pending,
  Project,
  Run,
  RunStart,
  RunUpdate,
  SaveReview,
} from "./types.js"
import { flow, step } from "./workflow.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type Before = NonNullable<Hooks["tool.execute.before"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Reason = "manual" | "review" | "gate"

// createWorkspace() 工作流编排器需要的全部状态和外部依赖。
type Opt = {
  // key: Opt.id，即 `${workspace}\0${worktree}`
  // value: 当前工作区的代码分析状态和分析结果。
  // 在 snapshot()、system()、analysis 启动/完成回调中使用。
  workspaces: Map<string, Analysis>
  // key: Opt.id
  // value: 当前工作区策略流程图的生成状态、Mermaid 内容和错误。
  // analysis 完成后会重置；flowchart 子 Agent 开始和结束时更新。
  charts: Map<string, Chart>
  // key: Opt.id
  // value: 项目记忆的持久化元信息，例如 .project-state 是否存在。
  // 注意它不保存项目记忆正文，只保存“项目记忆是否存在”这类事实。
  projects: Map<string, Project>
  // 混合使用两种 key：
  // analysis/flowchart 使用 Opt.id；
  // review 使用 `${Opt.id}\0${sessionID}`。
  // value: 已经生成，但还等待主 Agent 调用 MCP 保存的中间产物。
  // Pending 不是 Promise，而是“待保存交接物”。
  pending: Map<string, Pending>
  // key: Opt.id
  // value: 工作区是否被修改，以及最近代码版本、所有者会话和修改原因。
  // 成功执行 edit/write/apply_patch/multiedit 后会被标记为 dirty。
  dirtyStates: Map<string, Dirt>
  // key: Opt.id
  // value: 当前插件进程中的项目记忆生命周期状态。
  // 记录是否恢复过项目记忆、是否有新进展需要重新保存。
  // 它不保存聊天上下文或项目记忆正文。
  memory: Map<string, Memory>
  // key: Opt.id
  // value: 当前 baseline 运行模式。
  // boot = 首次建立基线；refresh = 代码变更后刷新；final = 最终收口刷新。
  baselineModes: Map<string, Mode>
  // key: `${Opt.id}\0${sessionID}`
  // value: 审查未通过后交给主 Agent 的修复上下文。
  // 保存审查报告、当前轮次、是否产生代码修改、已自动续接次数。
  reviewFixes: Map<string, Fix>
  // value: `${Opt.id}\0${sessionID}`
  // 表示某会话已经请求审查，但 reviewer 还没有真正启动。
  // 来源包括用户明确要求审查，以及自动 workflow 进入 review/requested。
  reviewRequests: Set<string>
  // value: `${Opt.id}\0${sessionID}`
  // 表示 strategy-reviewer 当前正在运行。
  // 用作进程内并发锁，防止同一会话同时启动多个 reviewer。
  reviewRuns: Set<string>
  // value: `${Opt.id}\0${sessionID}`
  // 表示当前会话要求最终收口。
  // 用户明确要求结束，或审查通过后，都可能加入这个集合。
  finalRequests: Set<string>
  // value: OpenCode session ID
  // 缓存已确认是子 Agent 的会话。
  // 子会话不能创建主 workflow，也不能执行主会话的调试、回测等能力。
  childSessions: Set<string>
  // key: `${Opt.id}\0${sessionID}`
  // value: 当前代码版本对应的自动工作流 Run。
  // 这是 strategy-service 持久化 Workflow Run 的进程内快照缓存，不是恢复事实来源。
  workflowRuns: Map<string, Run>
  // 输入一个 OpenCode session ID，返回它是否拥有 parentID。
  // 用于识别插件重启前创建、尚未写入 childSessions 的历史子会话。
  parent: (id: string) => Promise<boolean>
  // 当前逻辑工作区根目录，例如 F:/repo。
  // 用于 API 作用域校验、workflow 创建和日志字段。
  workspace: string
  // 当前实际 Git 工作树目录。
  // 普通场景通常等于 workspace；Git worktree 场景可能不同。
  worktree: string

  // 当前工作区作用域的稳定组合键。
  // 来自 key(workspace, worktree)，格式为 `${workspace}\0${worktree}`。
  // 它不是 session ID，也不是 Run.id。
  id: string
  // 从 strategy-service 加载持久化的 workspace analysis。
  // snapshot() 在内存缓存不存在时调用。
  load: (workspace: string, worktree: string) => Promise<Analysis | undefined>
  // 从 strategy-service 加载持久化的 Mermaid 流程图。
  // 通常只在 analysis 已完成后调用。
  loadChart: (workspace: string, worktree: string) => Promise<Chart | undefined>
  // 从 strategy-service 查询 .project-state 是否存在。
  // 用于判断应该 init_project_state 还是 resume_project_state。
  loadProject: (workspace: string, worktree: string) => Promise<Project | undefined>
  // 将审查状态保存到 strategy-service。
  // reviewer 真正启动前，用它预写 state=running 的审查记录。
  saveReview: (input: SaveReview) => Promise<void>
  // 按 workspace + session 从 strategy-service 加载最新 workflow Run。
  // 状态转换前会重新加载，用于恢复和避免并发覆盖终态。
  loadRun: (workspace: string, session: string) => Promise<Run | undefined>
  // 为新的代码版本创建持久化 workflow。
  // 输入包含代码版本以及 review/debug/backtest 开关快照。
  startRun: (input: RunStart) => Promise<Run>
  // 持久化 workflow 的阶段和状态变化。
  // 例如 requested → running、running → fixing、review → debug。
  updateRun: (input: RunUpdate) => Promise<Run>
  // 向 OpenCode 应用日志写入 smartx-workflow 诊断信息。
  // 这里只写日志，不修改工作区文件。
  write: Log
}

/** 统一判断工具执行结果是否失败，也兼容没有 `isError` 字段的返回值。*/
function ok(output: unknown) {
  if (!output || typeof output !== "object") return true
  if (!("isError" in output)) return true
  return output.isError !== true
}

function data(output: unknown) {
  if (!output || typeof output !== "object" || !("output" in output) || typeof output.output !== "string") return {}
  try {
    const value = JSON.parse(output.output) as unknown
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
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

/** 按 service 契约聚合终态检查项；空、非法和 running 检查项都返回无效。 */
function aggregate(input: unknown) {
  if (!Array.isArray(input) || !input.length) return "" as const
  const list = input.map((item) => {
    if (!item || typeof item !== "object") return ""
    const row = item as Record<string, unknown>
    if (typeof row.name !== "string" || !row.name.trim()) return ""
    if (typeof row.detail !== "string" || !row.detail.trim()) return ""
    const status = row.status
    return typeof status === "string" ? status.trim() : ""
  })
  if (list.some((status) => !["passed", "warning", "failed", "error"].includes(status))) return "" as const
  if (list.includes("error")) return "error" as const
  if (list.some((status) => status === "failed" || status === "warning")) return "failed" as const
  return "passed" as const
}

/** 判断 `save_review` 提交的所有检查项是否都已通过。*/
function reviewPassed(input: unknown) {
  if (!input || typeof input !== "object") return false
  const args = input as Record<string, unknown>
  return args.state === "passed" && aggregate(args.items) === "passed"
}

/** 生成 workspace + session 维度的修复记录 key。*/
function fixKey(id: string, session: string) {
  return id + "\x00" + session
}

/** 生成 workspace + session 维度的请求 key。*/
function requestKey(id: string, session: string) {
  return id + "\x00" + session
}

function stopped(run: Run) {
  return run.stage === "done" || run.state === "failed" || run.state === "review_exhausted" || run.state === "cancelled"
}

async function change(opt: Opt, run: Run, input: Omit<RunUpdate, "id" | "workspacePath" | "sessionId">) {
  const loaded = await opt.loadRun(run.workspacePath, run.sessionId).catch(() => undefined)
  const current = loaded?.id === run.id ? loaded : run
  if (loaded?.id === run.id) opt.workflowRuns.set(requestKey(opt.id, run.sessionId), loaded)
  if (stopped(current)) {
    if (current.stage !== input.stage || current.state !== input.state)
      await opt.write("workflow transition skipped after concurrent terminal update", {
        sessionID: run.sessionId,
        workflowId: run.id,
        currentStage: current.stage,
        currentState: current.state,
        targetStage: input.stage,
        targetState: input.state,
      })
    return current
  }
  const row = await opt.updateRun({
    id: current.id,
    workspacePath: current.workspacePath,
    sessionId: current.sessionId,
    ...input,
    ...(input.reviewRound ? { reviewRound: Math.max(input.reviewRound, current.reviewRound) } : {}),
  })
  opt.workflowRuns.set(requestKey(opt.id, current.sessionId), row)
  return row
}

/** 当前会话优先读取自己的审查 pending，基线 pending 仍保持 workspace 级。 */
function current(opt: Opt, session?: string) {
  const item = session ? opt.pending.get(requestKey(opt.id, session)) : undefined
  if (item?.kind === "review") return item
  return opt.pending.get(opt.id)
}

/** 对只能在主会话运行的本地能力做恢复会话兼容校验。 */
async function sub(opt: Opt, session: string, name: string, tool = "") {
  const child =
    opt.childSessions.has(session) ||
    (await opt.parent(session).catch(async (err) => {
      await opt.write(`${name} session verification failed`, {
        sessionID: session,
        tool,
        error: String(err),
      })
      throw new Error("SmartX workflow could not verify the main session.")
    }))
  if (child) opt.childSessions.add(session)
  return child
}

async function main(opt: Opt, input: Parameters<Before>[0], name: "backtest" | "debug" | "python") {
  const child = await sub(opt, input.sessionID, name, input.tool)
  if (!child) return
  await opt.write(`child session ${name} blocked`, {
    sessionID: input.sessionID,
    workspace: opt.workspace,
    worktree: opt.worktree,
    tool: input.tool,
  })
  if (name === "python") throw new Error("SmartX Python is only available in the main session.")
  if (name === "debug") throw new Error("SmartX debugging tools are only available in the main session.")
  throw new Error("SmartX backtest tools are only available in the main session.")
}

/**
 * 校验 analysis 缓存
    ↓
  缺失时加载持久化 analysis
      ↓
  analysis=done 才加载 chart
      ↓
  独立加载 project-state 元信息
      ↓
  返回经过校验的当前工作区快照
 */
/**
 *
 * 读取当前 workspace 的完整快照。
 *
 * 快照包含：
 * 1. analysis：工作区代码分析结果
 * 2. chart：基于 analysis 生成的 Mermaid 流程图
 * 3. project：.project-state 是否存在等项目记忆元信息
 *
 * 读取策略：
 * - 优先使用进程内 Map 缓存
 * - 缓存不存在时调用 strategy-service
 * - 读取到无效数据时删除缓存
 * - 远程读取失败时降级为 undefined，不阻断主流程
 */
async function snapshot(opt: Opt) {
  // 使用当前 workspace + worktree 组合键，从 analysis 内存缓存中读取数据。
  // opt.id 的格式通常是 `${workspace}\x00${worktree}`。
  const cached = opt.workspaces.get(opt.id)
  const mode = opt.baselineModes.get(opt.id)
  // refresh/final 中的 requested 是本轮明确的重建指令，必须优先于远端旧快照。
  // boot 中的 requested 仍是临时占位，允许从 strategy-service 恢复已有基线。
  const keep = cached?.state === "requested" && (mode === "refresh" || mode === "final")
  // 如果存在 analysis 缓存，但其结构或状态已经不能用于当前工作流，
  // 就将它从内存缓存中删除，避免后续继续使用无效数据。
  //
  // validAnalysis() 当前只接受：
  // - running
  // - done
  //
  // boot requested 会被视为临时调度状态；refresh/final requested 必须保留。
  if (cached && !keep && !validAnalysis(cached)) opt.workspaces.delete(opt.id)

  // 再次读取 analysis 缓存。
  //
  // 如果上面删除了无效缓存，这里会得到 undefined；
  // 如果缓存仍然有效，就直接使用缓存，不请求 strategy-service。
  //
  // 只有缓存为 null 或 undefined 时，才执行 opt.load()。
  // opt.load() 会从 strategy-service 加载持久化 analysis。
  //
  // 远程请求失败时通过 catch 转成 undefined，
  // 避免 analysis 服务暂时异常导致整个对话流程失败。
  const loadedAnalysis =
    opt.workspaces.get(opt.id) ?? (await opt.load(opt.workspace, opt.worktree).catch(() => undefined))

  // 如果拿到了有效 analysis，或需要保留本轮 refresh/final requested，
  // 就写入内存缓存，供本次和后续工作流步骤复用。
  if (loadedAnalysis && (keep || validAnalysis(loadedAnalysis))) {
    opt.workspaces.set(opt.id, loadedAnalysis)
  }

  // 如果远程或普通缓存返回了 analysis，但它没有通过校验，
  // 就确保缓存中不再保留这份数据。
  //
  // 这一分支主要防止远程服务返回旧格式、非法状态或不完整数据。
  if (loadedAnalysis && !keep && !validAnalysis(loadedAnalysis)) {
    opt.workspaces.delete(opt.id)
  }

  // 从已经完成校验和同步的缓存中读取最终 analysis。
  // 后续是否允许加载 chart，取决于这里的 analysis 是否为 done。
  const analysis = opt.workspaces.get(opt.id)

  // 只有 analysis 已经完成，才允许读取 flowchart。
  //
  // 这是因为 chart 是 analysis 的下游产物：
  // analysis 没完成时加载历史 chart，可能把旧流程图误认为当前结果。
  const loadedChart =
    analysis?.state === "done"
      ? // 优先读取内存中的 chart。
        (opt.charts.get(opt.id) ??
        // 缓存不存在时，从 strategy-service 加载持久化 chart。
        // 请求失败时降级为 undefined。
        (await opt.loadChart(opt.workspace, opt.worktree).catch(() => undefined)))
      : undefined

  // 如果成功读取 chart，并且结构和状态有效，
  // 就将它写入内存缓存。
  if (loadedChart && validChart(loadedChart)) {
    opt.charts.set(opt.id, loadedChart)
  }

  // 如果读取到了 chart，但校验没有通过，
  // 删除缓存，防止系统使用损坏或不支持的流程图状态。
  if (loadedChart && !validChart(loadedChart)) {
    opt.charts.delete(opt.id)
  }

  // 读取项目记忆元信息。
  //
  // project 与 analysis/chart 不同，它不依赖 analysis 是否完成，
  // 所以这里始终可以独立加载。
  //
  // 优先读取 projects 缓存；缓存不存在时调用 loadProject()，
  // 查询 .project-state 是否存在等信息。
  const project =
    opt.projects.get(opt.id) ?? (await opt.loadProject(opt.workspace, opt.worktree).catch(() => undefined))

  // 如果 project 数据有效，就写入内存缓存。
  if (project && validProject(project)) {
    opt.projects.set(opt.id, project)
  }

  // 如果 project 数据存在但无效，就删除对应缓存。
  if (project && !validProject(project)) {
    opt.projects.delete(opt.id)
  }

  return {
    analysis,
    chart: opt.charts.get(opt.id),
    project: opt.projects.get(opt.id),
  }
}

/** 标记当前 workspace 已被写脏，后续 review / final 需要刷新基线。*/
function mark(opt: Opt, session: string, reason: string, code: boolean) {
  // [自动审查 02/15] 将成功源码写入折叠为 dirty、codeRevision 和 owner session。
  // 读取旧 dirty 信息，非源码活动需要保留原 revision 和 owner。
  const current = opt.dirtyStates.get(opt.id)
  // 时间戳至少比上一条大 1，保证同一毫秒内连续写入仍能形成单调源码 revision。
  const updated = Math.max(Date.now(), (current?.updated ?? 0) + 1)
  // dirtyStates 同时记录工作区活动和“可触发自动审查”的源码版本。
  opt.dirtyStates.set(opt.id, {
    // 任意成功写入或执行都会把工作区标成 dirty。
    state: "dirty",
    // updated 表示最近活动时间，不等同于源码 revision。
    updated,
    // 只有明确源码写入才推进 revision；运行命令沿用旧 revision。
    revision: code ? updated : current ? revision(current) : 0,
    // 新源码 revision 绑定产生它的主会话；普通运行不得接管 owner。
    owner: code ? session : current?.owner,
    // reason 保存触发 dirty 的工具名，兼容旧 revision 推断。
    reason,
  })
}

/** 记录已经开始且可能产生副作用的执行，确保失败路径也会刷新基线和项目记忆。 */
async function dirty(opt: Opt, session: string, tool: string, enabled = true, code = false) {
  // review 修复缓存和自动 Run 都使用 workspace + session 作用域键。
  const id = fixKey(opt.id, session)
  // fix 存在表示当前主 agent 正在处理一份未通过审查报告。
  const fix = opt.reviewFixes.get(id)
  // Run 用于判断这次写入是否属于当前 review/fixing 链。
  const run = opt.workflowRuns.get(id)
  // fixing 内的源码写入属于原 Run 的修复，不应创建新的 code revision。
  const repair = !!fix && run?.stage === "review" && run.state === "fixing"
  // 非修复源码写入推进 revision；修复写入只更新活动时间并沿用原 revision。
  mark(opt, session, tool, code && !repair)
  // 明确源码写入证明主 agent 已实施修复，并把无进展续跑计数归零。
  if (fix && code) opt.reviewFixes.set(id, { ...fix, changed: true, resumes: 0 })
  // 读取当前 project memory；缓存缺失时根据持久化 project 元信息建立默认值。
  const memory = opt.memory.get(opt.id) ?? cleanMemory(opt.projects.get(opt.id))
  // 工作区发生推进后，已恢复的项目记忆必须在收口前重新保存。
  opt.memory.set(opt.id, {
    hasProjectState: memory.hasProjectState,
    hasRestoredState: memory.hasRestoredState,
    // 尚未恢复的记忆不能直接保存；已恢复时才标记 needsSave。
    needsSave: memory.hasRestoredState,
  })
  // baseline 关闭期间的旧 pending 不能继续使用，重置为重新启用后的 refresh 起点。
  if (!enabled) reset(opt, "refresh")
  // 记录 dirty 原因，便于排查某条 revision 为什么触发或没有触发自动审查。
  await opt.write("workspace dirtied", {
    sessionID: session,
    workspace: opt.workspace,
    worktree: opt.worktree,
    tool,
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
    /** idle 驱动复用主会话校验，恢复后的子 session 也不得推进自动流程。 */
    child: (session: string) => sub(opt, session, "pipeline"),
    /** Python 进程启动后立即保守标脏，不依赖可能缺席的 after hook。 */
    taint: (session: string, tool: string, enabled = true) => void dirty(opt, session, tool, enabled).catch(() => {}),
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
    system: async (input: Parameters<System>[0], output: Parameters<System>[1], cfg: Automation) => {
      if (!opt.workspace || !opt.id) return false

      // TODO 是否可以去掉smartx-helper 内容，在这控制工作流基线呢？
      const enabled = cfg.baseline
      if (!enabled) output.system.push(noteDisabled())

      // 获取到当前快照
      const snap = await snapshot(opt)
      const sessionID = input.sessionID

      // 当前的状态管理
      const state = stateView({
        analysis: snap.analysis,
        chart: snap.chart,
        project: snap.project,
        pendingSave: current(opt, sessionID),
        dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
        projectMemory: opt.memory.get(opt.id) ?? cleanMemory(snap.project),
        baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
        baseline: enabled,
      })

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
          const pendingSave = state.pendingSave
          if (!pendingSave) return false
          if (!enabled && pendingSave.kind !== "review") return false
          // analysis / flowchart / review 已经产出，但还没同步进策略服务时，先强制保存。
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
          const requestID = requestKey(opt.id, sessionID)
          if (opt.reviewRequests.has(requestID)) return false
          if (enabled && state.life === "dirty" && fix.changed && fix.attempt < limit) {
            opt.reviewRequests.add(requestID)
            reset(opt, "refresh")
            await opt.write("workspace review fix refresh injected", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
              attempt: fix.attempt,
            })
            output.system.push(noteRefresh("策略复审"))
            return true
          }
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
        step("pipeline", async () => {
          // 没有主会话 ID，或 review/debug/backtest 全关时，不创建和推进自动 Run。
          if (!sessionID || (!cfg.review && !cfg.debug && !cfg.backtest)) return false
          // 子会话不能拥有工作区级自动流水线；parent 查询覆盖插件重启后的恢复场景。
          if (await sub(opt, sessionID, "pipeline")) return false
          // 自动 Run、review pending 和 review request 共用 workspace + worktree + session 键。
          const id = requestKey(opt.id, sessionID)
          // 每次 transform 先从 strategy-service 恢复 Run，远端状态优先于进程内缓存。
          const loaded = await opt.loadRun(opt.workspace, sessionID).catch(() => undefined)
          // 恢复成功后同步内存，tool before/after 可以复用同一份 Run。
          if (loaded) opt.workflowRuns.set(id, loaded)
          // dirty 保存触发 revision 的工作区状态。
          const dirty = opt.dirtyStates.get(opt.id) ?? cleanDirt()
          // code 为 0 表示只有运行活动，没有明确源码写入，不能触发自动审查。
          const code = revision(dirty)
          // owner 是产生源码 revision 的主会话，防止跨 session 接管。
          const own = dirty.owner
          // 优先复用当前 session 已缓存或刚从远端恢复的 Run。
          let run = opt.workflowRuns.get(id)
          // 只有 Run 缺失或已终止时，才可能为新 revision 创建下一条 Run。
          if (!run || stopped(run)) {
            // 下列任一条件成立都说明当前 transform 还不能创建新自动 Run。
            if (
              // 工作区不脏，没有需要审查的新变化。
              dirty.state !== "dirty" ||
              // 没有源码 revision，说明只是 Bash/Python 等运行活动。
              !code ||
              // revision 属于另一个主会话，当前 session 不得接管。
              (own && own !== sessionID) ||
              // 相同 revision 已经有过 Run，避免重复创建。
              run?.codeRevision === String(code) ||
              // 项目记忆必须先保存，保证审查前的交接状态一致。
              state.projectMemory.needsSave ||
              // analysis/flowchart/review 有待保存结果时，必须先完成保存。
              state.pendingSave
            )
              return false
            // 服务端按 workspace/session/codeRevision 幂等创建 Run，并固化三个阶段开关。
            run = await opt.startRun({
              workspacePath: opt.workspace,
              sessionId: sessionID,
              codeRevision: String(code),
              review: cfg.review,
              debug: cfg.debug,
              backtest: cfg.backtest,
            })
            // 缓存服务端返回的最新 Run，供本轮后续步骤读取。
            opt.workflowRuns.set(id, run)
          }
          // failed/review_exhausted/cancelled/done 都不得继续推进。
          if (stopped(run)) return false
          // final 请求只有在 baseline ready 后才能消费，避免绕过最终快照。
          if (opt.finalRequests.has(id)) {
            if (enabled && state.life !== "ready") return false
            opt.finalRequests.delete(id)
          }
          // review/debug 已通过时，根据 Run 创建时固化的开关选择下一阶段。
          if (run.stage === "review" && run.state === "passed") run = await change(opt, run, nextStage(run))
          if (run.stage === "debug" && run.state === "passed") run = await change(opt, run, nextStage(run))
          // review 阶段由 reviewRequests/system 提示和 idle drive 共同驱动。
          if (run.stage === "review") {
            // requested 首轮或 fixing 修复轮都需要保留 review 请求，直到 reviewer 真正启动。
            if (run.state === "requested" || run.state === "fixing") opt.reviewRequests.add(id)
            // 返回 false 允许同一次 system flow 继续进入下面的 review 步骤。
            return false
          }
          if (run.stage === "debug") {
            output.system.push(noteDebug(run.state === "running" ? "running" : "requested"))
            return true
          }
          if (run.stage === "backtest" && run.state === "requested") {
            output.system.push(noteBacktest())
            return true
          }
          return false
        }),
        /** 5. 用户明确要求 review 时，优先进入审查流程。*/
        step("review", async () => {
          // 手工请求和自动 Run 都会写入 reviewRequests，因此共用同一套基线门槛。
          if (!sessionID) return false
          // requestID 将 review 请求限制在当前 workspace/worktree/session。
          const requestID = requestKey(opt.id, sessionID)
          // 没有显式请求或 pipeline 写入的自动请求时，本步骤不注入 reviewer 提示。
          if (!opt.reviewRequests.has(requestID)) return false
          // baseline 开启且代码仍 dirty 时，必须先重新分析并生成流程图。
          if (enabled && state.life === "dirty") {
            // refresh 会把 analysis/chart 重置到 requested，但保留 reviewRequests。
            reset(opt, "refresh")
            await opt.write("workspace review refresh injected", {
              sessionID,
              workspace: opt.workspace,
              worktree: opt.worktree,
            })
            output.system.push(noteRefresh("代码审查"))
            return true
          }
          // refresh/boot/final 尚未 ready 时保持请求，等待后续 transform 再判断。
          if (enabled && state.life !== "ready") return false
          // 基线就绪后记录审查门槛命中。
          await opt.write("workspace review gate injected", {
            sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          // 该提示用于主 agent 上下文；自动 Run 即使模型 stop，也会由 idle drive 直接 dispatch reviewer。
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
          if (enabled && state.life === "dirty") {
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
          if (!enabled || state.life === "ready") opt.finalRequests.delete(requestID)
          return false
        }),
        /** 7. 工作区自然收尾时，提醒先完成 project memory 保存。*/
        step("close", async () => {
          if (!enabled) return false
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
          if (!enabled) return false
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
    before: async (input: Parameters<Before>[0], output: Parameters<Before>[1], cfg: Automation) => {
      if (!opt.workspace || !opt.id) return false
      const enabled = cfg.baseline
      if (python(input)) await main(opt, input, "python")
      if (debug(input)) {
        const run = opt.workflowRuns.get(requestKey(opt.id, input.sessionID))
        if (run?.stage === "debug" && !stopped(run)) {
          await main(opt, input, "debug")
          const args =
            output.args && typeof output.args === "object" && !Array.isArray(output.args)
              ? (output.args as Record<string, unknown>)
              : {}
          output.args = args
          args.workspacePath = opt.workspace
          args.sessionId = input.sessionID
          args.workflowId = run.id
          args.requestKey = `pipeline:${run.id}:${mcp(input, "start") ? "start" : "logs"}`
          delete args.name
          if (mcp(input, "logs")) args.debugId = run.debugId
        }
      }
      if (backtest(input)) {
        await main(opt, input, "backtest")
        const args =
          output.args && typeof output.args === "object" && !Array.isArray(output.args)
            ? (output.args as Record<string, unknown>)
            : {}
        output.args = args
        args.workspacePath = opt.workspace
        args.sessionId = input.sessionID
        delete args.pluginId
        delete args.requestKey
        delete args.workflowId
        if (mcp(input, "run_backtest")) {
          const run = opt.workflowRuns.get(requestKey(opt.id, input.sessionID))
          args.requestKey = run?.stage === "backtest" ? `pipeline:${run.id}` : "ai:" + input.callID
          if (run?.stage === "backtest") args.workflowId = run.id
        }
      }
      if (!enabled && baseline({ tool: input.tool, args: output.args }))
        throw new Error("SmartX workspace analysis and flowchart generation are disabled by system configuration.")
      if (mcp(input, "save_review")) {
        const item = opt.pending.get(requestKey(opt.id, input.sessionID))
        if (item?.kind !== "review") throw new Error("SmartX workflow has no pending review for this session.")
        const args =
          output.args && typeof output.args === "object" && !Array.isArray(output.args)
            ? (output.args as Record<string, unknown>)
            : {}
        const state = aggregate(args.items)
        if (!state)
          throw new Error(
            "SmartX workflow requires non-empty terminal review items with valid statuses, names, and details.",
          )
        if (typeof args.summary !== "string" || !args.summary.trim())
          throw new Error("SmartX workflow requires a non-empty terminal review summary.")
        output.args = args
        args.reviewId = item.reviewId
        args.sessionId = item.sessionId
        args.workspacePath = opt.workspace
        args.worktreePath = opt.worktree
        args.state = state
      }
      // 去掉门禁
      // if (!opt.childSessions.has(input.sessionID)) {
      //   // 1. 先读取当前工作区快照，拿到 analysis / chart / project 的最新状态。
      //   const snap = await snapshot(opt)
      //   // 2. 再把分散状态折叠成统一生命周期视图，方便后面做一次性判断。
      //   const state = stateView({
      //     analysis: snap.analysis,
      //     chart: snap.chart,
      //     project: snap.project,
      //     pendingSave: current(opt, input.sessionID),
      //     dirtyState: opt.dirtyStates.get(opt.id) ?? cleanDirt(),
      //     projectMemory: opt.memory.get(opt.id) ?? cleanMemory(snap.project),
      //     baselineMode: opt.baselineModes.get(opt.id) ?? "boot",
      //   })
      //   // 3. 把当前即将执行的工具归类成工作流动作类型。
      //   const action = kind({ tool: input.tool, args: output.args })
      //   // 4. 根据“当前状态 + 即将执行的动作”计算门禁结果；有返回文案就说明必须拦截。
      //   const blockText = block(state, action)
      //   if (blockText) {
      //     // 还没建立 initial baseline，却已经想执行实现类动作时，先把状态重置回 boot 起点。
      //     if (state.life === "idle") reset(opt, "boot")
      //     await opt.write("workspace hard gate blocked tool", {
      //       sessionID: input.sessionID,
      //       workspace: opt.workspace,
      //       worktree: opt.worktree,
      //       tool: input.tool,
      //       pending: state.pendingSave?.kind,
      //       analysis: state.analysis?.state ?? "missing",
      //       chart: state.chart?.state ?? "missing",
      //       life: state.life,
      //       kind: action,
      //     })
      //     throw new Error(blockText)
      //   }
      // }
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
          // before hook 只检查即将执行的 task，普通 task 或手工其他 agent 不进入自动审查状态机。
          if (!review({ tool: input.tool, args: output.args })) return false
          // 当前 reviewer 的唯一作用域键。
          const id = requestKey(opt.id, input.sessionID)
          // reviewRuns 是 single-flight 标记，防止同一 session 并发启动两个 reviewer。
          if (opt.reviewRuns.has(id)) throw new Error("SmartX workflow already has an active review for this session.")
          // 上一份中文报告还没经过 smartx_save_review 保存，禁止覆盖 pending。
          if (opt.pending.get(id)?.kind === "review")
            throw new Error("SmartX workflow requires saving the pending review before starting another review.")
          // 优先使用内存 Run；插件重启或上下文丢失时从 strategy-service 恢复。
          const loaded =
            opt.workflowRuns.get(id) ?? (await opt.loadRun(opt.workspace, input.sessionID).catch(() => undefined))
          // 恢复成功后供 after hook 和 idle drive 继续使用。
          if (loaded) opt.workflowRuns.set(id, loaded)
          // loaded 可能为空，手工审查仍可继续；只有绑定自动 Run 时才推进 reviewRound。
          const run = loaded
          // 自动 Run 的 reviewer 启动前必须检查轮次和当前阶段。
          if (run?.stage === "review" && !stopped(run)) {
            // limit=3，执行前拒绝第 4 轮，而不是事后再修正状态。
            if (run.reviewRound >= limit) throw new Error("SmartX workflow review limit reached for this run.")
            // 当前轮次加一，并限制在最大轮次内。
            const round = Math.min(run.reviewRound + 1, limit)
            // [自动审查 11/15] reviewer 真正执行前进入 running，并把 reviewRound 加一。
            // 持久化 running，表示 reviewer 已由主会话真正接手。
            await change(opt, run, { stage: "review", state: "running", reviewRound: round })
          }
          // 先占用内存 single-flight 标记，saveReview 失败时下面会回滚。
          opt.reviewRuns.add(id)
          // 预写 running review，让前端和重启恢复能看到 reviewer 已开始。
          await opt
            .saveReview({
              // callID 是 reviewer tool part 的稳定 reviewId。
              reviewId: input.callID,
              // sessionId 绑定审查报告归属的主会话。
              sessionId: input.sessionID,
              // workspace/worktree 绑定审查作用域，拒绝跨工作区保存。
              workspacePath: opt.workspace,
              worktreePath: opt.worktree,
              // running 不是终态，后续必须等待 reviewer 报告和主 agent 的 save_review。
              state: "running",
              summary: "审查已开始，当前由审查智能体接手处理。",
              items: [
                {
                  name: "审查进行中",
                  status: "running",
                  detail: "审查智能体正在逐项检查策略实现。",
                  suggestion: "",
                },
              ],
              suggestions: [],
            })
            .catch((err) => {
              // 远端预写失败时释放 single-flight，否则后续永远会误判为 active。
              opt.reviewRuns.delete(id)
              // 将真实保存错误交给外层 idle 调度处理。
              throw err
            })
          // requested 已经变成 running，移除等待启动的请求标记。
          opt.reviewRequests.delete(id)
          // 记录 reviewer 已真正开始，而不是只记录 promptAsync 已提交。
          await opt.write("workspace review started", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
          })
          // 让主 agent 继续等待 reviewer 的 tool after 结果。
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
    after: async (input: Parameters<After>[0], output: Parameters<After>[1], cfg: Automation) => {
      if (!opt.workspace || !opt.id) return false

      const enabled = cfg.baseline

      return flow([
        step("debug", async () => {
          if (!debug(input)) return false
          const id = requestKey(opt.id, input.sessionID)
          const run = opt.workflowRuns.get(id)
          if (!run || run.stage !== "debug") return false
          const body = data(output)
          if (!ok(output)) {
            await change(opt, run, {
              stage: "debug",
              state: "failed",
              error: typeof body.error === "string" ? body.error : "自动调试工具执行失败",
            })
            return true
          }
          if (mcp(input, "start")) {
            await change(opt, run, {
              stage: "debug",
              state: "running",
              debugId: typeof body.debugId === "string" ? body.debugId : input.callID,
              summary: "策略已启动，等待增量日志检查。",
            })
            return true
          }
          if (body.state === "passed") {
            await change(opt, run, { ...nextStage(run), summary: "自动调试通过。" })
            return true
          }
          await change(opt, run, {
            stage: "debug",
            state: "failed",
            error: typeof body.summary === "string" ? body.summary : "自动调试未通过",
          })
          return true
        }),
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
          // [自动审查 01/15] 工具成功返回后确认这次动作是否属于源码写入。
          // 只要主会话里真正发生了写入或执行，就把 workspace 标成 dirty。
          // !ok(output)：工具失败不产生成功 revision。
          if (opt.childSessions.has(input.sessionID) || !ok(output)) return false
          const value = kind({ tool: input.tool, args: input.args })
          if (value !== "write" && value !== "exec") return false
          // Python 已在进程启动回调中保守标记，避免成功后重复写日志和更新时间。
          if (python(input)) return false
          await dirty(opt, input.sessionID, input.tool, enabled, value === "write")
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
          // [自动审查 14/15] 主 agent 调用 smartx_save_review 后，从这里校验并消费结构化结果。
          // save_review 是主 agent 将普通中文报告转换成结构化结果后的唯一终态入口。
          if (
            // 只接管 SmartX 的 save_review 调用。
            !mcp(input, "save_review") ||
            // workspace/worktree 参数必须与当前插件作用域一致。
            !sameWorkspace(input.args, opt.workspace, opt.worktree, opt.write) ||
            // 只有 MCP 工具实际成功，才能推进 Run。
            !ok(output)
          )
            return false
          // 读取当前 session 的 review pending。
          const id = requestKey(opt.id, input.sessionID)
          const item = opt.pending.get(id)
          // 没有 pending 或 pending 类型不是 review 时拒绝保存，防止串用分析/流程图结果。
          if (item?.kind !== "review") return false
          // 将工具参数转成普通对象，后续做 reviewId/session/state 校验。
          const args = input.args && typeof input.args === "object" ? (input.args as Record<string, unknown>) : {}
          // reviewId 和 sessionId 必须与 reviewer 返回的 pending 完全匹配。
          if (args.reviewId !== item.reviewId || args.sessionId !== item.sessionId) return false
          // aggregate 根据 items 计算 error/failed/warning/passed 的终态优先级。
          const state = aggregate(args.items)
          // 主 agent 声明的 state 必须等于服务端聚合结果，避免伪造 passed。
          if (!state || args.state !== state) return false
          // 保存成功前不删除 pending；校验通过后才允许进入下一状态。
          opt.pending.delete(id)
          // done 只在所有 item 都 passed 时成立。
          const done = reviewPassed(args)
          // 通过或结构化 error 都不再保留旧的修复上下文。
          if (done || state === "error") opt.reviewFixes.delete(fixKey(opt.id, input.sessionID))
          // 优先读取本地 Run，再读取远端最新 Run，避免上下文压缩后使用旧轮次。
          const cached = opt.workflowRuns.get(id)
          const loaded = await opt.loadRun(opt.workspace, input.sessionID).catch(() => undefined)
          // 只有同一 Run ID 的远端快照才能覆盖缓存；不同 Run 保留本地作用域状态。
          const run = loaded && (!cached || loaded.id === cached.id) ? loaded : cached
          // 保存最新 Run，供当前 after 和后续 idle 使用。
          if (run) opt.workflowRuns.set(id, run)
          // 读取当前修复上下文，计算本轮审查次数。
          const fix = opt.reviewFixes.get(fixKey(opt.id, input.sessionID))
          // stopped Run 不再参与 reviewRound 或修复推进。
          const active = run && !stopped(run) ? run : undefined
          // 轮次取远端 Run 和本地 fix 的较大值，并限制到最多三轮。
          const attempt = Math.min(
            active ? Math.max(fix?.attempt ?? 0, active.reviewRound) : (fix?.attempt ?? 0) + 1,
            limit,
          )
          // failed 表示至少一个检查项未通过，需要主 agent 修复。
          if (state === "failed") {
            // 第三轮失败不再保留修复上下文。
            if (attempt >= limit) opt.reviewFixes.delete(fixKey(opt.id, input.sessionID))
            // 第一、二轮失败才建立下一次 fixing 上下文。
            if (attempt < limit) {
              opt.reviewFixes.set(fixKey(opt.id, input.sessionID), {
                workspacePath: opt.workspace,
                worktreePath: opt.worktree,
                sessionID: input.sessionID,
                attempt,
                reviewText: item.reviewText,
              })
              // 记录失败轮次，idle drive 会据此唤醒主 agent 修复。
              await opt.write("workspace review needs fix", {
                sessionID: input.sessionID,
                workspace: opt.workspace,
                worktree: opt.worktree,
                attempt,
              })
            }
          }
          // 通过后要求 final snapshot；baseline 开启时立即重置到 final 模式。
          if (done) {
            opt.finalRequests.add(id)
            if (enabled) reset(opt, "final")
          }
          // 自动 Run 已加载且仍处于 review 阶段时，推进服务端状态机。
          if (active?.stage === "review") {
            // [自动审查 15/15] 根据保存结果进入 passed、fixing、review_exhausted 或 failed。
            // 通过后选择 debug/backtest/done 的下一启用阶段。
            if (done)
              await change(opt, active, {
                ...nextStage(active),
                reviewRound: attempt,
                summary: String(args.summary),
              })
            // 未通过但仍有剩余轮次，进入 fixing 等待主 agent 修改代码。
            if (!done && state === "failed" && attempt < limit)
              await change(opt, active, {
                stage: "review",
                state: "fixing",
                reviewRound: attempt,
                summary: String(args.summary),
              })
            // 第三轮仍未通过，终止在 review_exhausted，不得进入 debug/backtest。
            if (!done && state === "failed" && attempt >= limit)
              await change(opt, active, {
                stage: "review",
                state: "review_exhausted",
                reviewRound: limit,
                error: String(args.summary),
              })
            // 结构化保存错误是失败终态，不把它误当成普通审查未通过。
            if (state === "error")
              await change(opt, active, {
                stage: "review",
                state: "failed",
                reviewRound: attempt,
                error: String(args.summary),
              })
          }
          // 记录结构化结果已经成功落库，前端可安全展示结论。
          await opt.write("workspace review saved through mcp", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
            reviewId: item.reviewId,
            state,
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
          // [自动审查 12/15] strategy-reviewer 工具返回后，从这里接收普通中文报告。
          // reviewer 只返回普通中文报告；主 agent 后续必须调用 smartx_save_review。
          if (!review(input)) return false
          // 当前 reviewer tool part 的作用域键。
          const id = requestKey(opt.id, input.sessionID)
          // 空报告也要建立 pending，后续由主 agent 按 error 结果保存，不能假装通过。
          const text = reviewText(output?.output ?? "") || "审查智能体未返回审查报告。"
          // reviewer 已经返回，释放“正在运行”标记。
          opt.reviewRuns.delete(id)
          // review 请求已被消费，下一轮请求由 save_review/fixing 状态重新产生。
          opt.reviewRequests.delete(id)
          // [自动审查 13/15] 把报告、reviewId、session 和 workspace 写入 pending，等待主 agent 保存。
          opt.pending.set(id, {
            kind: "review",
            reviewId: input.callID,
            sessionId: input.sessionID,
            workspacePath: opt.workspace,
            worktreePath: opt.worktree,
            reviewText: text,
          })
          // 记录 reviewer 输出已返回，但不代表审查结论已经保存或通过。
          await opt.write("workspace review completed", {
            sessionID: input.sessionID,
            workspace: opt.workspace,
            worktree: opt.worktree,
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
