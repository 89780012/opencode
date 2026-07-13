import type { BacktestRun, BacktestUpdate } from "@/types/backtest"

function hex(value: number) {
  return value.toString(16).padStart(2, "0")
}

export function backtestKey() {
  const bytes = new Uint8Array(16)
  const crypto = globalThis.crypto
  if (!crypto || typeof crypto.getRandomValues !== "function") {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const value = Array.from(bytes, hex).join("")
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}

export function isBacktestUpdate(value: unknown): value is BacktestUpdate {
  if (!value || typeof value !== "object") return false
  const data = value as Record<string, unknown>
  const status = data.status
  if (status !== "pending" && status !== "running" && status !== "done" && status !== "failed") return false
  return (
    typeof data.id === "string" &&
    typeof data.workspacePath === "string" &&
    typeof data.sessionId === "string" &&
    typeof data.statusCode === "number" &&
    typeof data.progress === "number" &&
    typeof data.error === "string" &&
    typeof data.revision === "number" &&
    typeof data.updatedAt === "number" &&
    typeof data.hasResult === "boolean"
  )
}

export function isBacktestRun(value: unknown): value is BacktestRun {
  if (!value || typeof value !== "object") return false
  const data = value as Record<string, unknown>
  if (data.status !== "pending" && data.status !== "running" && data.status !== "done" && data.status !== "failed") {
    return false
  }
  return (
    typeof data.id === "string" &&
    typeof data.workspacePath === "string" &&
    typeof data.sessionId === "string" &&
    typeof data.pluginId === "string" &&
    typeof data.btId === "string" &&
    typeof data.statusCode === "number" &&
    typeof data.progress === "number" &&
    !!data.config &&
    typeof data.config === "object" &&
    !!data.result &&
    typeof data.result === "object" &&
    !!data.summary &&
    typeof data.summary === "object" &&
    !!data.dataFiles &&
    typeof data.dataFiles === "object" &&
    typeof data.logPath === "string" &&
    typeof data.error === "string" &&
    typeof data.requestKey === "string" &&
    typeof data.revision === "number" &&
    typeof data.startedAt === "number" &&
    typeof data.finishedAt === "number" &&
    typeof data.updatedAt === "number"
  )
}

export function activeBacktest(runs: BacktestRun[]) {
  return runs.find((run) => run.status === "pending" || run.status === "running") ?? null
}
