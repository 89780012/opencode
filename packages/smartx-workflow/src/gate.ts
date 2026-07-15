import type { View } from "./life.js"
import type { Kind } from "./tool.js"

/** 根据生命周期视图和动作类型，判断是否需要硬性拦截。 */
export function gate(state: View, toolKind: Kind) {
  // 如果没有恢复项目状态，则不允许进行写操作
  // 但允许项目状态相关的操作（初始化、恢复、查询等）以及只读操作
  if (!state.projectMemory.hasRestoredState) {
    if (
      toolKind === "read" ||
      toolKind === "project_init" ||
      toolKind === "project_resume" ||
      toolKind === "project_get" ||
      toolKind === "project_validate" ||
      toolKind === "other"
    ) {
      return ""
    }
    return state.projectMemory.hasProjectState
      ? "SmartX workflow requires restoring project memory through resume_project_state before sustained work."
      : "SmartX workflow requires initializing project memory through init_project_state before sustained work."
  }
  if (toolKind === "backtest") {
    if (state.life === "ready" || state.life === "dirty") return ""
    if (state.life === "refreshing") {
      return "SmartX workflow requires completing the workspace baseline refresh before running a backtest."
    }
    if (state.life === "finalizing") {
      return "SmartX workflow cannot run a backtest while generating the final workspace snapshot."
    }
    return "SmartX workflow requires completing the initial workspace baseline before running a backtest."
  }
  // idle 状态：等待基线初始化
  if (state.life === "idle") {
    // 只读操作、分析操作、刷新操作和其他操作被允许
    if (
      toolKind === "read" ||
      toolKind === "analyze" ||
      toolKind === "refresh" ||
      toolKind === "project_init" ||
      toolKind === "project_resume" ||
      toolKind === "project_get" ||
      toolKind === "project_save" ||
      toolKind === "project_validate" ||
      toolKind === "other"
    )
      return ""
    // 保存操作需要先创建基线
    if (toolKind === "save") return "SmartX workflow requires creating the initial workspace baseline first."
    // 其他写操作需要先完成工作区分析和流程图生成
    return "SmartX workflow requires initial workspace analysis and flowchart generation before implementation."
  }
  // booting 状态：正在建立初始基线
  if (state.life === "booting") {
    // 只读操作、分析操作、流程图操作、保存操作、刷新操作和项目初始化操作被允许
    if (
      toolKind === "read" ||
      toolKind === "analyze" ||
      toolKind === "chart" ||
      toolKind === "save" ||
      toolKind === "refresh" ||
      toolKind === "project_init" ||
      toolKind === "project_resume" ||
      toolKind === "project_get" ||
      toolKind === "project_save" ||
      toolKind === "project_validate"
    )
      return ""
    // 其他操作需要等待基线建立完成
    return "SmartX workflow is still building the initial workspace baseline. Finish analysis and flowchart first."
  }
  // ready 状态：基线已建立，可以正常开发
  if (state.life === "ready") return ""
  // 如果有代码变动，审查前必须先刷新工作区分析和流程图。
  // if (state.life === "dirty") {
  //   if (toolKind === "review")
  //     return "SmartX workflow requires refreshing workspace analysis and flowchart before review."
  //   return ""
  // }
  // // refreshing 状态：代码变更后正在刷新基线
  // if (state.life === "refreshing") {
  //   // 只读操作、分析操作、流程图操作、保存操作、刷新操作和项目初始化操作被允许
  //   if (
  //     toolKind === "read" ||
  //     toolKind === "analyze" ||
  //     toolKind === "chart" ||
  //     toolKind === "save" ||
  //     toolKind === "refresh" ||
  //     toolKind === "project_init" ||
  //     toolKind === "project_resume" ||
  //     toolKind === "project_get" ||
  //     toolKind === "project_save" ||
  //     toolKind === "project_validate"
  //   )
  //     return ""
  //   // 其他操作需要等待基线刷新完成
  //   return "SmartX workflow is refreshing the workspace baseline after code changes. Finish analysis and flowchart first."
  // }
  // finalizing 状态：正在生成最终快照
  if (state.life === "finalizing") {
    // 只读操作、分析操作、流程图操作、保存操作、刷新操作和项目初始化操作被允许
    if (
      toolKind === "read" ||
      toolKind === "analyze" ||
      toolKind === "chart" ||
      toolKind === "save" ||
      toolKind === "refresh" ||
      toolKind === "project_init" ||
      toolKind === "project_resume" ||
      toolKind === "project_get" ||
      toolKind === "project_save" ||
      toolKind === "project_validate"
    )
      return ""
    // 其他操作需要等待最终快照生成完成
    return "SmartX workflow is generating the final workspace snapshot. Finish analysis and flowchart first."
  }
  return ""
}

/** 判断当前 dirty workspace 是否需要触发“自然收口提醒”。 */
export function closing(
  state: View,
  input: {
    sub: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (state.projectMemory.needsSave) return false
  if (state.life !== "dirty" || state.pendingSave) return false
  if (input.review || input.final) return false
  return !input.fix
}

/** 判断当前是否应该先要求保存 project memory。 */
export function saving(
  state: View,
  input: {
    sub: boolean
    review: boolean
    final: boolean
    fix: boolean
  },
) {
  if (input.sub) return false
  if (!state.projectMemory.hasRestoredState || !state.projectMemory.needsSave || state.pendingSave) return false
  if (input.review) return false
  if (input.final) return true
  if (state.life !== "dirty") return false
  return !input.fix
}
