export type Flow = {
  session: string
  pendingLogCount: number
  pendingDebugCount: number
}

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
  reason: string
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
  status: string
  detail: string
  suggestion: string
}

export type SaveReview = {
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
      workspacePath: string
      worktreePath: string
      state: "passed" | "failed" | "error"
      reviewText: string
    }
  | {
      kind: "debug"
      workspacePath: string
      worktreePath: string
      sessionID: string
    }

export type Fix = {
  workspacePath: string
  worktreePath: string
  sessionID: string
  attempt: number
  reviewText: string
}

export type Memory = {
  hasProjectState: boolean
  hasRestoredState: boolean
  needsSave: boolean
}
