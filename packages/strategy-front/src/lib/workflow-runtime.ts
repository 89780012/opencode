import {
  fieldLabel,
  kindAgent,
  kindDesc,
  kindName,
  kindRetry,
  kindTool,
  makeNode,
  retryOptions,
  timeoutOptions,
  workflowField,
} from "@/types/workflow"
import type {
  WorkflowDetail,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowItem,
  WorkflowRuntimeDetail,
  WorkflowRuntimeEdge,
  WorkflowRuntimeNode,
} from "@/types/workflow"

function tone(kind: WorkflowRuntimeNode["kind"]) {
  if (kind === "start" || kind === "intent" || kind === "plan") return "blue"
  if (kind === "end" || kind === "build") return "amber"
  return "slate"
}

function desc(node: WorkflowRuntimeNode) {
  if (node.prompt.trim()) return node.prompt.trim()
  return kindDesc(node.kind)
}

function title(node: WorkflowRuntimeNode) {
  const text = node.title.trim()
  if (!text) return node.agent.trim() || kindName(node.kind)
  if (node.kind === "start" || node.kind === "intent" || node.kind === "end" || node.kind === "judge") return text
  if (text === kindName(node.kind)) return node.agent.trim() || kindName(node.kind)
  return text
}

function agent(node: WorkflowFlowNode) {
  if (node.data.kind === "start" || node.data.kind === "end") return ""
  if (node.data.kind === "intent" || node.data.kind === "judge" || node.data.kind === "gate")
    return kindAgent(node.data.kind)
  return node.data.title.trim() || kindAgent(node.data.kind)
}

function pos(node: WorkflowRuntimeNode, i: number) {
  if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
    return {
      x: node.x || 0,
      y: node.y || 0,
    }
  }
  return {
    x: 120 + i * 300,
    y: 180 + (i % 2) * 42,
  }
}

function fields(node: WorkflowRuntimeNode) {
  if (node.kind === "start" || node.kind === "end") return []

  return [
    {
      key: workflowField.timeout,
      kind: "select" as const,
      label: fieldLabel(workflowField.timeout),
      value: String(Math.max(0, Math.trunc(node.timeout_ms || 0))),
      options: timeoutOptions(node.timeout_ms),
    },
    {
      key: workflowField.retry,
      kind: "select" as const,
      label: fieldLabel(workflowField.retry),
      value: String(Math.max(0, Math.trunc(node.retry_limit || kindRetry(node.kind)))),
      options: retryOptions(node.retry_limit || kindRetry(node.kind)),
    },
    {
      key: workflowField.skills,
      kind: "multi" as const,
      label: fieldLabel(workflowField.skills),
      value: node.skills || [],
    },
    {
      key: workflowField.tool,
      kind: "text" as const,
      label: fieldLabel(workflowField.tool),
      value: node.tool_id || kindTool(node.kind),
    },
    {
      key: workflowField.model,
      kind: "text" as const,
      label: fieldLabel(workflowField.model),
      value: model(node),
    },
    {
      key: workflowField.variant,
      kind: "text" as const,
      label: fieldLabel(workflowField.variant),
      value: node.variant || "",
    },
    {
      key: workflowField.prompt,
      kind: "note" as const,
      label: fieldLabel(workflowField.prompt),
      value: node.prompt || "",
    },
  ]
}

export function runtimeItem(item: WorkflowRuntimeDetail): WorkflowItem {
  const nodes = item.nodes || []
  const status = nodes.length === 0 ? "draft" : "ready"
  const root = item.root_node_id.trim()
  const desc =
    nodes.length === 0 ? "还没有配置任何节点。" : `共 ${nodes.length} 个节点${root ? `，根节点为 ${root}` : ""}。`

  return {
    id: item.id,
    name: item.name,
    desc,
    status,
    updated_at: item.updated_at,
    tags: [...new Set(nodes.map((node) => kindName(node.kind)))],
    count: nodes.length,
  }
}

export function runtimeDetail(item: WorkflowRuntimeDetail): WorkflowDetail {
  const nodes = (item.nodes || []).map((node, i) => {
    const base = makeNode(node.kind, node.id, pos(node, i), {
      timeout: node.timeout_ms,
      retry: node.retry_limit,
      model: model(node),
      variant: node.variant,
    })

    return {
      ...base,
      data: {
        ...base.data,
        kind: node.kind,
        title: title(node),
        desc: desc(node),
        tone: tone(node.kind),
        fields: fields(node),
      },
    } satisfies WorkflowFlowNode
  })

  const edges = (item.edges || []).map(
    (edge) =>
      ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.label || undefined,
        data: {
          cond: edge.cond,
        },
      }) satisfies WorkflowFlowEdge,
  )

  return {
    ...runtimeItem(item),
    nodes,
    edges,
  }
}

export function fromFlow(
  item: WorkflowRuntimeDetail,
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): WorkflowRuntimeDetail {
  const nextNodes = nodes.map((node) => {
    const text =
      node.data.title.trim() ||
      (node.data.kind === "start" ||
      node.data.kind === "intent" ||
      node.data.kind === "end" ||
      node.data.kind === "judge"
        ? kindName(node.data.kind)
        : kindAgent(node.data.kind))

    return {
      id: node.id,
      kind: node.data.kind,
      title: text,
      agent: agent(node),
      tool_id: textField(node.data.fields, workflowField.tool) || kindTool(node.data.kind),
      x: node.position.x,
      y: node.position.y,
      skills: multi(node.data.fields, workflowField.skills),
      prompt: note(node.data.fields, workflowField.prompt),
      timeout_ms: num(node.data.fields, workflowField.timeout),
      retry_limit: num(node.data.fields, workflowField.retry) || kindRetry(node.data.kind),
      ...ref(textField(node.data.fields, workflowField.model)),
      variant: textField(node.data.fields, workflowField.variant),
    }
  }) satisfies WorkflowRuntimeNode[]

  const nextEdges = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    cond:
      edge.data?.cond === "plan" ||
      edge.data?.cond === "build" ||
      edge.data?.cond === "checker" ||
      edge.data?.cond === "pass" ||
      edge.data?.cond === "fail"
        ? edge.data.cond
        : "always",
    label: typeof edge.label === "string" ? edge.label : "",
  })) satisfies WorkflowRuntimeEdge[]

  return {
    ...item,
    root_node_id: nextNodes.some((node) => node.id === item.root_node_id)
      ? item.root_node_id
      : (nextNodes[0]?.id ?? ""),
    nodes: nextNodes,
    edges: nextEdges,
  }
}

function note(fields: WorkflowFlowNode["data"]["fields"], key: string) {
  const item = fields.find((field) => field.key === key && field.kind === "note")
  if (!item || item.kind !== "note") return ""
  return item.value.trim()
}

function textField(fields: WorkflowFlowNode["data"]["fields"], key: string) {
  const item = fields.find((field) => field.key === key && field.kind === "text")
  if (!item || item.kind !== "text") return ""
  return item.value.trim()
}

function select(fields: WorkflowFlowNode["data"]["fields"], key: string, fallback: string) {
  const item = fields.find((field) => field.key === key && field.kind === "select")
  if (!item || item.kind !== "select") return fallback
  return item.value || fallback
}

function multi(fields: WorkflowFlowNode["data"]["fields"], key: string) {
  const item = fields.find((field) => field.key === key && field.kind === "multi")
  if (!item || item.kind !== "multi") return []
  return item.value.map((row) => row.trim()).filter(Boolean)
}

function num(fields: WorkflowFlowNode["data"]["fields"], key: string) {
  const raw = Number.parseInt(select(fields, key, "0"), 10)
  if (!Number.isFinite(raw) || raw < 0) return 0
  return raw
}

function model(node: WorkflowRuntimeNode) {
  if (!node.model_provider_id || !node.model_id) return ""
  return `${node.model_provider_id}/${node.model_id}`
}

function ref(value: string) {
  if (!value) return {}
  const [head, ...rest] = value.split("/")
  const tail = rest.join("/").trim()
  if (!head?.trim() || !tail) return {}
  return {
    model_provider_id: head.trim(),
    model_id: tail,
  }
}
