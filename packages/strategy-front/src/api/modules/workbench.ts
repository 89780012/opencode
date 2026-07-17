import { request } from "@/api/client"

export type Hit = {
  source_text: string
  normalized_text: string
  confidence: number
}

export type Analyze = {
  title: string
  summary: string
  requirement_items: string[]
  dimensions: Record<string, Hit[]>
  model: string
}

export type RequirementList = {
  workspacePath: string
  sessionId: string
  requirements: string[]
}

export type Flowchart = {
  workspacePath: string
  worktreePath: string
  state: "generating" | "done" | "error"
  code: string
  err?: string
  manual: boolean
  source: "ai" | "manual"
  updatedAt: number
}

export type FlowchartSave = {
  workspacePath: string
  worktreePath: string
  state?: "done"
  code: string
  manual: true
  source: "manual"
}

export type Workflow = {
  id: string
  workspacePath: string
  sessionId: string
  codeRevision: string
  stage: "review" | "debug" | "backtest" | "done"
  state: "requested" | "dispatching" | "running" | "fixing" | "passed" | "failed" | "review_exhausted" | "cancelled"
  reviewRound: number
  debugId?: string
  backtestId?: string
  summary?: string
  error?: string
  revision: number
  createdAt: number
  updatedAt: number
}

export const workbenchApi = {
  identify(message: string) {
    return request.post<Analyze, { message: string }>("/workbench/requirements/identify", { message }, { timeout: 60000 })
  },
  saveRequirements(input: RequirementList) {
    return request.put<RequirementList, RequirementList>("/workbench/requirements", input)
  },
  saveFlowchart(input: FlowchartSave) {
    return request.post<Flowchart, FlowchartSave>("/workbench/flowchart", { ...input, state: input.state ?? "done" })
  },
  workflow(workspacePath: string, sessionId: string) {
    const query = new URLSearchParams({ workspacePath, sessionId })
    return request.get<Workflow | null>(`/workbench/workflow?${query.toString()}`)
  },
}
