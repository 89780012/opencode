import type { WorkflowDetail, WorkflowItem, WorkflowKind } from "@/types/workflow"
import { makeNode } from "@/types/workflow"

const now = Date.now()

const list: WorkflowDetail[] = [
  {
    id: "financial-report",
    name: "财报拉取 Demo",
    desc: "模拟数据源与表单型节点编排，用来验证画布、节点和工具条布局。",
    status: "draft",
    updated_at: now - 1000 * 60 * 18,
    tags: ["数据源", "财务", "Demo"],
    count: 2,
    nodes: [
      makeNode("placeholder", "n-1", { x: 120, y: 180 }),
      makeNode("finance", "n-2", { x: 470, y: 150 }),
    ],
    edges: [{ id: "e-1", source: "n-1", target: "n-2", animated: false }],
  },
  {
    id: "daily-source",
    name: "行情拼装 Demo",
    desc: "用组件库里的数据源节点拼出一条简单数据流。",
    status: "ready",
    updated_at: now - 1000 * 60 * 65,
    tags: ["行情", "表单节点"],
    count: 3,
    nodes: [
      makeNode("source", "n-3", { x: 80, y: 160 }),
      makeNode("finance", "n-4", { x: 420, y: 120 }),
      makeNode("placeholder", "n-5", { x: 820, y: 160 }),
    ],
    edges: [
      { id: "e-2", source: "n-3", target: "n-4" },
      { id: "e-3", source: "n-4", target: "n-5" },
    ],
  },
  {
    id: "alpha-board",
    name: "Alpha 看板 Demo",
    desc: "展示组件库分类、节点插入和 minimap 的视觉效果。",
    status: "draft",
    updated_at: now - 1000 * 60 * 60 * 4,
    tags: ["策略", "看板"],
    count: 2,
    nodes: [
      makeNode("source", "n-6", { x: 120, y: 140 }),
      makeNode("placeholder", "n-7", { x: 520, y: 180 }),
    ],
    edges: [{ id: "e-4", source: "n-6", target: "n-7" }],
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
    title: "数据源",
    items: [
      { kind: "source", title: "日线数据", desc: "获取历史日 K 线数据" },
      { kind: "finance", title: "财务数据", desc: "获取资产负债表、利润表等字段" },
    ],
  },
  {
    title: "处理中",
    items: [{ kind: "placeholder", title: "未实现组件", desc: "占位节点，用于串联后续流程" }],
  },
]

export function getWorkflow(id: string) {
  return workflowMap.get(id) ?? null
}
