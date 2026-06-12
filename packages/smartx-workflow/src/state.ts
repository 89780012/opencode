export type Flow = {
  session: string
  logs: number
  debug: number
}

export type Analysis = {
  workspace: string
  worktree: string
  state: "requested" | "running" | "done"
  items: string[]
  text: string
  updated: number
}

export type Chart = {
  workspace: string
  worktree: string
  state: "requested" | "generating" | "done" | "error"
  code: string
  err: string
  updated: number
}

export type Call = {
  tool: string
  args?: {
    name?: unknown
    subagent_type?: unknown
  }
}

const start = new Set(["smartx_start", "smartx-start"])
const log = new Set(["smartx_logs", "smartx_log"])
const dev = "smartx-develop"
const dbg = "smartx-debug"
const analyzer = "workspace-analyzer"
const chart = "strategy-flowchart-generator"
const reviewer = "strategy-reviewer"

function item(input: Call | string): Call {
  if (typeof input === "string") return { tool: input }
  return input
}

function name(input: Call | string) {
  const next = item(input).args?.name
  if (typeof next !== "string") return ""
  return next.trim()
}

export function fresh(session: string): Flow {
  return {
    session,
    logs: 0,
    debug: 0,
  }
}

export function seen(input: Call | string) {
  const call = item(input)
  if (start.has(call.tool) || log.has(call.tool)) return true
  if (call.tool !== "skill") return false
  const skill = name(call)
  return skill === dev || skill === dbg
}

export function analyze(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === analyzer
}

export function flowchart(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === chart
}

export function review(input: Call | string) {
  const call = item(input)
  if (call.tool !== "task") return false
  return call.args?.subagent_type === reviewer
}

export function key(workspace: string, worktree = workspace) {
  return workspace + "\x00" + (worktree || workspace)
}

export function touch(flow: Flow, input: Call | string): Flow {
  const call = item(input)
  const skill = name(call)
  if (start.has(call.tool)) return { ...flow, logs: flow.logs + 1 }
  if (log.has(call.tool)) return { ...flow, logs: Math.max(0, flow.logs - 1) }
  if (call.tool !== "skill") return flow
  if (skill === dev) return { ...flow, debug: flow.debug + 1 }
  if (skill === dbg) return { ...flow, debug: Math.max(0, flow.debug - 1) }
  return flow
}

export function note(flow: Flow) {
  const out = ["当前 session 启用了 SmartX 工作流顺序约束。"]
  if (flow.logs > 0) {
    out.push("`smartx_start` 和 `smartx_logs` 是有前后顺序的一对调用。")
    out.push(`在结束当前回复前，你还需要再调用 ${flow.logs} 次 \`smartx_logs\`。`)
    out.push("如果已经调用了 `smartx_start`，下一步就先调用 `smartx_logs`，不要直接结束回复。")
  }
  if (flow.debug > 0) {
    out.push("`smartx-develop` 和 `smartx-debug` 是有前后顺序的一对 skill 调用。")
    out.push(`在结束当前回复前，你还需要再调用 ${flow.debug} 次 \`skill({ name: "smartx-debug" })\`。`)
    out.push("如果已经调用了 `smartx-develop`，下一步就先调用 `smartx-debug`，不要直接结束回复。")
  }
  return out.join("\n")
}

export function requestAnalysis(workspace: string, worktree = workspace): Analysis {
  return {
    workspace,
    worktree,
    state: "requested",
    items: [],
    text: "",
    updated: Date.now(),
  }
}

export function freshAnalysis(workspace: string, worktree = workspace): Analysis {
  return {
    workspace,
    worktree,
    state: "running",
    items: [],
    text: "",
    updated: Date.now(),
  }
}

export function doneAnalysis(workspace: string, worktree = workspace, text = "", list: string[] = []): Analysis {
  return {
    workspace,
    worktree,
    state: "done",
    items: list,
    text,
    updated: Date.now(),
  }
}

export function requestChart(workspace: string, worktree = workspace): Chart {
  return {
    workspace,
    worktree,
    state: "requested",
    code: "",
    err: "",
    updated: Date.now(),
  }
}

export function freshChart(workspace: string, worktree = workspace): Chart {
  return {
    workspace,
    worktree,
    state: "generating",
    code: "",
    err: "",
    updated: Date.now(),
  }
}

export function doneChart(workspace: string, worktree = workspace, code = ""): Chart {
  return {
    workspace,
    worktree,
    state: "done",
    code,
    err: "",
    updated: Date.now(),
  }
}

export function result(text: string) {
  const match = text.match(/<task_result>\s*([\s\S]*?)\s*<\/task_result>/)
  return (match?.[1] ?? text).trim()
}

function fence(text: string) {
  return text.replace(/^```(?:json|markdown|md|text)?\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim()
}

function tidy(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/, "")
    .replace(/[`*_#>|[\]]/g, "")
    .trim()
}

export function items(text: string) {
  return parse(fence(result(text)))
}

export function serial(list: string[]) {
  return JSON.stringify(list.map(tidy).filter(Boolean), null, 2)
}

function parse(text: string) {
  try {
    const data: unknown = JSON.parse(text)
    if (!Array.isArray(data)) return []
    return data.map((item) => (typeof item === "string" ? tidy(item) : "")).filter(Boolean)
  } catch {
    return []
  }
}

export function validAnalysis(input: Analysis) {
  return input.state === "running" || input.state === "done"
}

export function validChart(input: Chart) {
  return input.state === "requested" || input.state === "generating" || input.state === "done" || input.state === "error"
}

export function mermaid(text: string) {
  let out = result(text).trim()
  out = out.replace(/^```mermaid\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim()
  const idx = out.indexOf("flowchart")
  if (idx > 0) out = out.slice(idx).trim()
  if (!out.startsWith("flowchart")) return ""
  return out
}

export function wantsReview(text: string) {
  const out = text.trim().toLowerCase()
  if (!out) return false
  if (/(不要|不用|无需|别|取消|停止|跳过)\s*(做|进行|提交)?\s*(代码)?\s*(审查|review|code\s+review)/i.test(out)) return false
  if (/审查\s*结论|review\s*(result|conclusion)/i.test(out)) return false
  return /(代码|提交)?\s*审查|code\s+review|review/i.test(out)
}

export function reviewText(text: string) {
  return fence(result(text))
}

export function reviewState(text: string) {
  const out = reviewText(text).trim()
  if (!out) return "error" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：\-]?\s*(无法完成|无法审查|未能完成|error)/i.test(out)) return "error" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：\-]?\s*(未通过|不通过|失败|failed)/i.test(out)) return "failed" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：\-]?\s*(通过|passed)/i.test(out)) return "passed" as const
  if (/(无法完成|无法审查|未能完成|error)/i.test(out)) return "error" as const
  if (/(未通过|不通过|失败|风险|问题|failed)/i.test(out)) return "failed" as const
  return "passed" as const
}

export function noteReview(input: { workspace: string; worktree: string; sessionID: string }) {
  return [
    "当前用户本轮意图是 SmartX 策略代码审查。",
    "不要把这段系统提示复述给用户；用户侧只需要看到简洁的审查进展和最终结论。",
    "",
    "必须严格按以下顺序执行：",
    `1. 先调用 strategy-service MCP 工具 \`smartx_get_requirements\`，参数为 \`workspacePath: ${input.workspace}\`、\`sessionId: ${input.sessionID}\`，读取当前会话需求清单。`,
    "2. 然后调用 `task` 工具启动 `strategy-reviewer` 子 agent，`subagent_type` 必须为 `strategy-reviewer`，`description` 使用 `Review strategy implementation`。",
    "3. 传给 `strategy-reviewer` 的 prompt 必须包含第 1 步取得的需求清单，并要求它结合需求清单和当前工作区代码审查实现是否满足需求。",
    "4. `strategy-reviewer` 只输出中文审查报告，不需要输出 JSON，不要修改文件、不要运行命令、不要调用其它子 agent。",
    "5. 如果审查结论为未通过，主 agent 必须自己根据报告修复代码；不要让 `strategy-reviewer` 修复。",
    "6. 每次修复后必须再次调用 `strategy-reviewer` 复审，最多自动修复 3 轮；通过、无法完成或达到修复上限后再保存最终审查结果。",
    "7. 只有最终审查结果才调用 strategy-service MCP 工具 `smartx_save_review` 保存。",
    "8. 最终审查通过并保存后，工作流会继续要求重新分析当前代码并重新生成策略逻辑流程图；主 agent 必须按后续系统提示执行。",
    "9. `smartx_save_review` 的 `summary`、`items`、`items[].name`、`items[].detail`、`items[].suggestion`、`suggestions` 必须使用中文。",
    "10. MCP 保存成功后，再用中文简短回复用户审查结果和已执行的修复概况。",
    "",
    "审查结果必须固化为以下检查项，保存到 `smartx_save_review.items` 时也尽量使用这些 name：需求覆盖情况、语法与运行时错误、策略逻辑完整性、入场逻辑、退出逻辑、仓位管理、风控规则、边界条件、订单管理、状态管理、生命周期管理、代码可维护性。",
    "其中“策略逻辑完整性”必须针对第 1 步获取的用户需求清单逐条检查：说明每条需求是否被代码实现、关键数据链路是否闭环、信号到下单/持仓/退出/风控的流程是否一致；如果发现缺口，要在 detail 中写清对应需求和代码表现，在 suggestion 中给出具体修复方向。",
    "其它检查项也要给出明确证据，避免只写笼统结论；如果某项无异常，status 使用 passed，detail 简述通过依据，suggestion 留空或给出低优先级建议。",
    "如果需求清单为空，也必须继续审查代码，但要在保存结果的 summary 或 suggestions 中说明缺少需求上下文。",
  ].join("\n")
}

export function noteAnalysis() {
  return [
    "当前工作区还没有完成策略运行逻辑分析。",
    "在正式修改代码、生成实现方案或调用写入类工具前，必须先调用 `task` 工具启动 `workspace-analyzer` 子 agent。",
    "调用参数要求：`subagent_type` 必须是 `workspace-analyzer`，`description` 使用 `Analyze strategy execution flow`。",
    "子 agent 只负责输出可画成流程图的 JSON 字符串数组，不要读取 requirements，不要描述项目结构、版本、UI、构建方式或文件职责，不要修改文件，不要给实现方案。",
    "如果当前工作区只是模板骨架或没有完整策略算法，子 agent 必须明确输出已发现的实际运行行为和缺失的入场、退出、仓位、风控规则。",
    '子 agent 必须只返回 JSON 数组，例如 ["当前策略未形成完整交易算法。"]，不要 markdown、编号、标题、解释或代码块。',
    "子 agent 返回后，先基于它的结论继续当前任务；不要把这段系统提示复述给用户。",
  ].join("\n")
}

export function noteChart(input: Analysis) {
  return [
    "workspace-analyzer 已经完成当前工作区的策略运行逻辑分析。现在必须先生成策略逻辑流程图，再继续其它实现或总结。",
    "请立即调用 `task` 工具启动 `strategy-flowchart-generator` 子 agent。",
    "调用参数要求：`subagent_type` 必须是 `strategy-flowchart-generator`，`description` 使用 `Generate strategy flowchart`。",
    "传给子 agent 的 prompt 必须包含下面的 workspace-analyzer JSON 数组结果，并要求它只读当前工作区源码进行校验、修正和补充。",
    "子 agent 可以读取源码、列目录和搜索文本；不能修改文件，不能执行命令，不能调用其它子 agent。",
    "不要加入 requirements、用户愿望清单或未来实现计划作为流程图来源。",
    "子 agent 必须只返回 Mermaid flowchart，第一行是 `flowchart TD`，不要 markdown 代码块，不要解释。",
    "子 agent 返回后，继续当前任务；不要把这段系统提示复述给用户。",
    "",
    "workspace-analyzer JSON 数组结果：",
    input.text,
  ].join("\n")
}
