export type Role = "ai" | "user"
export type Stage = "session" | "flowchart" | "backtest" | "timeline"
export type LeftView = "chat" | "code"
export type SidebarTab = "requirements" | "sessions"
export type ReviewStatus = "idle" | "running" | "passed" | "failed"
export type FlowStatus = "idle" | "generating" | "done"
export type BacktestStatus = "idle" | "running" | "done"
export type StepStatus = "pending" | "running" | "done" | "error"
export type EventType = "requirement" | "code" | "git" | "review" | "flowchart" | "backtest"

export interface Msg {
  role: Role
  body: string
}

export interface Step {
  text: string
  status: StepStatus
}

export interface ReviewRecord {
  round: number
  status: ReviewStatus
  time: string
  steps: Step[]
  suggestions: string[]
}

export interface BacktestResult {
  totalReturn: string
  sharpe: string
  maxDrawdown: string
  winRate: string
}

export interface BacktestRecord {
  time: string
  results: BacktestResult
}

export interface TimelineEvent {
  id: string
  type: EventType
  label: string
  time: string
  description: string
  commitHash?: string
  diffSummary?: string
}

export interface SessionItem {
  id: string
  name: string
  currentRequirement: string
  analyzedRequirements: string[]
  codeContent: string
  messages: Msg[]
  reviewStatus: ReviewStatus
  reviewRound: number
  reviewView: "current" | "history"
  reviewHistory: ReviewRecord[]
  reviewProgress: Step[] | null
  flowchartStatus: FlowStatus
  flowchartCode: string
  backtestStatus: BacktestStatus
  backtestResults: BacktestResult | null
  backtestHistory: BacktestRecord[]
  timelineEvents: TimelineEvent[]
  sections: Record<string, boolean>
}

export const code = `class DualMA:
  def on_bar(self, ctx):
    fast = ema(ctx.close, 5)
    slow = ema(ctx.close, 20)
    risk = ctx.cash * 0.12

    if not ctx.position and fast > slow:
      ctx.buy(size=risk / ctx.close)

    if ctx.position and ctx.pnl <= -0.02:
      ctx.close(reason="stop_loss")

    if ctx.position and ctx.pnl >= 0.05:
      ctx.close(reason="take_profit")`

export const prog = [
  { label: "需求确认", note: "已完成", tone: "done" },
  { label: "代码生成", note: "已完成", tone: "done" },
  { label: "代码审查", note: "待修复", tone: "run" },
  { label: "流程图生成", note: "已完成", tone: "done" },
  { label: "回测验证", note: "已完成", tone: "done" },
] as const

export function createReviewSteps() {
  return ["语法检查", "逻辑完整性", "止损 / 止盈", "风控规则", "边界条件", "代码规范"].map((text) => ({
    text,
    status: "pending" as StepStatus,
  }))
}

function createTimeline(name: string): TimelineEvent[] {
  return [
    {
      id: "evt-req-1",
      type: "requirement",
      label: "需求理解",
      time: "2026-05-27 09:20",
      description: `确认《${name}》的核心需求与约束边界。`,
    },
    {
      id: "evt-code-1",
      type: "code",
      label: "代码生成",
      time: "2026-05-27 09:55",
      description: "生成策略代码骨架 v1.0。",
    },
    {
      id: "evt-git-1",
      type: "git",
      label: "Git 提交",
      time: "2026-05-27 10:16",
      description: "初始提交：双均线策略骨架。",
      commitHash: "a7f3b2c",
      diffSummary: "新增 DualMAStrategy 类，包含 on_bar 逻辑和风控入口。",
    },
    {
      id: "evt-review-1",
      type: "review",
      label: "代码审查",
      time: "2026-05-27 11:10",
      description: "第 1 轮审查发现边界条件和风控顺序问题。",
    },
    {
      id: "evt-flow-1",
      type: "flowchart",
      label: "流程图",
      time: "2026-05-27 13:10",
      description: "生成策略流程图。",
    },
    {
      id: "evt-back-1",
      type: "backtest",
      label: "回测",
      time: "2026-05-27 14:02",
      description: "回测完成：收益 12.4%，夏普 1.18。",
    },
    {
      id: "evt-git-2",
      type: "git",
      label: "Git 提交",
      time: "2026-05-27 15:26",
      description: "修复风控判断顺序并补充空仓保护。",
      commitHash: "f2c91de",
      diffSummary: "调整止损判断顺序，补充 position 判空和连续信号过滤。",
    },
  ]
}

function createFlowchart() {
  return `flowchart TD
  A[读取行情] --> B{5EMA > 20EMA?}
  B -- 是 --> C[检查仓位与风险]
  C --> D[满足条件则开仓]
  B -- 否 --> E[空仓或继续等待]
  D --> F{PNL <= -2%?}
  F -- 是 --> G[止损]
  F -- 否 --> H{PNL >= 5%?}
  H -- 是 --> I[止盈]
  H -- 否 --> J[继续持有]`
}

export function createBacktest(): BacktestResult {
  return {
    totalReturn: "12.4%",
    sharpe: "1.18",
    maxDrawdown: "6.7%",
    winRate: "57.2%",
  }
}

export function createSessions(): SessionItem[] {
  return [
    {
      id: "sess-1",
      name: "趋势跟踪策略",
      currentRequirement: "双均线上穿买入，下穿卖出，并带固定止盈止损。",
      analyzedRequirements: [
        "双均线上穿开仓，下穿平仓，支持日线回测。",
        "固定 2% 止损和 5% 止盈，并附带仓位控制。",
        "输出代码、流程图、审查记录和回测结论。",
      ],
      codeContent: code,
      messages: [
        {
          role: "ai",
          body: "我已经根据你的要求生成了双均线策略骨架，并补上了止损、止盈和手续费入口。",
        },
        {
          role: "user",
          body: "把审查重点放在风控和边界条件上，回测阶段先保留日线数据。",
        },
        {
          role: "ai",
          body: "收到。我会优先检查仓位暴露、连续信号过滤，以及空仓状态下的止盈止损分支。",
        },
      ],
      reviewStatus: "idle",
      reviewRound: 1,
      reviewView: "current",
      reviewHistory: [
        {
          round: 1,
          status: "failed",
          time: "11:10",
          steps: [
            { text: "语法检查", status: "done" },
            { text: "逻辑完整性", status: "done" },
            { text: "止损 / 止盈", status: "done" },
            { text: "风控规则", status: "error" },
            { text: "边界条件", status: "error" },
            { text: "代码规范", status: "done" },
          ],
          suggestions: ["优先判断空仓状态", "补充最大回撤保护", "修复边界条件分支"],
        },
      ],
      reviewProgress: null,
      flowchartStatus: "done",
      flowchartCode: createFlowchart(),
      backtestStatus: "done",
      backtestResults: createBacktest(),
      backtestHistory: [
        {
          time: "09:42",
          results: createBacktest(),
        },
      ],
      timelineEvents: createTimeline("趋势跟踪策略"),
      sections: {
        sessions: true,
        issues: true,
        requirements: true,
        logic: true,
        progress: true,
        backtest: true,
      },
    },
    {
      id: "sess-2",
      name: "震荡突破策略",
      currentRequirement: "震荡区间突破开仓，结合成交量过滤与追踪止盈。",
      analyzedRequirements: ["突破近 20 根 K 线区间上沿时开仓。", "引入成交量放大过滤与移动止盈。"],
      codeContent: code,
      messages: [
        { role: "user", body: "这个策略在震荡行情里误触发有点多，帮我看看过滤逻辑。" },
        { role: "ai", body: "可以在突破确认前叠加量能阈值和二次确认，降低假突破。" },
      ],
      reviewStatus: "failed",
      reviewRound: 1,
      reviewView: "current",
      reviewHistory: [],
      reviewProgress: null,
      flowchartStatus: "idle",
      flowchartCode: createFlowchart(),
      backtestStatus: "idle",
      backtestResults: null,
      backtestHistory: [],
      timelineEvents: createTimeline("震荡突破策略"),
      sections: {
        sessions: true,
        issues: true,
        requirements: true,
        logic: true,
        progress: true,
        backtest: true,
      },
    },
    {
      id: "sess-3",
      name: "多因子选股策略",
      currentRequirement: "动量、质量、估值三因子组合评分，按周调仓。",
      analyzedRequirements: ["每周更新因子打分，输出持仓清单。", "控制单票权重与行业暴露。"],
      codeContent: code,
      messages: [{ role: "ai", body: "这个策略已归档，保留历史结果与配置供复用。" }],
      reviewStatus: "passed",
      reviewRound: 2,
      reviewView: "current",
      reviewHistory: [],
      reviewProgress: null,
      flowchartStatus: "done",
      flowchartCode: createFlowchart(),
      backtestStatus: "done",
      backtestResults: createBacktest(),
      backtestHistory: [],
      timelineEvents: createTimeline("多因子选股策略"),
      sections: {
        sessions: true,
        issues: true,
        requirements: true,
        logic: true,
        progress: true,
        backtest: true,
      },
    },
  ]
}
