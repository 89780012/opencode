import type { Analysis, Chart, Dirt, Life, Memory, Mode, Pending, Project } from "./types.js"

export type View = {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  pendingSave?: Pending
  dirtyState: Dirt
  projectMemory: Memory
  baselineMode: Mode
  baseline: boolean
  life: Life
}

/** 生成默认的“干净工作区”元信息。*/
export function cleanDirt(): Dirt {
  return {
    state: "clean",
    updated: 0,
    reason: "",
  }
}

/** 根据 project 是否存在，生成默认的 project memory 视图。*/
export function cleanMemory(project?: Project): Memory {
  return {
    hasProjectState: project?.hasProjectState === true,
    hasRestoredState: false,
    needsSave: false,
  }
}

/** 把 baseline 模式翻译成对应的忙碌态。*/
function phase(mode: Mode) {
  if (mode === "final") return "finalizing" as const
  if (mode === "refresh") return "refreshing" as const
  return "booting" as const
}

/** 把 baseline 模式翻译成对应的空档态。*/
function open(mode: Mode) {
  if (mode === "final") return "finalizing" as const
  if (mode === "refresh") return "refreshing" as const
  return "idle" as const
}

/** analysis 还没准备好时，说明基线仍停在起点。*/
function needAnalysis(input?: Analysis) {
  return !input || input.state === "requested"
}

/** chart 还没准备好时，说明基线还不能算完整。*/
function needChart(input?: Chart) {
  if (!input) return true
  return input.state === "requested" || input.state === "generating" || input.state === "error"
}

/** 把 analysis/chart/pending/memory 折叠成统一的生命周期视图。*/
export function view(input: {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  pendingSave?: Pending
  dirtyState?: Dirt
  projectMemory?: Memory
  baselineMode?: Mode
  baseline?: boolean
}) {
  const dirtyState = input.dirtyState ?? cleanDirt()
  const projectMemory = input.projectMemory ?? cleanMemory(input.project)
  const baselineMode = input.baselineMode ?? "boot"
  const baseline = input.baseline !== false
  const busy = phase(baselineMode)
  let life: Life

  // 关闭工作区基线时只忽略基线进度，dirty 仍驱动 project memory 保存。
  if (!baseline) {
    life = dirtyState.state === "dirty" ? "dirty" : "ready"
  } else if (input.pendingSave?.kind === "analysis" || input.pendingSave?.kind === "flowchart") {
    life = busy
  } else if (needAnalysis(input.analysis)) {
    // 2. analysis 还没开始或仍在 requested，说明还停在基线起点。
    life = open(baselineMode)
  } else if (input.analysis?.state === "running") {
    // 3. analysis 正在执行，继续保留对应的忙碌态。
    life = busy
  } else if (needChart(input.chart)) {
    // 4. analysis 已完成但 flowchart 还没准备好，基线仍未收口。
    life = busy
  } else if (dirtyState.state === "dirty") {
    // 5. 基线已齐备，但工作区已经被后续操作改脏。
    life = "dirty"
  } else {
    // 6. 其余情况都视为可继续开发的就绪态。
    life = "ready"
  }

  return {
    analysis: input.analysis,
    chart: input.chart,
    project: input.project,
    pendingSave: input.pendingSave,
    dirtyState,
    projectMemory,
    baselineMode,
    baseline,
    life,
  } satisfies View
}
