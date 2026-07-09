import type { Analysis, Chart, Project } from "./types.js"

/** 生成 workspace + worktree 维度的稳定 key。 */
export function key(workspace: string, worktree = workspace) {
  return workspace + "\x00" + (worktree || workspace)
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
