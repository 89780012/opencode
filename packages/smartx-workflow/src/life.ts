import type { Analysis, Chart, Dirt, Life, Memory, Mode, Pending, Project } from "./types.js"

export type View = {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  pendingSave?: Pending
  dirtyState: Dirt
  projectMemory: Memory
  baselineMode: Mode
  life: Life
}

/** 生成默认的“干净工作区”元信息。 */
export function cleanDirt(): Dirt {
  return {
    state: "clean",
    updated: 0,
    reason: "",
  }
}

/** 根据 project 是否存在，生成默认的 project memory 视图。 */
export function cleanMemory(project?: Project): Memory {
  return {
    hasProjectState: project?.hasProjectState === true,
    hasRestoredState: false,
    needsSave: false,
  }
}

/** 把 analysis/chart/pending/memory 等状态折叠成统一生命周期视图。 */
export function view(input: {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  pendingSave?: Pending
  dirtyState?: Dirt
  projectMemory?: Memory
  baselineMode?: Mode
}) {
  const dirtyState = input.dirtyState ?? cleanDirt()
  const projectMemory = input.projectMemory ?? cleanMemory(input.project)
  const baselineMode = input.baselineMode ?? "boot"
  const busy = baselineMode === "final" ? "finalizing" : baselineMode === "refresh" ? "refreshing" : "booting"
  const life =
    input.pendingSave?.kind === "analysis" || input.pendingSave?.kind === "flowchart"
      ? busy
      : !input.analysis || input.analysis.state === "requested"
        ? baselineMode === "final"
          ? "finalizing"
          : baselineMode === "refresh"
            ? "refreshing"
            : "idle"
        : input.analysis.state === "running"
          ? busy
          : !input.chart || input.chart.state === "requested" || input.chart.state === "generating" || input.chart.state === "error"
            ? busy
            : dirtyState.state === "dirty"
              ? "dirty"
              : "ready"
  return {
    analysis: input.analysis,
    chart: input.chart,
    project: input.project,
    pendingSave: input.pendingSave,
    dirtyState,
    projectMemory,
    baselineMode,
    life,
  } satisfies View
}
