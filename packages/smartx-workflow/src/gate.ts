import type { View } from "./life.js"
import type { Kind } from "./tool.js"

/** 根据生命周期视图和动作类型，判断是否需要硬性拦截。 */
export function gate(state: View, toolKind: Kind) {
  if (!state.projectMemory.hasRestoredState) {
    if (
      toolKind === "read" ||
      toolKind === "project_init" ||
      toolKind === "project_resume" ||
      toolKind === "project_get" ||
      toolKind === "project_validate" ||
      toolKind === "other"
    )
      return ""
    return state.projectMemory.hasProjectState
      ? "SmartX workflow requires restoring project memory through resume_project_state before sustained work."
      : "SmartX workflow requires initializing project memory through init_project_state before sustained work."
  }
  if (state.pendingSave?.kind === "review") return state.life === "ready" || state.life === "dirty" ? "" : ""
  if (state.pendingSave?.kind === "debug" && toolKind === "debug") return ""
  if (state.life === "idle") {
    if (toolKind === "read" || toolKind === "analyze" || toolKind === "refresh" || toolKind === "other") return ""
    if (toolKind === "save") return "SmartX workflow requires creating the initial workspace baseline first."
    return "SmartX workflow requires initial workspace analysis and flowchart generation before implementation."
  }
  if (state.life === "booting") {
    if (toolKind === "read" || toolKind === "analyze" || toolKind === "chart" || toolKind === "save" || toolKind === "refresh") return ""
    return "SmartX workflow is still building the initial workspace baseline. Finish analysis and flowchart first."
  }
  if (state.life === "ready") return ""
  if (state.life === "dirty") {
    if (toolKind === "review") return "SmartX workflow requires refreshing workspace analysis and flowchart before review."
    return ""
  }
  if (state.life === "refreshing") {
    if (toolKind === "read" || toolKind === "analyze" || toolKind === "chart" || toolKind === "save" || toolKind === "refresh") return ""
    return "SmartX workflow is refreshing the workspace baseline after code changes. Finish analysis and flowchart first."
  }
  if (state.life === "finalizing") {
    if (toolKind === "read" || toolKind === "analyze" || toolKind === "chart" || toolKind === "save" || toolKind === "refresh") return ""
    return "SmartX workflow is generating the final workspace snapshot. Finish analysis and flowchart first."
  }
  return ""
}

/** 判断当前 dirty workspace 是否需要触发“自然收口提醒”。 */
export function closing(
  state: View,
  input: {
    sub: boolean
    hold: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (state.projectMemory.needsSave) return false
  if (state.life !== "dirty" || state.pendingSave) return false
  if (input.hold || input.review || input.final) return false
  return !input.fix
}

/** 判断当前是否应该先要求保存 project memory。 */
export function saving(
  state: View,
  input: {
    sub: boolean
    hold: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (!state.projectMemory.hasRestoredState || !state.projectMemory.needsSave || state.pendingSave) return false
  if (input.hold || input.review) return false
  if (input.final) return true
  if (state.life !== "dirty") return false
  return !input.fix
}
