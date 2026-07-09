import { useMemo, useState } from "react"
import { backtestApi, modelChainApi } from "@/api/modules"
import { toast } from "sonner"
import { selectWorkbench, selectWorkbenchBacktests, selectWorkbenchProgress, useAppDispatch, useAppSelector } from "@/store"
import { setActive, setBacktestActive, setStage, upsertBacktest } from "@/store/workbench-slice"
import { code, createTimeline, type FlowStatus, type ReviewStatus, type SessionItem, type StepStatus, type TimelineEvent } from "../data"
import { useWorkbenchProgressSync } from "./use-workbench-progress"
import type { BacktestConfig } from "@/types/backtest"

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

function plugin(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1)?.replace(/-local$/, "") ?? ""
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

function map(event: ReturnType<typeof selectWorkbenchProgress>[number]): TimelineEvent {
  const type =
    event.kind.includes("analysis") || event.kind.includes("requirements")
      ? "requirement"
      : event.kind.includes("flowchart")
        ? "flowchart"
        : event.kind.includes("review")
          ? "review"
          : event.kind.includes("state") || event.kind.includes("session")
            ? "git"
            : "code"
  return {
    id: event.id,
    type,
    label: event.title || event.kind,
    time: new Date(event.createdAt).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    description: event.detail || event.kind,
    diffSummary: event.detail || undefined,
  }
}

export function useWorkbench(setRight?: (open: boolean) => void) {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  useWorkbenchProgressSync(state.sessionPath, state.active)
  const prog = useAppSelector((item) => selectWorkbenchProgress(item, state.sessionPath, state.active))
  const runs = useAppSelector((item) => selectWorkbenchBacktests(item, state.sessionPath, state.active))
  const [view, setView] = useState<"current" | "history">("current")
  const [reviewing, setReviewing] = useState(false)
  const [testing, setTesting] = useState(false)
  const flow = state.flowchart?.workspacePath === state.sessionPath ? state.flowchart : null
  const rows = useMemo(
    () => (state.reviewPath === state.sessionPath ? state.reviews : []).slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [state.reviewPath, state.reviews, state.sessionPath],
  )
  const row = rows[0] ?? null
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
    const hist = rows
      .slice()
      .reverse()
      .map((item, idx) => ({
        id: item.id,
        round: idx + 1,
        status: status(item.state),
        time: stamp(item.updatedAt),
        steps: item.items.map((part) => ({
          text: part.name || part.detail,
          status: step(part.status),
          detail: part.detail,
          suggestion: part.suggestion,
        })),
        suggestions: [item.summary, ...item.suggestions].filter((tip) => tip),
      }))
    const back = runs.find((item) => item.id === state.backtestActive) ?? runs[0] ?? null
    return {
      ...empty(),
      id: session.id,
      name: session.title,
      currentRequirement: reqs[0] ?? "",
      analyzedRequirements: reqs,
      messages: [{ role: "ai", body: `Session "${session.title}" is ready.` }],
      reviewStatus,
      reviewRound: hist.length,
      reviewView: view,
      reviewHistory: hist,
      reviewProgress: row?.state === "running" ? steps : null,
      flowchartStatus:
        flow?.state === "generating" ? "generating" : flow?.state === "done" && flow.code ? "done" : ("idle" as FlowStatus),
      flowchartCode: flow?.state === "done" ? flow.code : "",
      backtestStatus: back?.status === "pending" || back?.status === "running" ? "running" : back ? "done" : "idle",
      backtestResults: back,
      backtestHistory: runs,
      timelineEvents: prog.length > 0 ? prog.map(map) : createTimeline(session.title),
    }
  }, [flow, prog, row, rows, runs, state.active, state.backtestActive, state.sessions, view])
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
    if (cur.backtestStatus === "done" && cur.backtestResults) list.push("回测已完成")
    return list.join(" / ")
  }, [cur.backtestResults, cur.backtestStatus, cur.flowchartStatus, risk])

  const review = async () => {
    setRight?.(true)
    if (reviewing) return
    if (!state.sessionPath || !state.active) {
      toast.error("请先创建或选择一个会话")
      return
    }
    setReviewing(true)
    try {
      await modelChainApi.sendPrompt({
        workspacePath: state.sessionPath,
        sessionId: state.active,
        parts: [{ type: "text", text: "审查" }],
      })
    } catch {
      toast.error("提交审查失败")
    } finally {
      setReviewing(false)
    }
  }

  const backtest = async (cfg?: BacktestConfig) => {
    dispatch(setStage("backtest"))
    if (testing) return
    if (!state.sessionPath || !state.active) {
      toast.error("请先创建或选择一个会话")
      return
    }
    setTesting(true)
    try {
      const run = await backtestApi.run({
        workspacePath: state.sessionPath,
        sessionId: state.active,
        pluginId: plugin(state.sessionPath),
        config: cfg,
      })
      dispatch(upsertBacktest({ workspacePath: state.sessionPath, run }))
      toast.success("回测已开始")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启动回测失败")
    } finally {
      setTesting(false)
    }
  }

  return {
    active: state.active,
    stage: state.stage,
    flow,
    cur,
    last,
    risk,
    hint,
    reviewing,
    testing,
    setActive: (id: string) => dispatch(setActive(id)),
    review,
    backtest,
    show: (id?: string) => {
      if (id) dispatch(setBacktestActive(id))
      dispatch(setStage("backtest"))
    },
    view: (next?: "current" | "history") => setView((item) => next ?? (item === "current" ? "history" : "current")),
  }
}
