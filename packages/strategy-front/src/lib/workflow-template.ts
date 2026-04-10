import { kindAgent, kindPrompt, kindRetry, kindTool } from "@/types/workflow"
import type { WorkflowKind, WorkflowRuntimeDetail, WorkflowRuntimeEdge, WorkflowRuntimeNode } from "@/types/workflow"

function agent(kind: WorkflowKind) {
  if (kind === "start" || kind === "end") return ""
  return kindAgent(kind)
}

function prompt(kind: WorkflowKind) {
  if (kind === "start" || kind === "end") return ""
  return kindPrompt(kind)
}

function node(
  id: string,
  kind: WorkflowKind,
  x: number,
  y: number,
  title: string,
  aid?: string,
): WorkflowRuntimeNode {
  return {
    id,
    kind,
    title,
    agent: aid || agent(kind),
    tool_id: kindTool(kind),
    x,
    y,
    skills: [],
    prompt: prompt(kind),
    timeout_ms: 0,
    retry_limit: kindRetry(kind),
  }
}

function edge(
  id: string,
  from: string,
  to: string,
  cond: WorkflowRuntimeEdge["cond"],
  label = "",
): WorkflowRuntimeEdge {
  return {
    id,
    from,
    to,
    cond,
    label,
  }
}

export function starter(name: string): Omit<WorkflowRuntimeDetail, "id" | "updated_at"> {
  return {
    name,
    root_node_id: "start",
    nodes: [
      node("start", "start", 80, 220, "开始"),
      node("router", "router", 340, 220, "路由", "intent"),
      node("plan", "plan", 640, 80, "规划", "smartx-plan"),
      node("execute", "execute", 640, 260, "执行", "strategy"),
      node("check", "check", 940, 220, "检查", "checker"),
      node("end", "end", 1240, 220, "结束"),
    ],
    edges: [
      edge("e-start-router", "start", "router", "always", "进入路由"),
      edge("e-router-plan", "router", "plan", "plan", "进入规划"),
      edge("e-router-execute", "router", "execute", "execute", "直接执行"),
      edge("e-router-check", "router", "check", "check", "直接检查"),
      edge("e-plan-execute", "plan", "execute", "always", "规划完成"),
      edge("e-execute-check", "execute", "check", "always", "提交检查"),
      edge("e-check-end", "check", "end", "pass", "通过"),
      edge("e-check-execute", "check", "execute", "fail", "返工"),
    ],
  }
}
