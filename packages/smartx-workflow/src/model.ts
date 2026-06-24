import { dbg, dev, logs, skill, start } from "./tool.js"
import type { Analysis, Call, Chart, Flow, Project } from "./types.js"

/** 统一把字符串调用包装成标准调用对象，方便复用识别逻辑。 */
function item(input: Call | string): Call {
  if (typeof input === "string") return { tool: input }
  return input
}

/** 创建一个新的 session 配对状态。 */
export function fresh(session: string): Flow {
  return {
    session,
    pendingLogCount: 0,
    pendingDebugCount: 0,
  }
}

/** 生成 workspace + worktree 维度的稳定 key。 */
export function key(workspace: string, worktree = workspace) {
  return workspace + "\x00" + (worktree || workspace)
}

/** 根据一次关键调用推进 session 配对状态。 */
export function touch(flow: Flow, input: Call | string): Flow {
  const call = item(input)
  const name = skill(call)
  if (start(call)) return { ...flow, pendingLogCount: flow.pendingLogCount + 1 }
  if (logs(call)) return { ...flow, pendingLogCount: Math.max(0, flow.pendingLogCount - 1) }
  if (call.tool !== "skill") return flow
  if (name === dev) return { ...flow, pendingDebugCount: flow.pendingDebugCount + 1 }
  if (name === dbg) return { ...flow, pendingDebugCount: Math.max(0, flow.pendingDebugCount - 1) }
  return flow
}

/** 标记“等待分析开始”的 analysis 状态。 */
export function requestAnalysis(workspace: string, worktree = workspace): Analysis {
  return {
    workspace,
    worktree,
    state: "requested",
    summaryItems: [],
    summaryText: "",
    updated: Date.now(),
  }
}

/** 标记“分析正在执行中”的 analysis 状态。 */
export function freshAnalysis(workspace: string, worktree = workspace): Analysis {
  return {
    workspace,
    worktree,
    state: "running",
    summaryItems: [],
    summaryText: "",
    updated: Date.now(),
  }
}

/** 标记“分析已完成”的 analysis 状态。 */
export function doneAnalysis(workspace: string, worktree = workspace, summaryText = "", summaryItems: string[] = []): Analysis {
  return {
    workspace,
    worktree,
    state: "done",
    summaryItems,
    summaryText,
    updated: Date.now(),
  }
}

/** 标记“等待流程图生成”的 chart 状态。 */
export function requestChart(workspace: string, worktree = workspace): Chart {
  return {
    workspace,
    worktree,
    state: "requested",
    mermaidCode: "",
    errorText: "",
    updated: Date.now(),
  }
}

/** 标记“流程图生成中”的 chart 状态。 */
export function freshChart(workspace: string, worktree = workspace): Chart {
  return {
    workspace,
    worktree,
    state: "generating",
    mermaidCode: "",
    errorText: "",
    updated: Date.now(),
  }
}

/** 标记“流程图已完成”的 chart 状态。 */
export function doneChart(workspace: string, worktree = workspace, mermaidCode = ""): Chart {
  return {
    workspace,
    worktree,
    state: "done",
    mermaidCode,
    errorText: "",
    updated: Date.now(),
  }
}

/** 只接受可继续参与工作流判断的 analysis 状态。 */
export function validAnalysis(input: Analysis) {
  return input.state === "running" || input.state === "done"
}

/** 只接受可继续参与工作流判断的 chart 状态。 */
export function validChart(input: Chart) {
  return input.state === "requested" || input.state === "generating" || input.state === "done" || input.state === "error"
}

/** 校验 project memory 元信息是否具备最小结构。 */
export function validProject(input: Project) {
  return typeof input.hasProjectState === "boolean"
}
