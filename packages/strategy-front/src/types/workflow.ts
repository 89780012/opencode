import type { Edge, Node, XYPosition } from "@xyflow/react"
import type { WorkflowAgentRole } from "@/types/agent"

//节点类型
export type WorkflowKind = "start" | "router" | "plan" | "execute" | "check" | "end"

// 颜色
export type WorkflowTone = "slate" | "blue" | "amber"

//面板字段
export const workflowField = {
  agent: "agent",
  prompt: "prompt",
  skills: "skills",
  tool: "tool",
  timeout: "timeout",
  retry: "retry",
  model: "model",
  variant: "variant",
} as const

export type WorkflowFieldKey = (typeof workflowField)[keyof typeof workflowField]

//属性面板字典
export type WorkflowField =
  | {
      key: WorkflowFieldKey
      kind: "text"
      label: string
      value: string
      options?: Array<string | { label: string; value: string }>
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

//节点数据
export type WorkflowNodeData = {
  kind: WorkflowKind
  title: string
  desc?: string
  tone: WorkflowTone
  fields: WorkflowField[]
}

// 节点类型
export type WorkflowNodeType =
  | "workflow-start"
  | "workflow-router"
  | "workflow-plan"
  | "workflow-execute"
  | "workflow-check"
  | "workflow-end"

// 节点类型
export function nodeType(kind: WorkflowKind): WorkflowNodeType {
  if (kind === "start") return "workflow-start"
  if (kind === "router") return "workflow-router"
  if (kind === "plan") return "workflow-plan"
  if (kind === "execute") return "workflow-execute"
  if (kind === "check") return "workflow-check"
  return "workflow-end"
}

export type WorkflowFlowNode = Node<WorkflowNodeData, WorkflowNodeType>

export type WorkflowFlowEdge = Edge

//工作流状态 草稿|就绪
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
  waiting_runs?: number
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

export type WorkflowEdgeCond = "always" | "plan" | "execute" | "check" | "pass" | "fail"

export type WorkflowRunStatus = "pending" | "queued" | "running" | "waiting" | "failed" | "done" | "interrupted" | "cancelled"

export type WorkflowNodeRunStatus = "pending" | "queued" | "running" | "waiting" | "failed" | "done" | "timeout" | "interrupted" | "cancelled"

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
  waiting: number
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
  waiting_runs: number
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
  handoff?: string
  pass?: boolean
  route?: string
  issues?: string[]
  steps?: string[]
  deliverables?: string[]
  risks?: string[]
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

export type WorkflowWaitMode = "text" | "form" | "approval" | "confirm"

export type WorkflowWaitStatus = "open" | "answered" | "rejected" | "expired" | "cancelled" | "consumed"

export type WorkflowWait = {
  id: string
  run_id: string
  step_id: string
  session_id?: string
  kind: string
  mode: WorkflowWaitMode
  title: string
  prompt: string
  schema?: unknown
  required: boolean
  status: WorkflowWaitStatus
  source: string
  source_request_id?: string
  resume_hint?: string
  expires_at?: number
  created_at: number
  answered_at?: number
  consumed_at?: number
}

export type WorkflowWaitList = {
  items: WorkflowWait[]
}

export type WorkflowReply = {
  id: string
  wait_id: string
  run_id: string
  step_id: string
  actor: string
  payload?: unknown
  idempotency_key: string
  created_at: number
}

export function kindName(kind: WorkflowKind) {
  if (kind === "start") return "开始"
  if (kind === "router") return "路由"
  if (kind === "plan") return "规划"
  if (kind === "execute") return "执行"
  if (kind === "check") return "检查"
  return "结束"
}

export function kindDesc(kind: WorkflowKind) {
  if (kind === "start") return "读取输入和上下文，把流程送入第一个有效节点。"
  if (kind === "router") return "判断下一步应进入规划、执行还是检查。"
  if (kind === "plan") return "拆解目标、明确步骤、交付物和风险。"
  if (kind === "execute") return "在工作区内实际执行任务、修改文件并完成验证。"
  if (kind === "check") return "检查当前结果是否通过，并输出 pass 或 fail。"
  return "汇总最终结果，结束整条工作流。"
}

export function kindPrompt(kind: WorkflowKind) {
  if (kind === "start") return "阅读用户目标和上下文，并把流程送入下一节点。"
  if (kind === "router") {
    return '判断下一步应进入 `plan`、`execute` 还是 `check`，然后调用 `smartx-workflow`，返回 `kind: "router"`、`summary`、`route`、`handoff`。'
  }
  if (kind === "plan") {
    return '先输出可执行计划，再调用 `smartx-workflow`，返回 `kind: "plan"`、`summary`、`steps`、`deliverables`、`risks`、`handoff`。'
  }
  if (kind === "execute") {
    return '完成当前执行任务后，调用 `smartx-workflow`，返回 `kind: "execute"`、`summary`，必要时补充 `handoff`。'
  }
  if (kind === "check") {
    return '检查当前结果是否通过，然后调用 `smartx-workflow`，返回 `kind: "check"`、`summary`、`pass`、`issues`、`handoff`。'
  }
  return "汇总结果并结束流程。"
}

export function kindRole(kind: WorkflowKind): WorkflowAgentRole | undefined {
  if (kind === "router") return "router"
  if (kind === "plan") return "planner"
  if (kind === "execute") return "executor"
  if (kind === "check") return "checker"
}

export function kindAgent(kind: WorkflowKind) {
  if (kind === "router") return "intent"
  if (kind === "plan") return "smartx-plan"
  if (kind === "execute") return "strategy"
  if (kind === "check") return "checker"
  return ""
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
    { label: "默认 (30 分钟)", value: "0" },
    { label: "5 分钟", value: "300000" },
    { label: "15 分钟", value: "900000" },
    { label: "30 分钟", value: "1800000" },
    { label: "60 分钟", value: "3600000" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `${raw} ms`, value: raw }, ...list]
}

export function retryOptions(value = 2) {
  const list = [
    { label: "重试 2 次", value: "2" },
    { label: "重试 3 次", value: "3" },
    { label: "重试 5 次", value: "5" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `重试 ${raw} 次`, value: raw }, ...list]
}

export function fieldLabel(key: WorkflowFieldKey) {
  if (key === workflowField.agent) return "节点 Agent"
  if (key === workflowField.skills) return "技能"
  if (key === workflowField.tool) return "工具协议"
  if (key === workflowField.timeout) return "超时"
  if (key === workflowField.retry) return "重试"
  if (key === workflowField.model) return "模型覆盖"
  if (key === workflowField.variant) return "变体"
  return "提示词"
}

function fields(kind: WorkflowKind, seed: WorkflowSeed) {
  if (kind === "start" || kind === "end") return []

  return [
    {
      key: workflowField.agent,
      kind: "select" as const,
      label: fieldLabel(workflowField.agent),
      value: seed.agent || kindAgent(kind),
      options: seed.agent ? [seed.agent] : undefined,
    },
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
  const data = {
    kind,
    title: seed.title || kindName(kind),
    desc: seed.desc || kindDesc(kind),
    tone:
      kind === "start" || kind === "router" || kind === "plan"
        ? "blue"
        : kind === "execute" || kind === "end"
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
