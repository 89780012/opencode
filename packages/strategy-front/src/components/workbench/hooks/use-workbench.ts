import { useMemo, useState } from "react"
import { modelChainApi } from "@/api/modules"
import { toast } from "sonner"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setActive, setReview, setStage } from "@/store/workbench-slice"
import { code, createBacktest, createTimeline, type FlowStatus, type ReviewStatus, type SessionItem, type StepStatus } from "../data"

function status(state?: string): ReviewStatus {
  if (state === "running") return "running"
  if (state === "passed") return "passed"
  if (state === "failed" || state === "error") return "failed"
  return "idle"
}

function step(state: string): StepStatus {
  if (state === "running") return "running"
  if (state === "passed") return "done"
  if (state === "failed" || state === "warning" || state === "error") return "error"
  return "pending"
}

function stamp(value?: number) {
  if (!value) return ""
  return new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

function prompt() {
  return "审查"
}

function empty(): SessionItem {
  return {
    id: "",
    name: "",
    currentRequirement: "",
    analyzedRequirements: [],
    codeContent: code,
    messages: [],
    reviewStatus: "idle",
    reviewRound: 0,
    reviewView: "current",
    reviewHistory: [],
    reviewProgress: null,
    flowchartStatus: "idle",
    flowchartCode: "",
    backtestStatus: "idle",
    backtestResults: null,
    backtestHistory: [],
    timelineEvents: [],
  }
}

export function useWorkbench(setRight?: (open: boolean) => void) {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const [view, setView] = useState<"current" | "history">("current")
  const flow = state.flowchart?.workspacePath === state.sessionPath ? state.flowchart : null
  const row = state.review?.workspacePath === state.sessionPath ? state.review : null
  const cur = useMemo<SessionItem>(() => {
    const session = state.sessions.find((item) => item.id === state.active) ?? state.sessions[0]
    if (!session) return empty()
    const reqs = session.requirements
    const reviewStatus = status(row?.state)
    const steps =
      row?.items.map((item) => ({
        text: item.name || item.detail,
        status: step(item.status),
        detail: item.detail,
        suggestion: item.suggestion,
      })) ?? []
    const back = createBacktest()
    return {
      ...empty(),
      id: session.id,
      name: session.title,
      currentRequirement: reqs[0] ?? "",
      analyzedRequirements: reqs,
      messages: [{ role: "ai", body: `Session "${session.title}" is ready.` }],
      reviewStatus,
      reviewRound: row ? 1 : 0,
      reviewView: view,
      reviewHistory: row
        ? [
            {
              round: 1,
              status: reviewStatus,
              time: stamp(row.updatedAt),
              steps,
              suggestions: [row.summary, ...row.suggestions].filter((item) => item),
            },
          ]
        : [],
      reviewProgress: row?.state === "running" ? steps : null,
      flowchartStatus:
        flow?.state === "generating" ? "generating" : flow?.state === "done" && flow.code ? "done" : ("idle" as FlowStatus),
      flowchartCode: flow?.state === "done" ? flow.code : "",
      backtestStatus: "done",
      backtestResults: back,
      backtestHistory: [{ time: "09:45", results: back }],
      timelineEvents: createTimeline(session.title),
    }
  }, [flow, row, state.active, state.sessions, view])
  const last = cur.reviewHistory.at(-1) ?? null
  const risk = useMemo(() => {
    if (cur.reviewStatus === "passed") return "审查已通过"
    if (cur.reviewStatus === "failed") return "审查未通过，需要修复"
    if (cur.reviewStatus === "running") return "审查进行中"
    return "代码等待审查"
  }, [cur.reviewStatus])
  const hint = useMemo(() => {
    const list = [risk]
    if (cur.flowchartStatus === "done") list.push("流程图已生成")
    if (cur.backtestStatus === "done" && cur.backtestResults) list.push(`回测收益 ${cur.backtestResults.totalReturn}`)
    return list.join(" / ")
  }, [cur.backtestResults, cur.backtestStatus, cur.flowchartStatus, risk])

  const review = async () => {
    setRight?.(true)
    if (!state.sessionPath || !state.active) {
      toast.error("请先创建或选择一个会话")
      return
    }
    dispatch(
      setReview({
        workspacePath: state.sessionPath,
        review: {
          workspacePath: state.sessionPath,
          worktreePath: state.sessionPath,
          state: "running",
          summary: "审查请求已提交，正在等待 strategy-reviewer 返回结果。",
          items: [{ name: "审查任务", status: "running", detail: "正在启动审查子 agent。", suggestion: "" }],
          suggestions: [],
          updatedAt: Date.now(),
        },
      }),
    )
    try {
      await modelChainApi.sendPrompt({
        workspacePath: state.sessionPath,
        sessionId: state.active,
        parts: [{ type: "text", text: prompt() }],
      })
    } catch {
      toast.error("提交审查失败")
    }
  }

  const backtest = async () => {
    dispatch(setStage("backtest"))
  }

  return {
    active: state.active,
    stage: state.stage,
    flow,
    cur,
    last,
    risk,
    hint,
    setActive: (id: string) => dispatch(setActive(id)),
    review,
    backtest,
    show: () => dispatch(setStage("backtest")),
    view: () => setView((item) => (item === "current" ? "history" : "current")),
  }
}
