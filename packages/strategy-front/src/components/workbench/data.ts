import type { BacktestRun } from "@/types/backtest"

export type Role = "ai" | "user"
export type Stage = "session" | "flowchart" | "code" | "backtest" | "timeline"
export type SidebarTab = "requirements" | "sessions"
export type ReviewStatus = "idle" | "running" | "passed" | "failed"
export type FlowStatus = "idle" | "generating" | "done"
export type BacktestStatus = "idle" | BacktestRun["status"]
export type StepStatus = "pending" | "running" | "done" | "error"
export type EventType = "requirement" | "code" | "git" | "review" | "flowchart" | "backtest"

export interface Msg {
  role: Role
  body: string
}

export interface Step {
  text: string
  status: StepStatus
  detail?: string
  suggestion?: string
}

export interface ReviewRecord {
  id: string
  round: number
  status: ReviewStatus
  time: string
  steps: Step[]
  suggestions: string[]
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
  backtestRun: BacktestRun | null
  backtestResults: BacktestRun | null
  backtestHistory: BacktestRun[]
  timelineEvents: TimelineEvent[]
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

export function createTimeline(name: string): TimelineEvent[] {
  return [
    {
      id: "evt-req-1",
      type: "requirement",
      label: "需求理解",
      time: "2026-05-27 09:20",
      description: `确认「${name}」的核心需求与约束边界。`,
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

export function createFlowchart() {
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
