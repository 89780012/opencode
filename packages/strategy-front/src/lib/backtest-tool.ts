import type { ChatPart, ChatToolPart } from "@/types/chat"
import type { BacktestBrief, BacktestToolResult } from "@/types/backtest"

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function json(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function unwrap(value: unknown): unknown {
  const data = typeof value === "string" ? json(value) : value
  if (!record(data)) return data
  if ("structuredContent" in data) return data.structuredContent
  if (record(data.result) && "structuredContent" in data.result) return data.result.structuredContent
  if (!Array.isArray(data.content)) return data
  const item = data.content.find(
    (entry): entry is Record<string, unknown> => record(entry) && entry.type === "text" && typeof entry.text === "string",
  )
  return item ? json(item.text as string) : data
}

function brief(value: unknown): value is BacktestBrief {
  if (!record(value)) return false
  const status = value.status
  if (status !== "pending" && status !== "running" && status !== "done" && status !== "failed") return false
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.workspacePath === "string" &&
    value.workspacePath.trim().length > 0 &&
    typeof value.sessionId === "string" &&
    value.sessionId.trim().length > 0 &&
    typeof value.progress === "number" &&
    Number.isFinite(value.progress) &&
    value.progress >= 0 &&
    value.progress <= 100 &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision >= 0
  )
}

export function isBacktestToolResult(value: unknown): value is BacktestToolResult {
  if (!record(value) || value.version !== 1 || typeof value.accepted !== "boolean") return false
  if (!value.accepted) return value.reason === "busy" && !("run" in value)
  if (value.reason !== "created" && value.reason !== "idempotent" && value.reason !== "active") return false
  return brief(value.run)
}

export function parseBacktestToolResult(value: unknown) {
  const data = unwrap(value)
  return isBacktestToolResult(data) ? data : null
}

export function backtestTool(part: ChatToolPart) {
  if (part.tool !== "smartx_run_backtest" || part.state.status !== "completed") return null
  const data = parseBacktestToolResult(part.state.metadata.structuredContent) ?? parseBacktestToolResult(part.state.output)
  if (!data?.accepted) return null
  return data
}

export function partition(parts: ChatPart[]) {
  const cards = parts.filter(
    (part): part is ChatToolPart => part.type === "tool" && backtestTool(part) !== null,
  )
  const picked = new Set<ChatPart>(cards)
  return { cards, rest: parts.filter((part) => !picked.has(part)) }
}

export function results(parts: ChatToolPart[]) {
  const rows = parts.flatMap((part) => {
    const data = backtestTool(part)
    if (!data) return []
    const run = data.run
    return [{ key: `${run.workspacePath}\x00${run.sessionId}\x00${run.id}`, data }]
  })
  return [...new Map(rows.map((row) => [row.key, row] as const)).values()]
}
