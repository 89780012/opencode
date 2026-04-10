import type { WorkflowDetail, WorkflowItem, WorkflowKind } from "@/types/workflow"
import { makeNode } from "@/types/workflow"

const now = Date.now()

const list: WorkflowDetail[] = [
  {
    id: "strategy-agent-demo",
    name: "Strategy Workflow Demo",
    desc: "Intent -> planning -> execution -> review, fully driven by the smartx workflow tool contract.",
    status: "ready",
    updated_at: now - 1000 * 60 * 18,
    tags: ["intent", "plan", "strategy", "js-strategy", "python-strategy", "docs"],
    count: 10,
    nodes: [
      makeNode("start", "n-start", { x: 80, y: 220 }),
      makeNode("intent", "n-intent", { x: 320, y: 220 }, { title: "intent", agent: "intent" }),
      makeNode("plan", "n-plan", { x: 580, y: 60 }, { title: "plan", agent: "smartx-plan" }),
      makeNode("build", "n-build", { x: 580, y: 220 }, { title: "build", agent: "build" }),
      makeNode("build", "n-strategy", { x: 860, y: 220 }, { title: "strategy", agent: "strategy" }),
      makeNode("build", "n-js", { x: 1140, y: 80 }, { title: "js-strategy", agent: "js-strategy" }),
      makeNode("build", "n-python", { x: 1140, y: 240 }, { title: "python-strategy", agent: "python-strategy" }),
      makeNode("build", "n-docs", { x: 1400, y: 220 }, { title: "docs", agent: "docs" }),
      makeNode("review", "n-review", { x: 1660, y: 220 }, { title: "checker", agent: "checker" }),
      makeNode("end", "n-end", { x: 1920, y: 220 }),
    ],
    edges: [
      {
        id: "e-start-intent",
        source: "n-start",
        target: "n-intent",
        animated: false,
        data: { cond: "always" },
        label: "",
      },
      {
        id: "e-intent-plan",
        source: "n-intent",
        target: "n-plan",
        animated: false,
        data: { cond: "plan" },
        label: "Plan first",
      },
      {
        id: "e-intent-build",
        source: "n-intent",
        target: "n-build",
        animated: false,
        data: { cond: "build" },
        label: "Build directly",
      },
      {
        id: "e-intent-review",
        source: "n-intent",
        target: "n-review",
        animated: false,
        data: { cond: "checker" },
        label: "Check first",
      },
      {
        id: "e-plan-build",
        source: "n-plan",
        target: "n-build",
        animated: false,
        data: { cond: "always" },
        label: "Plan to build",
      },
      {
        id: "e-build-strategy",
        source: "n-build",
        target: "n-strategy",
        animated: false,
        data: { cond: "always" },
        label: "Main strategy",
      },
      {
        id: "e-strategy-js",
        source: "n-strategy",
        target: "n-js",
        animated: false,
        data: { cond: "always" },
        label: "JS slice",
      },
      {
        id: "e-js-python",
        source: "n-js",
        target: "n-python",
        animated: false,
        data: { cond: "always" },
        label: "Python slice",
      },
      {
        id: "e-python-docs",
        source: "n-python",
        target: "n-docs",
        animated: false,
        data: { cond: "always" },
        label: "Docs",
      },
      {
        id: "e-docs-review",
        source: "n-docs",
        target: "n-review",
        animated: false,
        data: { cond: "always" },
        label: "Submit review",
      },
      {
        id: "e-review-end",
        source: "n-review",
        target: "n-end",
        animated: false,
        data: { cond: "pass" },
        label: "Pass",
      },
      {
        id: "e-review-build",
        source: "n-review",
        target: "n-build",
        animated: false,
        data: { cond: "fail" },
        label: "Retry",
      },
    ],
  },
]

export const workflowList: WorkflowItem[] = list.map((item) => ({
  id: item.id,
  name: item.name,
  desc: item.desc,
  status: item.status,
  updated_at: item.updated_at,
  tags: item.tags,
  count: item.count,
}))

export const workflowMap = new Map(list.map((item) => [item.id, item]))

export const workflowLibrary: {
  title: string
  items: { kind: WorkflowKind; title: string; desc: string }[]
}[] = [
  {
    title: "Flow Control",
    items: [
      { kind: "start", title: "Start", desc: "Workflow entry." },
      { kind: "end", title: "End", desc: "Workflow exit." },
      { kind: "judge", title: "Judge", desc: "Drive pass/fail branching through tool output." },
    ],
  },
  {
    title: "Execution Agents",
    items: [
      { kind: "intent", title: "intent", desc: "Route the request to planning, execution, or checking." },
      { kind: "build", title: "build", desc: "Generic execution node." },
      { kind: "build", title: "strategy", desc: "Primary strategy execution agent." },
      { kind: "build", title: "js-strategy", desc: "JavaScript focused execution agent." },
      { kind: "build", title: "python-strategy", desc: "Python focused execution agent." },
      { kind: "build", title: "docs", desc: "Documentation handoff node." },
    ],
  },
  {
    title: "Planning Agents",
    items: [{ kind: "plan", title: "plan", desc: "Planning node that emits structured tool output." }],
  },
  {
    title: "Review Agents",
    items: [{ kind: "review", title: "checker", desc: "Structured checker that returns pass or fail." }],
  },
]

export function getWorkflow(id: string) {
  return workflowMap.get(id) ?? null
}
