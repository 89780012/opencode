import type { Call } from "./types.js"

export const dev = "smartx-develop"
export const dbg = "smartx-debug"

const starts = new Set(["smartx_start", "smartx-start"])
const logsx = new Set(["smartx_logs", "smartx_log"])
const analyzer = "workspace-analyzer"
const chart = "strategy-flowchart-generator"
const reviewer = "strategy-reviewer"

/** 统一把字符串调用包装成标准调用对象，减少后续分支判断。 */
function item(input: Call | string): Call {
  if (typeof input === "string") return { tool: input }
  return input
}

/** 判断当前工具名是否命中了某个 MCP 工具，兼容带前缀的注册名。 */
export function mcp(input: { tool: string }, name: string) {
  return input.tool === name || input.tool.endsWith("_" + name)
}

/** 判断是否触发了 SmartX 调试启动工具。 */
export function start(input: { tool: string }) {
  return starts.has(input.tool)
}

/** 判断是否触发了 SmartX 调试日志工具。 */
export function logs(input: { tool: string }) {
  return logsx.has(input.tool)
}

/** 从 skill 调用里提取 skill 名称；非 skill 调用返回空字符串。 */
export function skill(input: { tool: string; args?: unknown }) {
  if (input.tool !== "skill") return ""
  if (!input.args || typeof input.args !== "object") return ""
  const args = input.args as Record<string, unknown>
  return typeof args.name === "string" ? args.name : ""
}

/** 判断某次调用是否属于 session 配对约束需要追踪的关键动作。 */
export function seen(input: Call | string) {
  const call = item(input)
  if (start(call) || logs(call)) return true
  if (call.tool !== "skill") return false
  const name = skill(call)
  return name === dev || name === dbg
}

/** 判断是否启动了 workspace 分析子 agent。 */
export function analyze(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === analyzer
}

/** 判断是否启动了策略流程图子 agent。 */
export function flowchart(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === chart
}

/** 判断是否启动了策略审查子 agent。 */
export function review(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === reviewer
}

export type Kind =
  | "read"
  | "write"
  | "exec"
  | "analyze"
  | "chart"
  | "review"
  | "save"
  | "refresh"
  | "debug"
  | "project_init"
  | "project_resume"
  | "project_get"
  | "project_save"
  | "project_validate"
  | "other"

/** 把底层工具调用归类成工作流可理解的动作类型。 */
export function kind(input: { tool: string; args?: unknown }) {
  if (mcp(input, "init_project_state")) return "project_init" as const
  if (mcp(input, "resume_project_state")) return "project_resume" as const
  if (mcp(input, "get_project_state")) return "project_get" as const
  if (mcp(input, "save_project_state")) return "project_save" as const
  if (mcp(input, "validate_project_state")) return "project_validate" as const
  if (mcp(input, "refresh_workspace")) return "refresh" as const
  if (mcp(input, "save_analysis") || mcp(input, "save_flowchart")) return "save" as const
  if (start(input)) return "debug" as const
  const name = skill(input)
  if (name === dev) return "write" as const
  if (name === dbg) return "debug" as const
  if (input.tool === "task") {
    const args = input.args
    const sub = args && typeof args === "object" ? (args as Record<string, unknown>).subagent_type : undefined
    if (sub === analyzer) return "analyze" as const
    if (sub === chart) return "chart" as const
    if (sub === reviewer) return "review" as const
  }
  if (["read", "grep", "glob", "ls", "list", "codesearch", "lsp", "webfetch", "websearch"].includes(input.tool)) return "read" as const
  if (["edit", "write", "apply_patch", "multiedit"].includes(input.tool)) return "write" as const
  if (input.tool === "bash") return "exec" as const
  return "other" as const
}
