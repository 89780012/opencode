export type Analysis = {
  workspace: string
  worktree: string
  state: "requested" | "running" | "done"
  summaryItems: string[]
  summaryText: string
  updated: number
}

export type Chart = {
  workspace: string
  worktree: string
  state: "requested" | "generating" | "done" | "error"
  mermaidCode: string
  errorText: string
  updated: number
}

export type Project = {
  workspace: string
  worktree: string
  hasProjectState: boolean
  updated: number
}

export type Dirt = {
  state: "clean" | "dirty"
  updated: number
  /** 最近一次明确源码写入版本；普通运行活动不得推进它。 */
  revision?: number
  /** 产生源码版本的主会话；普通运行活动不得接管它。 */
  owner?: string
  reason: string
  session?: string
}

export type Mode = "boot" | "refresh" | "final"

export type Life = "idle" | "booting" | "ready" | "dirty" | "refreshing" | "finalizing"

export type Call = {
  tool: string
  args?: {
    name?: unknown
    subagent_type?: unknown
  }
}

export type Save = {
  workspacePath: string
  worktreePath: string
  state?: "running" | "done"
  items: string[]
  text: string
}

export type SaveChart = {
  workspacePath: string
  worktreePath: string
  state?: "generating" | "done" | "error"
  code: string
  err?: string
}

export type ReviewItem = {
  name: string
  status: "passed" | "warning" | "failed" | "error" | "running"
  detail: string
  suggestion: string
}

export type SaveReview = {
  reviewId: string
  sessionId: string
  workspacePath: string
  worktreePath: string
  state?: "running" | "passed" | "failed" | "error"
  summary: string
  items: ReviewItem[]
  suggestions: string[]
}

export type Pending =
  | {
      kind: "analysis"
      workspacePath: string
      worktreePath: string
      summaryItems: string[]
      summaryText: string
    }
  | {
      kind: "flowchart"
      workspacePath: string
      worktreePath: string
      state: "done" | "error"
      mermaidCode: string
      errorText: string
    }
  | {
      kind: "review"
      reviewId: string
      sessionId: string
      workspacePath: string
      worktreePath: string
      reviewText: string
    }

export type Fix = {
  workspacePath: string
  worktreePath: string
  sessionID: string
  attempt: number
  reviewText: string
  changed?: boolean
  resumes?: number
}

export type Memory = {
  hasProjectState: boolean
  hasRestoredState: boolean
  needsSave: boolean
}

export type Automation = {
  baseline: boolean
  review: boolean
  debug: boolean
  backtest: boolean
}

export type Run = {
  id: string
  workspacePath: string
  sessionId: string
  codeRevision: string
  stage: "review" | "debug" | "backtest" | "done"
  state: "requested" | "dispatching" | "running" | "fixing" | "passed" | "failed" | "review_exhausted" | "cancelled"
  reviewRound: number
  debugId: string
  backtestId: string
  reviewEnabled: boolean
  debugEnabled: boolean
  backtestEnabled: boolean
  summary: string
  error: string
  revision: number
  createdAt: number
  updatedAt: number
}

export type RunStart = {
  workspacePath: string
  sessionId: string
  codeRevision: string
  review: boolean
  debug: boolean
  backtest: boolean
}

export type RunUpdate = {
  id: string
  workspacePath: string
  sessionId: string
  stage: Run["stage"]
  state: Run["state"]
  reviewRound?: number
  debugId?: string
  backtestId?: string
  summary?: string
  error?: string
}
