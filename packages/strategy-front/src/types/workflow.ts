import type { Edge, Node, XYPosition } from "@xyflow/react"

export type WorkflowKind = "start" | "intent" | "plan" | "build" | "judge" | "review" | "end" | "gate"

export type WorkflowTone = "slate" | "blue" | "amber"

export const workflowField = {
  prompt: "prompt",
  skills: "skills",
  tool: "tool",
  timeout: "timeout",
  retry: "retry",
  model: "model",
  variant: "variant",
} as const

export type WorkflowFieldKey = (typeof workflowField)[keyof typeof workflowField]

export type WorkflowField =
  | {
      key: WorkflowFieldKey
      kind: "text"
      label: string
      value: string
    }
  | {
      key: WorkflowFieldKey
      kind: "select"
      label: string
      value: string
      options?: Array<string | { label: string; value: string }>
    }
  | {
      key: WorkflowFieldKey
      kind: "range"
      label: string
      from: string
      to: string
    }
  | {
      key: WorkflowFieldKey
      kind: "checks"
      label: string
      items: { label: string; checked?: boolean }[]
    }
  | {
      key: WorkflowFieldKey
      kind: "multi"
      label: string
      value: string[]
      options?: Array<string | { label: string; value: string }>
    }
  | {
      key: WorkflowFieldKey
      kind: "note"
      label: string
      value: string
    }

export type WorkflowNodeData = {
  kind: WorkflowKind
  title: string
  desc?: string
  tone: WorkflowTone
  fields: WorkflowField[]
}

export type WorkflowNodeType =
  | "workflow-start"
  | "workflow-intent"
  | "workflow-plan"
  | "workflow-build"
  | "workflow-judge"
  | "workflow-review"
  | "workflow-end"
  | "workflow-gate"

export function nodeType(kind: WorkflowKind): WorkflowNodeType {
  if (kind === "start") return "workflow-start"
  if (kind === "intent") return "workflow-intent"
  if (kind === "plan") return "workflow-plan"
  if (kind === "build") return "workflow-build"
  if (kind === "judge") return "workflow-judge"
  if (kind === "review") return "workflow-review"
  if (kind === "end") return "workflow-end"
  return "workflow-gate"
}

export type WorkflowFlowNode = Node<WorkflowNodeData, WorkflowNodeType>

export type WorkflowFlowEdge = Edge

export type WorkflowListStatus = "draft" | "ready"

export type WorkflowItem = {
  id: string
  name: string
  desc: string
  status: WorkflowListStatus
  updated_at: number
  tags: string[]
  count: number
  run_status?: WorkflowRunStatus
  run_total?: number
  run_at?: number
  done_runs?: number
  failed_runs?: number
  blocked_runs?: number
}

export type WorkflowDetail = WorkflowItem & {
  nodes: WorkflowFlowNode[]
  edges: WorkflowFlowEdge[]
}

export type WorkflowNodeKind = WorkflowKind

export type WorkflowSeed = {
  title?: string
  desc?: string
  agent?: string
  tool?: string
  prompt?: string
  skills?: string[]
  timeout?: number
  retry?: number
  model?: string
  variant?: string
}

export type WorkflowEdgeCond = "always" | "plan" | "build" | "checker" | "pass" | "fail"

export type WorkflowRunStatus = "pending" | "running" | "blocked" | "failed" | "done" | "interrupted"

export type WorkflowNodeRunStatus = "pending" | "running" | "blocked" | "failed" | "done" | "timeout" | "interrupted"

export type WorkflowRuntimeNode = {
  id: string
  kind: WorkflowNodeKind
  title: string
  agent: string
  tool_id?: string
  x?: number
  y?: number
  skills: string[]
  prompt: string
  timeout_ms: number
  retry_limit: number
  model_provider_id?: string
  model_id?: string
  variant?: string
}

export type WorkflowRuntimeEdge = {
  id: string
  from: string
  to: string
  cond: WorkflowEdgeCond
  label: string
}

export type WorkflowRuntimeDetail = {
  id: string
  name: string
  root_node_id: string
  nodes: WorkflowRuntimeNode[]
  edges: WorkflowRuntimeEdge[]
  updated_at: number
}

export type WorkflowRuntimeList = {
  items: WorkflowRuntimeDetail[]
}

export type WorkflowUpsertInput = {
  id?: string
  name: string
  root_node_id: string
  nodes: WorkflowRuntimeNode[]
  edges: WorkflowRuntimeEdge[]
}

export type WorkflowRun = {
  id: string
  workflow_id: string
  workspace_path: string
  session_id: string
  model_provider_id?: string
  model_id?: string
  variant?: string
  status: WorkflowRunStatus
  current_node_id?: string
  block_reason?: string
  block_request_id?: string
  input: string
  loop: number
  started_at: number
  ended_at?: number
  error?: string
}

export type WorkflowRunList = {
  items: WorkflowRun[]
}

export type WorkflowNodeSummary = {
  node_id: string
  kind: WorkflowNodeKind
  title: string
  total: number
  done: number
  failed: number
  blocked: number
  running: number
  timeout: number
  pass: number
  fail: number
  avg_ms: number
  last_run_at?: number
  last_status: WorkflowNodeRunStatus
}

export type WorkflowSummary = {
  workflow_id: string
  total_runs: number
  done_runs: number
  failed_runs: number
  blocked_runs: number
  running_runs: number
  avg_run_ms: number
  last_run_at?: number
  total_node_runs: number
  nodes: WorkflowNodeSummary[]
}

export type WorkflowAnchor = {
  started_at: number
  last_message_id?: string
}

export type WorkflowNodeResult = {
  raw?: string
  text?: string
  structured?: string
  next_prompt?: string
  pass?: boolean
  intent?: string
}

export type WorkflowNodeRun = {
  id: string
  run_id: string
  node_id: string
  session_id: string
  status: WorkflowNodeRunStatus
  turn: number
  input: string
  output?: string
  block_reason?: string
  block_request_id?: string
  error?: string
  started_at: number
  ended_at?: number
  anchor: WorkflowAnchor
  result: WorkflowNodeResult
}

export type WorkflowNodeRunList = {
  items: WorkflowNodeRun[]
}

export type WorkflowStartResult = {
  run: WorkflowRun
  node_run: WorkflowNodeRun
}

export type WorkflowContinueResult = {
  run: WorkflowRun
}

export function kindName(kind: WorkflowKind) {
  if (kind === "start") return "Start"
  if (kind === "intent") return "Intent"
  if (kind === "plan") return "Plan"
  if (kind === "build") return "Build"
  if (kind === "judge") return "Judge"
  if (kind === "review") return "Review"
  if (kind === "end") return "End"
  return "Gate"
}

export function kindDesc(kind: WorkflowKind) {
  if (kind === "start") return "Entry node for the workflow."
  if (kind === "intent") return "Route the latest request to planning, execution, or checking through a tool result."
  if (kind === "plan") return "Break the goal into an executable plan and hand it off through the workflow tool."
  if (kind === "build") return "Execute the work in the workspace and hand off the result through the workflow tool."
  if (kind === "judge") return "Decide pass or fail through the workflow tool to drive branching."
  if (kind === "review") return "Review the current result and return pass or fail through the workflow tool."
  if (kind === "end") return "Exit node for the workflow."
  return "Pause for manual or explicit gate handling through the workflow tool."
}

export function kindPrompt(kind: WorkflowKind) {
  if (kind === "start") return "Read the user goal and existing context, then hand control to the next node."
  if (kind === "intent") {
    return 'Decide whether the next node should be `plan`, `build`, or `checker`, then call `smartx-workflow` with `kind: "intent"`, `summary`, `intent`, and `next_prompt`.'
  }
  if (kind === "plan")
    return 'Produce the plan first, then call `smartx-workflow` with `kind: "plan"` plus `summary`, `plan`, `deliverables`, `risks`, and `next_prompt`.'
  if (kind === "build")
    return 'Complete the work, then call `smartx-workflow` with `kind: "build"` plus at least `summary` and `next_prompt`.'
  if (kind === "judge")
    return 'Make the branch decision, then call `smartx-workflow` with `kind: "judge"`, `summary`, `pass`, `issues`, and `next_prompt`.'
  if (kind === "review")
    return 'Review the current result, then call `smartx-workflow` with `kind: "review"`, `summary`, `pass`, `issues`, and `next_prompt`.'
  if (kind === "end") return "Summarize the final result and finish the workflow."
  return 'Handle the gate, then call `smartx-workflow` with `kind: "gate"`, `summary`, and `next_prompt`.'
}

export function kindAgent(kind: WorkflowKind) {
  if (kind === "start") return "operator"
  if (kind === "intent") return "intent"
  if (kind === "plan") return "smartx-plan"
  if (kind === "build") return "coder"
  if (kind === "judge") return "reviewer"
  if (kind === "review") return "checker"
  if (kind === "end") return "operator"
  return "operator"
}

export function kindTool(kind: WorkflowKind) {
  if (kind === "start" || kind === "end") return ""
  return "smartx-workflow"
}

export function kindRetry(kind: WorkflowKind) {
  if (kind === "start" || kind === "end") return 0
  return 2
}

export function timeoutOptions(value = 0) {
  const list = [
    { label: "Default (30m)", value: "0" },
    { label: "5 min", value: "300000" },
    { label: "15 min", value: "900000" },
    { label: "30 min", value: "1800000" },
    { label: "60 min", value: "3600000" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `${raw} ms`, value: raw }, ...list]
}

export function retryOptions(value = 2) {
  const list = [
    { label: "Retry 2", value: "2" },
    { label: "Retry 3", value: "3" },
    { label: "Retry 5", value: "5" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `Retry ${raw}`, value: raw }, ...list]
}

export function fieldLabel(key: WorkflowFieldKey) {
  if (key === workflowField.skills) return "Skills"
  if (key === workflowField.tool) return "Tool Contract"
  if (key === workflowField.timeout) return "Timeout"
  if (key === workflowField.retry) return "Retry"
  if (key === workflowField.model) return "Model Override"
  if (key === workflowField.variant) return "Variant"
  return "Prompt"
}

function fields(kind: WorkflowKind, seed: WorkflowSeed) {
  if (kind === "start" || kind === "end") return []

  return [
    {
      key: workflowField.timeout,
      kind: "select" as const,
      label: fieldLabel(workflowField.timeout),
      value: String(Math.max(0, Math.trunc(seed.timeout || 0))),
      options: timeoutOptions(seed.timeout),
    },
    {
      key: workflowField.retry,
      kind: "select" as const,
      label: fieldLabel(workflowField.retry),
      value: String(Math.max(0, Math.trunc(seed.retry ?? kindRetry(kind)))),
      options: retryOptions(seed.retry ?? kindRetry(kind)),
    },
    {
      key: workflowField.skills,
      kind: "multi" as const,
      label: fieldLabel(workflowField.skills),
      value: seed.skills || [],
    },
    {
      key: workflowField.tool,
      kind: "text" as const,
      label: fieldLabel(workflowField.tool),
      value: seed.tool ?? kindTool(kind),
    },
    {
      key: workflowField.model,
      kind: "text" as const,
      label: fieldLabel(workflowField.model),
      value: seed.model || "",
    },
    {
      key: workflowField.variant,
      kind: "text" as const,
      label: fieldLabel(workflowField.variant),
      value: seed.variant || "",
    },
    {
      key: workflowField.prompt,
      kind: "note" as const,
      label: fieldLabel(workflowField.prompt),
      value: seed.prompt || kindPrompt(kind),
    },
  ]
}

export function makeNode(kind: WorkflowKind, id: string, pos: XYPosition, seed: WorkflowSeed = {}): WorkflowFlowNode {
  const title =
    seed.title ||
    (kind === "start" || kind === "intent" || kind === "end" || kind === "judge"
      ? kindName(kind)
      : seed.agent || kindAgent(kind))

  const data = {
    kind,
    title,
    desc: seed.desc || kindDesc(kind),
    tone:
      kind === "start" || kind === "intent" || kind === "plan"
        ? "blue"
        : kind === "build" || kind === "end"
          ? "amber"
          : "slate",
    fields: fields(kind, seed),
  } as const

  return {
    id,
    type: nodeType(kind),
    dragHandle: ".workflow-drag",
    position: pos,
    data,
  }
}
