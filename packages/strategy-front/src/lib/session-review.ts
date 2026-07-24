type Part = {
  type: string
  agent?: string
  synthetic?: boolean
  metadata?: Record<string, unknown>
}

export function task(agent: string, description: string) {
  if (agent === "strategy-reviewer") return { title: "策略审查", review: true }
  return { title: description, meta: agent, review: false }
}

/** 读取 smartx-workflow 写入消息部件的稳定流水线标识。 */
export function scope(parts: Part[]) {
  return parts
    .map((part) => part.metadata?.smartxWorkflowId)
    .find((value): value is string => typeof value === "string" && !!value.trim())
}

/** 只隐藏自动流程写入的用户侧控制消息，不隐藏后续 assistant 输出。 */
export function hidden(parts: Part[]) {
  if (!parts.length) return false
  return parts.every((part) => part.type === "text" && part.synthetic) || !!scope(parts)
}
