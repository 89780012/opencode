import type { Analysis, Chart, Dirt, Life, Memory, Mode, Pending, Project } from "./types.js"

export type View = {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  wait?: Pending
  dirt: Dirt
  mem: Memory
  mode: Mode
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
    exists: project?.exists === true,
    restored: false,
    stale: false,
  }
}

/** 把 analysis/chart/pending/memory 等状态折叠成统一生命周期视图。 */
export function view(input: {
  analysis?: Analysis
  chart?: Chart
  project?: Project
  wait?: Pending
  dirt?: Dirt
  mem?: Memory
  mode?: Mode
}) {
  const dirt = input.dirt ?? cleanDirt()
  const mem = input.mem ?? cleanMemory(input.project)
  const mode = input.mode ?? "boot"
  const busy = mode === "final" ? "finalizing" : mode === "refresh" ? "refreshing" : "booting"
  const life =
    input.wait?.kind === "analysis" || input.wait?.kind === "flowchart"
      ? busy
      : !input.analysis || input.analysis.state === "requested"
        ? mode === "final"
          ? "finalizing"
          : mode === "refresh"
            ? "refreshing"
            : "idle"
        : input.analysis.state === "running"
          ? busy
          : !input.chart || input.chart.state === "requested" || input.chart.state === "generating" || input.chart.state === "error"
            ? busy
            : dirt.state === "dirty"
              ? "dirty"
              : "ready"
  return {
    analysis: input.analysis,
    chart: input.chart,
    project: input.project,
    wait: input.wait,
    dirt,
    mem,
    mode,
    life,
  } satisfies View
}
