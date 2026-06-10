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

export const workbenchApi = {
  identify(message: string) {
    return request.post<Analyze, { message: string }>("/workbench/requirements/identify", { message }, { timeout: 60000 })
  },
  saveFlowchart(input: FlowchartSave) {
    return request.post<Flowchart, FlowchartSave>("/workbench/flowchart", { ...input, state: input.state ?? "done" })
  },
}
