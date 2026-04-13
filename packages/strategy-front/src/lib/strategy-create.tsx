import { Code2, Cpu, FileText, Target } from "lucide-react"
import type { ReactNode } from "react"
import { buildStrategyPrompt, buildTemplatePrompt, createGuide, type Guide, type StrategyType } from "@/lib/strategy-guide"

export type Card = {
  title: string
  desc: string
  template: string
  icon: ReactNode
  root: string
}

export type Draft = {
  kind: StrategyType
  step: number
  panel: (typeof picks.panels)[number]
  name: string
  tail: string
  guide: Guide
  brief: string
  prompt: string
  busy: boolean
}

/**
 * 创建策略时的可选标签常量，统一集中管理。
 */
export const picks = {
  kinds: ["趋势", "均值回归", "突破", "轮动", "网格", "配对", "事件驱动", "自定义"],
  markets: ["股票", "ETF", "期货", "外汇", "加密"],
  pools: ["全市场", "沪深 300", "中证 500", "创业板", "ETF 池", "自选池"],
  tfs: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"],
  sides: ["做多", "做空", "双向"],
  holds: ["日内", "隔夜", "波段", "中长线"],
  sources: ["价格行为", "成交量", "技术指标", "多因子", "基本面", "盘口结构"],
  factors: ["MA", "EMA", "MACD", "RSI", "KDJ", "Bollinger", "ATR", "VWAP", "Donchian", "ADX"],
  filters: ["成交量过滤", "波动率过滤", "大盘趋势过滤", "时间窗口过滤", "财报日过滤", "流动性过滤"],
  entries: ["均线金叉", "突破近期高点", "RSI 超卖反弹", "放量确认", "多条件共振", "回踩支撑入场"],
  exits: ["固定止盈", "固定止损", "移动止损", "反向信号离场", "跌破慢线离场", "持仓超时退出"],
  risks: ["控制回撤", "明确止损", "仓位管理", "减少频繁交易", "限制单日亏损", "限制连亏"],
  stops: ["固定止损", "移动止损", "分批止盈", "时间止损", "盈亏比约束"],
  poses: ["固定资金仓位", "固定风险仓位", "波动率仓位", "分批建仓", "金字塔加仓"],
  limits: ["手续费", "滑点", "股票 T+1", "涨跌停约束", "最小成交量", "避免集合竞价"],
  outputs: ["策略说明", "可执行代码", "回测建议", "参数优化建议", "风险说明", "README", "代码注释"],
  styles: ["保守", "平衡", "激进"],
  steps: ["类型", "配置", "确认"],
  panels: ["market", "logic", "risk", "output"] as const,
}

/**
 * 不同策略模板的展示信息。
 */
export const cards: Record<StrategyType, Card> = {
  smartx: {
    title: "SmartX 策略",
    desc: "适合直接落地成可运行策略工程。",
    template: "smartx_plugin_python",
    icon: <Target className="size-4" />,
    root: "~/.xtp-smart/plugins",
  },
  python: {
    title: "Python 策略",
    desc: "适合研究、回测与快速迭代，不依赖 SmartX。",
    template: "python_basic",
    icon: <Cpu className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
  js: {
    title: "JS 策略",
    desc: "适合脚手架、信号实验与服务集成，不依赖 SmartX。",
    template: "js_basic",
    icon: <Code2 className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
  other: {
    title: "其他",
    desc: "空白项目目录",
    template: "other_basic",
    icon: <FileText className="size-4" />,
    root: "~/.strategy-service/workspaces",
  },
}

/**
 * 切换多选标签的选中状态。
 */
export function flip(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * 生成简短随机后缀，避免目录重名。
 */
export function tail() {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * 将多选项整理成摘要文案。
 */
export function text(list: string[]) {
  return list.length > 0 ? list.join(" / ") : "-"
}

/**
 * 返回创建弹窗的默认本地状态。
 */
export function seed(): Draft {
  return {
    kind: "smartx" as StrategyType,
    step: 0,
    panel: picks.panels[0],
    name: "",
    tail: tail(),
    guide: createGuide(),
    brief: "",
    prompt: "",
    busy: false,
  }
}

/**
 * 按策略类型生成首条引导消息。
 */
export function prompt(input: { kind: StrategyType; name: string; guide: Guide; brief: string }) {
  if (input.kind === "other") {
    return input.brief.trim() ? `补充说明：${input.brief.trim()}` : ""
  }

  if (input.kind === "smartx") {
    const base = buildStrategyPrompt({ name: input.name, guide: input.guide, type: "smartx" })
    return input.brief.trim() ? `${base}\n额外要求：${input.brief.trim()}` : base
  }

  return buildTemplatePrompt({
    name: input.name,
    type: input.kind,
    guide: input.guide,
    brief: input.brief,
  })
}
