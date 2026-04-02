export type Guide = {
  kind: string
  market: string
  pool: string
  tf: string
  side: string
  hold: string
  target: string
  source: string[]
  factor: string[]
  filter: string[]
  entry: string[]
  exit: string[]
  risk: string[]
  stop: string[]
  pos: string
  limit: string[]
  style: string
  output: string[]
  note: string
}

export type GroupMode = "split" | "parallel"
export type StrategyType = "smartx" | "python" | "js" | "other"

export function createGuide(): Guide {
  return {
    kind: "趋势",
    market: "股票",
    pool: "全市场",
    tf: "1d",
    side: "做多",
    hold: "波段",
    target: "先给出清晰的策略框架，再落地为可回测代码",
    source: ["技术指标", "价格行为"],
    factor: ["MA", "MACD", "RSI"],
    filter: ["成交量过滤", "大盘趋势过滤"],
    entry: ["均线金叉", "突破近期高点"],
    exit: ["固定止盈", "跌破慢线离场"],
    risk: ["控制回撤", "仓位管理", "减少频繁交易"],
    stop: ["固定止损", "移动止损"],
    pos: "固定风险仓位",
    limit: ["手续费", "滑点", "股票 T+1", "涨跌停约束"],
    style: "平衡",
    output: ["策略说明", "可执行代码", "回测建议", "参数优化建议"],
    note: "",
  }
}

function text(list: string[]) {
  return list.length > 0 ? list.join("、") : "无特别要求"
}

function lines(guide: Guide) {
  return [
    `策略类型：${guide.kind}。`,
    `市场品种：${guide.market}。`,
    `标的范围：${guide.pool}。`,
    `交易周期：${guide.tf}。`,
    `交易方向：${guide.side}。`,
    `持仓周期：${guide.hold}。`,
    `核心目标：${guide.target}。`,
    `信号来源：${text(guide.source)}。`,
    `指标或因子：${text(guide.factor)}。`,
    `过滤条件：${text(guide.filter)}。`,
    `入场规则：${text(guide.entry)}。`,
    `出场规则：${text(guide.exit)}。`,
    `风控重点：${text(guide.risk)}。`,
    `止盈止损：${text(guide.stop)}。`,
    `仓位方式：${guide.pos}。`,
    `交易约束：${text(guide.limit)}。`,
    `开发风格：${guide.style}。`,
    `输出要求：${text(guide.output)}。`,
  ]
}

export function buildStrategyPrompt(input: { name: string; guide: Guide; type?: StrategyType; role?: string; peers?: string[] }) {
  const role = input.role ? `你当前负责的角色是：${input.role}。` : ""
  const peers = input.peers && input.peers.length > 0 ? `如果有并行策略，请注意和这些方向形成区分：${input.peers.join("、")}。` : ""
  const type =
    input.type === "python"
      ? "请基于 Python 模板组织目录，优先拆分指标、信号、风控和回测入口。"
      : input.type === "js"
        ? "请基于 JavaScript 模板组织目录，优先拆分指标、信号、风控和回测入口。"
        : input.type === "other"
          ? "请先整理需求说明和目录结构，再按需要补充文件。"
          : "请优先按 SmartX 策略工程的方式组织实现。"

  return [
    `请帮我开发一个策略，工作区名称是《${input.name}》。`,
    role,
    ...lines(input.guide),
    peers,
    type,
    input.guide.note ? `补充说明：${input.guide.note}` : "",
    "请先输出策略思路、模块划分、关键参数和回测口径，再开始编写代码文件。",
    "实现时请明确说明指标计算、信号触发、仓位管理、止盈止损和交易约束为何这样设计。",
    "如果策略适合股票市场，请默认考虑手续费、滑点、T+1、涨跌停和流动性影响。",
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildTemplatePrompt(input: {
  name: string
  type: Exclude<StrategyType, "other">
  guide: Guide
  brief?: string
}) {
  return [
    buildStrategyPrompt({ name: input.name, guide: input.guide, type: input.type }),
    input.brief?.trim() ? `额外要求：${input.brief.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildGroupRoles(mode: GroupMode, count: number) {
  const split = ["主策略开发", "风控与仓位", "信号过滤与优化"]
  const parallel = ["趋势突破方案", "均值回归方案", "动量确认方案"]
  const list = mode === "split" ? split : parallel
  return list.slice(0, count)
}
