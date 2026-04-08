import { kindAgent, kindName, makeNode, workflowField } from "@/types/workflow"
import type {
  WorkflowDetail,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowItem,
  WorkflowRuntimeDetail,
  WorkflowRuntimeEdge,
  WorkflowRuntimeNode,
  WorkflowSessionMode,
} from "@/types/workflow"

function tone(kind: WorkflowRuntimeNode["kind"]) {
  if (kind === "start" || kind === "plan") return "blue"
  if (kind === "end" || kind === "build") return "amber"
  return "slate"
}

function desc(node: WorkflowRuntimeNode) {
  if (node.prompt.trim()) return node.prompt.trim()
  if (node.kind === "start") return "整理输入并启动工作流。"
  if (node.kind === "plan") return "输出实现计划。"
  if (node.kind === "build") return "在工作区中完成实现。"
  if (node.kind === "judge") return "根据结果做路由判断。"
  if (node.kind === "review") return "检查当前工作区状态。"
  if (node.kind === "end") return "汇总结论并结束流程。"
  return "等待人工确认后继续。"
}

function name(node: WorkflowRuntimeNode) {
  const title = node.title.trim()
  if (!title) return node.agent.trim() || kindName(node.kind)
  if (node.kind === "start" || node.kind === "end" || node.kind === "judge") return title
  if (title === kindName(node.kind)) return node.agent.trim() || kindName(node.kind)
  return title
}

function agent(node: WorkflowFlowNode) {
  if (node.data.kind === "start" || node.data.kind === "end") return ""
  if (node.data.kind === "judge") return kindAgent(node.data.kind)
  return node.data.title.trim() || kindAgent(node.data.kind)
}

function times(value: number) {
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

function fields(node: WorkflowRuntimeNode) {
  if (node.kind === "start" || node.kind === "end") return []

  return [
    {
      key: workflowField.session,
      kind: "select" as const,
      label: "会话",
      value: node.session_mode,
      options:
        node.session_mode === "isolated"
          ? [
              { label: "独立会话", value: "isolated" },
              { label: "共享会话", value: "shared" },
            ]
          : [
              { label: "共享会话", value: "shared" },
              { label: "独立会话", value: "isolated" },
            ],
    },
    {
      key: workflowField.timeout,
      kind: "select" as const,
      label: "超时",
      value: String(Math.max(0, Math.trunc(node.timeout_ms || 0))),
      options: times(node.timeout_ms),
    },
    {
      key: workflowField.skills,
      kind: "multi" as const,
      label: "技能",
      value: node.skills || [],
    },
    {
      key: workflowField.prompt,
      kind: "note" as const,
      label: "提示词",
      value: node.prompt || "",
    },
  ]
}

export function runtimeItem(item: WorkflowRuntimeDetail): WorkflowItem {
  return {
    id: item.id,
    name: item.name,
    desc: item.workspace_path || "工作流",
    status: item.nodes.length > 0 ? "ready" : "draft",
    updated_at: item.updated_at,
    tags: [...new Set(item.nodes.map((node) => kindName(node.kind)))],
    count: item.nodes.length,
  }
}

export function runtimeDetail(item: WorkflowRuntimeDetail): WorkflowDetail {
  const nodes = item.nodes.map((node, i) => {
    const base = makeNode(node.kind, node.id, { x: 120 + i * 300, y: 180 + (i % 2) * 42 }, { timeout: node.timeout_ms })
    return {
      ...base,
      data: {
        ...base.data,
        kind: node.kind,
        title: name(node),
        desc: desc(node),
        tone: tone(node.kind),
        fields: fields(node),
      },
    } satisfies WorkflowFlowNode
  })

  const edges = item.edges.map(
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
    const title =
      node.data.title.trim() ||
      (node.data.kind === "start" || node.data.kind === "end" || node.data.kind === "judge"
        ? kindName(node.data.kind)
        : kindAgent(node.data.kind))
    return {
      id: node.id,
      kind: node.data.kind,
      title,
      agent: agent(node),
      skills: multi(node.data.fields, workflowField.skills),
      session_mode: mode(node.data.fields, node.data.kind),
      prompt: note(node.data.fields, workflowField.prompt),
      timeout_ms: num(node.data.fields, workflowField.timeout),
      retry_limit: 0,
    }
  }) satisfies WorkflowRuntimeNode[]

  const nextEdges = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    cond: edge.data?.cond === "pass" || edge.data?.cond === "fail" ? edge.data.cond : "always",
    label: typeof edge.label === "string" ? edge.label : "",
  })) satisfies WorkflowRuntimeEdge[]

  return {
    ...item,
    root_node_id: nextNodes.some((node) => node.id === item.root_node_id) ? item.root_node_id : (nextNodes[0]?.id ?? ""),
    nodes: nextNodes,
    edges: nextEdges,
  }
}

function note(fields: WorkflowFlowNode["data"]["fields"], key: string) {
  const item = fields.find((field) => field.key === key && field.kind === "note")
  if (!item || item.kind !== "note") return ""
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
  const value = select(fields, key, "0")
  const num = Number.parseInt(value, 10)
  if (!Number.isFinite(num) || num < 0) return 0
  return num
}

function mode(fields: WorkflowFlowNode["data"]["fields"], kind: WorkflowRuntimeNode["kind"]): WorkflowSessionMode {
  const value = select(fields, workflowField.session, kind === "review" || kind === "judge" ? "isolated" : "shared")
  return value === "isolated" ? "isolated" : "shared"
}
