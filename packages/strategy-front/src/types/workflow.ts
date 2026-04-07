import type { Edge, Node, XYPosition } from "@xyflow/react"

export type WorkflowKind = "placeholder" | "finance" | "source"

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

export type WorkflowSeed = {
  key: string
  kind: WorkflowKind
}

export function makeNode(kind: WorkflowKind, id: string, pos: XYPosition): WorkflowFlowNode {
  if (kind === "finance") {
    return {
      id,
      type: "workflow",
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title: "财务数据",
        desc: "获取财务报表及字段数据",
        tone: "blue",
        fields: [
          { kind: "select", label: "股票池", value: "全部A股", options: ["全部A股", "沪深300", "中证500"] },
          { kind: "select", label: "报表类型", value: "所有报表", options: ["所有报表", "利润表", "资产负债表", "现金流量表"] },
          { kind: "select", label: "报告期", value: "所有季度", options: ["所有季度", "年报", "中报", "一季报", "三季报"] },
          { kind: "range", label: "年份区间", from: "2021", to: "2026" },
          {
            kind: "select",
            label: "调整类型",
            value: "TTM(滚动12个月)",
            options: ["TTM(滚动12个月)", "原始值", "同比", "环比"],
          },
          {
            kind: "checks",
            label: "数据字段",
            items: [
              { label: "营业收入", checked: true },
              { label: "营业成本" },
              { label: "毛利润" },
              { label: "营业利润" },
              { label: "净利润", checked: true },
              { label: "每股收益", checked: true },
            ],
          },
        ],
      },
    }
  }

  if (kind === "source") {
    return {
      id,
      type: "workflow",
      dragHandle: ".workflow-drag",
      position: pos,
      data: {
        kind,
        title: "日线数据",
        desc: "获取历史日 K 线数据",
        tone: "amber",
        fields: [
          { kind: "select", label: "数据源", value: "历史行情", options: ["历史行情", "前复权行情", "后复权行情"] },
          { kind: "select", label: "频率", value: "1D", options: ["1D", "1W", "1M"] },
          { kind: "note", label: "说明", value: "适合基础回测与区间指标计算" },
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
      title: "未实现组件",
      desc: "这部分组件稍后再补完整逻辑",
      tone: "slate",
      fields: [{ kind: "note", label: "组件ID", value: "未知" }],
    },
  }
}
