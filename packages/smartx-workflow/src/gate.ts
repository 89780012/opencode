import type { View } from "./life.js"
import type { Kind } from "./tool.js"

/** 根据生命周期视图和动作类型，判断是否需要硬性拦截。 */
export function gate(next: View, value: Kind) {
  if (!next.mem.restored) {
    if (value === "read" || value === "project_init" || value === "project_resume" || value === "project_get" || value === "project_validate" || value === "other") return ""
    return next.mem.exists
      ? "SmartX workflow requires restoring project memory through resume_project_state before sustained work."
      : "SmartX workflow requires initializing project memory through init_project_state before sustained work."
  }
  if (next.wait?.kind === "review") return next.life === "ready" || next.life === "dirty" ? "" : ""
  if (next.wait?.kind === "debug" && value === "debug") return ""
  if (next.life === "idle") {
    if (value === "read" || value === "analyze" || value === "refresh" || value === "other") return ""
    if (value === "save") return "SmartX workflow requires creating the initial workspace baseline first."
    return "SmartX workflow requires initial workspace analysis and flowchart generation before implementation."
  }
  if (next.life === "booting") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is still building the initial workspace baseline. Finish analysis and flowchart first."
  }
  if (next.life === "ready") return ""
  if (next.life === "dirty") {
    if (value === "review") return "SmartX workflow requires refreshing workspace analysis and flowchart before review."
    return ""
  }
  if (next.life === "refreshing") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is refreshing the workspace baseline after code changes. Finish analysis and flowchart first."
  }
  if (next.life === "finalizing") {
    if (value === "read" || value === "analyze" || value === "chart" || value === "save" || value === "refresh") return ""
    return "SmartX workflow is generating the final workspace snapshot. Finish analysis and flowchart first."
  }
  return ""
}

/** 判断当前 dirty workspace 是否需要触发“自然收口提醒”。 */
export function closing(
  next: View,
  input: {
    sub: boolean
    hold: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (next.mem.stale) return false
  if (next.life !== "dirty" || next.wait) return false
  if (input.hold || input.review || input.final) return false
  return !input.fix
}

/** 判断当前是否应该先要求保存 project memory。 */
export function saving(
  next: View,
  input: {
    sub: boolean
    hold: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (!next.mem.restored || !next.mem.stale || next.wait) return false
  if (input.hold || input.review) return false
  if (input.final) return true
  if (next.life !== "dirty") return false
  return !input.fix
}
