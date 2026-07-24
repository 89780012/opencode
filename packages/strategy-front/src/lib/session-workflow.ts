type Message = {
  id: string
  role: "user" | "assistant"
  parentID?: string
}

type Part = {
  id?: string
  type: string
  tool?: string
  metadata?: Record<string, unknown>
  state?: {
    input?: Record<string, unknown>
  }
}

export type WorkflowBinding = {
  after: string
  reviewId: string
}

function scope(parts: Part[]) {
  return parts
    .map((part) => part.metadata?.smartxWorkflowId)
    .find((value): value is string => typeof value === "string" && !!value.trim())
}

function review(parts: Part[]) {
  return parts
    .filter(
      (part) =>
        part.type === "tool" &&
        part.tool === "task" &&
        part.state?.input?.subagent_type === "strategy-reviewer" &&
        typeof part.id === "string",
    )
    .map((part) => part.id ?? "")
    .at(-1)
}

/** 将自动流程事实绑定到最后一条关联消息，并记录该流程最新 reviewer 的稳定 ID。 */
export function bind(messages: Message[], parts: Record<string, Part[]>, ids: string[]) {
  const rows = Object.fromEntries(ids.map((id) => [id, { after: "", reviewId: "" }])) as Record<string, WorkflowBinding>
  messages.forEach((message) => {
    const parent = message.role === "assistant" ? (message.parentID ?? "") : message.id
    const id = scope(parts[parent] ?? [])
    if (!id) return
    rows[id] ??= { after: "", reviewId: "" }
    rows[id].after = message.role === "assistant" ? `group:${parent}` : `item:${message.id}`
    if (message.role !== "assistant") return
    rows[id].reviewId = review(parts[message.id] ?? []) ?? rows[id].reviewId
  })
  return rows
}
