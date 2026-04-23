export type Flow = {
  session: string
  logs: number
  debug: number
}

export type Call = {
  tool: string
  args?: {
    name?: unknown
  }
}

const start = new Set(["smartx_start", "smartx-start"])
const log = new Set(["smartx_logs", "smartx_log"])
const dev = "smartx-develop"
const dbg = "smartx-debug"

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
    out.push(`在结束当前回复前，你还需要再调用 ${flow.debug} 次 \`skill({ name: \"smartx-debug\" })\`。`)
    out.push("如果已经调用了 `smartx-develop`，下一步就先调用 `smartx-debug`，不要直接结束回复。")
  }
  return out.join("\n")
}
