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
  if (node.kind === "judge") return "根据结果做出路由判断。"
  if (node.kind === "review") return "检查当前结果是否通过。"
  if (node.kind === "end") return "汇总结论并结束流程。"
  return "等待人工确认后继续。"
}

function title(node: WorkflowRuntimeNode) {
  const text = node.title.trim()
  if (!text) return node.agent.trim() || kindName(node.kind)
  if (node.kind === "start" || node.kind === "end" || node.kind === "judge") return text
  if (text === kindName(node.kind)) return node.agent.trim() || kindName(node.kind)
  return text
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

function retries(value: number) {
  const list = [
    { label: "不重试", value: "0" },
    { label: "重试 1 次", value: "1" },
    { label: "重试 2 次", value: "2" },
    { label: "重试 3 次", value: "3" },
    { label: "重试 5 次", value: "5" },
  ]
  const raw = String(Math.max(0, Math.trunc(value || 0)))
  if (list.some((item) => item.value === raw)) return list
  return [{ label: `重试 ${raw} 次`, value: raw }, ...list]
}

function sessions(node: WorkflowRuntimeNode) {
  const list = [
    { label: "共享会话", value: "shared" },
    { label: "命名会话", value: "keyed" },
    { label: "独立会话", value: "isolated" },
  ]
  if (node.session_mode === "isolated") return [list[2], list[1], list[0]]
  if (node.session_mode === "keyed") return [list[1], list[0], list[2]]
  return list
}

function fields(node: WorkflowRuntimeNode) {
  if (node.kind === "start" || node.kind === "end") return []

  return [
    {
      key: workflowField.session,
      kind: "select" as const,
      label: "会话",
      value: node.session_mode,
      options: sessions(node),
    },
    {
      key: workflowField.sessionKey,
      kind: "text" as const,
      label: "会话键",
      value: node.session_key || "",
    },
    {
      key: workflowField.timeout,
      kind: "select" as const,
      label: "超时",
      value: String(Math.max(0, Math.trunc(node.timeout_ms || 0))),
      options: times(node.timeout_ms),
    },
    {
      key: workflowField.retry,
      kind: "select" as const,
      label: "重试",
      value: String(Math.max(0, Math.trunc(node.retry_limit || 0))),
      options: retries(node.retry_limit),
    },
    {
      key: workflowField.skills,
      kind: "multi" as const,
      label: "技能",
      value: node.skills || [],
    },
    {
      key: workflowField.model,
      kind: "text" as const,
      label: "模型覆盖",
      value: model(node),
    },
    {
      key: workflowField.variant,
      kind: "text" as const,
      label: "变体",
      value: node.variant || "",
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
  const nodes = item.nodes || []
  const ready = nodes.length > 0 && !!item.workspace_path.trim()
  const status = nodes.length === 0 ? "draft" : ready ? "ready" : "config"

  return {
    id: item.id,
    name: item.name,
    desc: item.workspace_path.trim() || "未配置工作区",
    status,
    updated_at: item.updated_at,
    tags: [...new Set(nodes.map((node) => kindName(node.kind)))],
    count: nodes.length,
  }
}

export function runtimeDetail(item: WorkflowRuntimeDetail): WorkflowDetail {
  const nodes = (item.nodes || []).map((node, i) => {
    const base = makeNode(
      node.kind,
      node.id,
      { x: 120 + i * 300, y: 180 + (i % 2) * 42 },
      {
        timeout: node.timeout_ms,
        retry: node.retry_limit,
        session_key: node.session_key,
        model: model(node),
        variant: node.variant,
      },
    )

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
  workspace = item.workspace_path,
): WorkflowRuntimeDetail {
  const nextNodes = nodes.map((node) => {
    const text =
      node.data.title.trim() ||
      (node.data.kind === "start" || node.data.kind === "end" || node.data.kind === "judge"
        ? kindName(node.data.kind)
        : kindAgent(node.data.kind))

    return {
      id: node.id,
      kind: node.data.kind,
      title: text,
      agent: agent(node),
      skills: multi(node.data.fields, workflowField.skills),
      session_mode: mode(node.data.fields, node.data.kind),
      session_key: textField(node.data.fields, workflowField.sessionKey),
      prompt: note(node.data.fields, workflowField.prompt),
      timeout_ms: num(node.data.fields, workflowField.timeout),
      retry_limit: num(node.data.fields, workflowField.retry),
      ...ref(textField(node.data.fields, workflowField.model)),
      variant: textField(node.data.fields, workflowField.variant),
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
    workspace_path: workspace.trim(),
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

function mode(fields: WorkflowFlowNode["data"]["fields"], kind: WorkflowRuntimeNode["kind"]): WorkflowSessionMode {
  const value = select(fields, workflowField.session, kind === "review" || kind === "judge" ? "isolated" : "shared")
  if (value === "isolated") return "isolated"
  if (value === "keyed") return "keyed"
  return "shared"
}
