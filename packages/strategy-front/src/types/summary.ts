export type SummaryState = "empty" | "running" | "ready" | "error"

export interface SessionSummary {
  workspacePath: string
  sessionId: string
  summarySessionId?: string
  state: SummaryState
  text?: string
  updatedAt: number
  err?: string
}

export interface SessionSummaryRequest {
  workspacePath: string
  sessionId: string
}
