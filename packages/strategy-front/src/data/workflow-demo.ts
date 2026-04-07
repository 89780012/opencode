import type { WorkflowDetail, WorkflowItem, WorkflowKind } from "@/types/workflow"
import { makeNode } from "@/types/workflow"

const now = Date.now()

const list: WorkflowDetail[] = [
  {
    id: "plan-build-review",
    name: "Plan Build Review",
    desc: "A starter workflow that plans, builds, and reviews in one workspace.",
    status: "ready",
    updated_at: now - 1000 * 60 * 18,
    tags: ["plan", "build", "review"],
    count: 3,
    nodes: [
      makeNode("plan", "n-1", { x: 120, y: 180 }),
      makeNode("build", "n-2", { x: 470, y: 150 }),
      makeNode("review", "n-3", { x: 820, y: 180 }),
    ],
    edges: [
      { id: "e-1", source: "n-1", target: "n-2", animated: false },
      { id: "e-2", source: "n-2", target: "n-3", animated: false },
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
    title: "Core",
    items: [
      { kind: "plan", title: "Plan", desc: "Break the request into a concrete implementation plan." },
      { kind: "build", title: "Build", desc: "Implement or revise code in the workspace." },
      { kind: "review", title: "Review", desc: "Review current code and emit structured feedback." },
    ],
  },
  {
    title: "Control",
    items: [{ kind: "gate", title: "Gate", desc: "Pause for a manual decision before continuing." }],
  },
]

export function getWorkflow(id: string) {
  return workflowMap.get(id) ?? null
}
