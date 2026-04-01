export type Guide = {
  kind: string
  market: string
  tf: string
  side: string
  target: string
  risk: string[]
  style: string
  output: string[]
  note: string
}

export type GroupMode = "split" | "parallel"

export function createGuide(): Guide {
  return {
    kind: "趋势",
    market: "加密",
    tf: "5m",
    side: "双向",
    target: "先给出思路，再产出代码",
    risk: ["控制回撤", "明确止损"],
    style: "平衡",
    output: ["策略说明", "可执行代码", "回测建议"],
    note: "",
  }
}

function text(list: string[]) {
  return list.length > 0 ? list.join("、") : "无特别要求"
}

export function buildStrategyPrompt(input: { name: string; guide: Guide; role?: string; peers?: string[] }) {
  const role = input.role ? `你当前负责的角色是：${input.role}。` : ""
  const peers = input.peers && input.peers.length > 0 ? `如果有并行策略，请注意和这些方向形成区分：${input.peers.join("、")}。` : ""
  return [
    `请帮我开发一个策略，工作区名称是「${input.name}」。`,
    role,
    `策略类型：${input.guide.kind}。`,
    `市场品种：${input.guide.market}。`,
    `交易周期：${input.guide.tf}。`,
    `交易方向：${input.guide.side}。`,
    `核心目标：${input.guide.target}。`,
    `风控重点：${text(input.guide.risk)}。`,
    `开发风格：${input.guide.style}。`,
    `输出要求：${text(input.guide.output)}。`,
    peers,
    input.guide.note ? `补充说明：${input.guide.note}` : "",
    "请先输出策略思路和实现计划，再开始编写代码文件；在实现过程中说明每一步为什么这样设计，并给出后续优化建议。",
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildGroupRoles(mode: GroupMode, count: number) {
  const split = ["主策略开发", "风控与止盈止损", "信号过滤与优化"]
  const parallel = ["趋势突破方案", "均值回归方案", "动量确认方案"]
  const list = mode === "split" ? split : parallel
  return list.slice(0, count)
}
