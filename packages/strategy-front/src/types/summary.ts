export type SummaryState = "empty" | "running" | "ready" | "error"

export interface SessionSummary {
  workspacePath: string
  sessionId: string
  summarySessionId?: string
  state: SummaryState
  text?: string
  messageCount: number
  updatedAt: number
  err?: string
}

export interface SessionSummaryRequest {
  workspacePath: string
  sessionId: string
  providerID: string
  modelID: string
  variant?: string
}
