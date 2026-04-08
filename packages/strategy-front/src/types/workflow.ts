import type { Edge, Node, XYPosition } from "@xyflow/react"

export type WorkflowKind = "start" | "plan" | "build" | "judge" | "review" | "end" | "gate"

export type WorkflowTone = "slate" | "blue" | "amber"

export const workflowField = {
  prompt: "prompt",
  session: "session",
  skills: "skills",
  timeout: "timeout",
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
  | "workflow-plan"
  | "workflow-build"
  | "workflow-judge"
  | "workflow-review"
  | "workflow-end"
  | "workflow-gate"

export function nodeType(kind: WorkflowKind): WorkflowNodeType {
  if (kind === "start") return "workflow-start"
  if (kind === "plan") return "workflow-plan"
  if (kind === "build") return "workflow-build"
  if (kind === "judge") return "workflow-judge"
  if (kind === "review") return "workflow-review"
  if (kind === "end") return "workflow-end"
  return "workflow-gate"
}

export type WorkflowFlowNode = Node<WorkflowNodeData, WorkflowNodeType>

export type WorkflowFlowEdge = Edge

export type WorkflowItem = {
  id: string
  name: string
  desc: string
  status: "draft" | "ready"
  updated_at: number
  tags: string[]
  count: number
}

export type WorkflowDetail = WorkflowItem & {
  nodes: WorkflowFlowNode[]
  edges: WorkflowFlowEdge[]
}

export type WorkflowNodeKind = WorkflowKind

export type WorkflowSessionMode = "shared" | "isolated"

export type WorkflowSeed = {
  title?: string
  desc?: string
  agent?: string
  prompt?: string
  mode?: WorkflowSessionMode
  skills?: string[]
  timeout?: number
  model?: string
  variant?: string
}

export type WorkflowEdgeCond = "always" | "pass" | "fail"

export type WorkflowRunStatus = "pending" | "running" | "blocked" | "failed" | "done"

export type WorkflowNodeRunStatus = "pending" | "running" | "blocked" | "failed" | "done" | "timeout"

export type WorkflowRuntimeNode = {
  id: string
  kind: WorkflowNodeKind
  title: string
  agent: string
  skills: string[]
  session_mode: WorkflowSessionMode
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
  workspace_path: string
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
  workspace_path: string
  root_node_id: string
  nodes: WorkflowRuntimeNode[]
  edges: WorkflowRuntimeEdge[]
}

export type WorkflowRun = {
  id: string
  workflow_id: string
  workspace_path: string
  root_session_id: string
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
  if (kind === "start") return "开始"
  if (kind === "plan") return "规划"
  if (kind === "build") return "执行"
  if (kind === "judge") return "路由"
  if (kind === "review") return "审查"
  if (kind === "end") return "结束"
  return "人工确认"
}

export function kindDesc(kind: WorkflowKind) {
  if (kind === "start") return "作为流程入口，整理上下文后进入下一个节点。"
  if (kind === "plan") return "拆解需求并输出清晰的执行计划。"
  if (kind === "build") return "在工作区中实现需求或调整现有代码。"
  if (kind === "judge") return "根据当前结果做路由判断，并按 pass 或 fail 走向不同分支。"
  if (kind === "review") return "检查当前结果并给出通过或不通过结论。"
  if (kind === "end") return "汇总最终结果，作为流程终点结束执行。"
  return "暂停流程，等待人工确认后继续。"
}

export function kindPrompt(kind: WorkflowKind) {
  if (kind === "start") return "读取用户目标和已有上下文，整理出本次工作流的执行起点，然后继续。"
  if (kind === "plan") return "输出清晰的实现计划，不要直接修改代码。"
  if (kind === "build") return "在当前工作区中完成需求实现，并保持改动可验证。"
  if (kind === "judge") return '根据当前结果做路由判断，并返回包含 "pass"、"summary"、"next_prompt" 的 JSON。'
  if (kind === "review") return '检查当前代码，并返回包含 "pass"、"summary"、"next_prompt" 的 JSON。'
  if (kind === "end") return "总结最终结果并给出明确结论；如果没有后续节点，流程将在这里结束。"
  return "等待人工确认后再继续执行。"
}

export function kindMode(kind: WorkflowKind): WorkflowSessionMode {
  if (kind === "review" || kind === "judge") return "isolated"
  return "shared"
}

export function kindAgent(kind: WorkflowKind) {
  if (kind === "start") return "operator"
  if (kind === "plan") return "planner"
  if (kind === "build") return "coder"
  if (kind === "judge") return "reviewer"
  if (kind === "review") return "reviewer"
  if (kind === "end") return "operator"
  return "operator"
}

function options(kind: WorkflowKind) {
  if (kind === "review" || kind === "judge") {
    return [
      { label: "独立会话", value: "isolated" },
      { label: "共享会话", value: "shared" },
    ]
  }

  return [
    { label: "共享会话", value: "shared" },
    { label: "独立会话", value: "isolated" },
  ]
}

function times(value = 0) {
  const list = [
    { label: "默认（30 分钟）", value: "0" },
    { label: "5 分钟", value: "300000" },
    { label: "15 分钟", value: "900000" },
    { label: "30 分钟", value: "1800000" },
    { label: "60 分钟", value: "3600000" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `${raw} ms`, value: raw }, ...list]
}

function label(key: WorkflowFieldKey) {
  if (key === workflowField.session) return "会话"
  if (key === workflowField.skills) return "技能"
  if (key === workflowField.timeout) return "超时"
  if (key === workflowField.model) return "模型覆盖"
  if (key === workflowField.variant) return "变体"
  return "提示词"
}

function fields(kind: WorkflowKind, seed: WorkflowSeed) {
  if (kind === "start" || kind === "end") return []

  const mode = seed.mode || kindMode(kind)
  return [
    {
      key: workflowField.session,
      kind: "select" as const,
      label: label(workflowField.session),
      value: mode,
      options: options(kind),
    },
    {
      key: workflowField.timeout,
      kind: "select" as const,
      label: label(workflowField.timeout),
      value: String(Math.max(0, Math.trunc(seed.timeout || 0))),
      options: times(seed.timeout),
    },
    {
      key: workflowField.skills,
      kind: "multi" as const,
      label: label(workflowField.skills),
      value: seed.skills || [],
    },
    {
      key: workflowField.model,
      kind: "text" as const,
      label: label(workflowField.model),
      value: seed.model || "",
    },
    {
      key: workflowField.variant,
      kind: "text" as const,
      label: label(workflowField.variant),
      value: seed.variant || "",
    },
    {
      key: workflowField.prompt,
      kind: "note" as const,
      label: label(workflowField.prompt),
      value: seed.prompt || kindPrompt(kind),
    },
  ]
}

export function makeNode(kind: WorkflowKind, id: string, pos: XYPosition, seed: WorkflowSeed = {}): WorkflowFlowNode {
  const title =
    seed.title ||
    (kind === "start" || kind === "end" || kind === "judge" ? kindName(kind) : seed.agent || kindAgent(kind))

  if (kind === "start") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "blue",
        fields: fields(kind, seed),
      },
    }
  }

  if (kind === "plan") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "blue",
        fields: fields(kind, seed),
      },
    }
  }

  if (kind === "build") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "amber",
        fields: fields(kind, seed),
      },
    }
  }

  if (kind === "judge") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "slate",
        fields: fields(kind, seed),
      },
    }
  }

  if (kind === "review") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "slate",
        fields: fields(kind, seed),
      },
    }
  }

  if (kind === "end") {
    return {
      id,
      type: nodeType(kind),
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title,
        desc: seed.desc || kindDesc(kind),
        tone: "amber",
        fields: fields(kind, seed),
      },
    }
  }

  return {
    id,
    type: nodeType(kind),
    dragHandle: ".workflow-drag",
    position: pos,
    data: {
      kind,
      title,
      desc: seed.desc || kindDesc(kind),
      tone: "slate",
      fields: fields(kind, seed),
    },
  }
}
