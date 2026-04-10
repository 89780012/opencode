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
  text?: string,
  tool?: string,
  aid?: string,
): WorkflowRuntimeNode {
  return {
    id,
    kind,
    title,
    agent: aid || agent(kind),
    tool_id: tool ?? kindTool(kind),
    x,
    y,
    skills: [],
    prompt: text || prompt(kind),
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
      node("start", "start", 80, 220, "Start"),
      node("intent", "intent", 320, 220, "intent", undefined, undefined, "intent"),
      node("plan", "plan", 580, 60, "plan", undefined, undefined, "smartx-plan"),
      node("build", "build", 580, 220, "build"),
      node("strategy", "build", 860, 220, "strategy", undefined, undefined, "strategy"),
      node("js", "build", 1140, 80, "js-strategy", undefined, undefined, "js-strategy"),
      node("python", "build", 1140, 240, "python-strategy", undefined, undefined, "python-strategy"),
      node("docs", "build", 1400, 220, "docs", undefined, undefined, "strategy"),
      node("review", "review", 1660, 220, "checker", undefined, undefined, "checker"),
      node("end", "end", 1920, 220, "End"),
    ],
    edges: [
      edge("e-start-intent", "start", "intent", "always"),
      edge("e-intent-plan", "intent", "plan", "plan", "Plan first"),
      edge("e-intent-build", "intent", "build", "build", "Build directly"),
      edge("e-intent-review", "intent", "review", "checker", "Check first"),
      edge("e-plan-build", "plan", "build", "always", "Plan to build"),
      edge("e-build-strategy", "build", "strategy", "always", "Main strategy"),
      edge("e-strategy-js", "strategy", "js", "always", "JS slice"),
      edge("e-js-python", "js", "python", "always", "Python slice"),
      edge("e-python-docs", "python", "docs", "always", "Docs"),
      edge("e-docs-review", "docs", "review", "always", "Submit review"),
      edge("e-review-end", "review", "end", "pass", "Pass"),
      edge("e-review-build", "review", "build", "fail", "Retry"),
    ],
  }
}
