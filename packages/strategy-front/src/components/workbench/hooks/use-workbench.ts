import { useMemo, useState } from "react"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setActive, setStage } from "@/store/workbench-slice"
import { code, createBacktest, createReviewSteps, createTimeline, type FlowStatus, type SessionItem } from "../data"

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
  const cur = useMemo<SessionItem>(() => {
    const session = state.sessions.find((item) => item.id === state.active) ?? state.sessions[0]
    if (!session) return empty()
    const reqs = state.requirements.length ? state.requirements : []
    const steps = createReviewSteps().map((item, idx) => ({
      ...item,
      status: idx === 3 || idx === 4 ? ("error" as const) : ("done" as const),
    }))
    const back = createBacktest()
    return {
      ...empty(),
      id: session.id,
      name: session.title,
      currentRequirement: reqs[0] ?? "",
      analyzedRequirements: reqs,
      messages: [{ role: "ai", body: `Session "${session.title}" is ready.` }],
      reviewStatus: "failed",
      reviewRound: 1,
      reviewView: view,
      reviewHistory: [
        {
          round: 1,
          status: "failed",
          time: "09:30",
          steps,
          suggestions: ["Check empty positions", "Add max drawdown guard", "Fix edge cases"],
        },
      ],
      flowchartStatus:
        flow?.state === "generating" ? "generating" : flow?.state === "done" && flow.code ? "done" : ("idle" as FlowStatus),
      flowchartCode: flow?.state === "done" ? flow.code : "",
      backtestStatus: "done",
      backtestResults: back,
      backtestHistory: [{ time: "09:45", results: back }],
      timelineEvents: createTimeline(session.title),
    }
  }, [flow, state.active, state.requirements, state.sessions, view])
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
  }

  const backtest = async () => {
    dispatch(setStage("backtest"))
  }

  return {
    active: state.active,
    stage: state.stage,
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
