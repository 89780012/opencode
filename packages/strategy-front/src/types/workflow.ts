import type { Edge, Node, XYPosition } from "@xyflow/react"

export type WorkflowKind = "plan" | "build" | "review" | "gate"

export type WorkflowTone = "slate" | "blue" | "amber"

export type WorkflowField =
  | {
      kind: "select"
      label: string
      value: string
      options?: string[]
    }
  | {
      kind: "range"
      label: string
      from: string
      to: string
    }
  | {
      kind: "checks"
      label: string
      items: { label: string; checked?: boolean }[]
    }
  | {
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

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">

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

export type WorkflowEdgeCond = "always" | "pass" | "fail"

export type WorkflowRunStatus = "pending" | "running" | "blocked" | "failed" | "done"

export type WorkflowNodeRunStatus =
  | "pending"
  | "running"
  | "blocked"
  | "failed"
  | "done"
  | "timeout"

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

export function makeNode(kind: WorkflowKind, id: string, pos: XYPosition): WorkflowFlowNode {
  if (kind === "plan") {
    return {
      id,
      type: "workflow",
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title: "Plan",
        desc: "Outline the implementation plan without changing code.",
        tone: "blue",
        fields: [
          { kind: "select", label: "Session", value: "shared", options: ["shared", "isolated"] },
          { kind: "note", label: "Agent", value: "planner" },
          { kind: "note", label: "Prompt", value: "Write a concise implementation plan. Do not edit code." },
        ],
      },
    }
  }

  if (kind === "build") {
    return {
      id,
      type: "workflow",
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title: "Build",
        desc: "Implement the requested behavior in the workspace.",
        tone: "amber",
        fields: [
          { kind: "select", label: "Session", value: "shared", options: ["shared", "isolated"] },
          { kind: "note", label: "Agent", value: "coder" },
          { kind: "note", label: "Prompt", value: "Implement the requested behavior in the workspace." },
        ],
      },
    }
  }

  if (kind === "review") {
    return {
      id,
      type: "workflow",
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title: "Review",
        desc: "Review current code and emit structured pass or fail feedback.",
        tone: "slate",
        fields: [
          { kind: "select", label: "Session", value: "isolated", options: ["isolated", "shared"] },
          { kind: "note", label: "Agent", value: "reviewer" },
          {
            kind: "note",
            label: "Prompt",
            value: 'Review the latest code and return JSON with "pass", "summary", and "next_prompt".',
          },
        ],
      },
    }
  }

  return {
    id,
    type: "workflow",
    dragHandle: ".workflow-drag",
    position: pos,
    data: {
      kind,
      title: "Gate",
      desc: "Pause for a human decision before continuing.",
      tone: "slate",
      fields: [
        { kind: "select", label: "Session", value: "shared", options: ["shared", "isolated"] },
        { kind: "note", label: "Agent", value: "operator" },
        { kind: "note", label: "Prompt", value: "Wait for a human decision before continuing." },
      ],
    },
  }
}
