import { useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { backtestApi, modelChainApi } from "@/api/modules"
import { ApiError } from "@/api/errors"
import { useSystem } from "@/components/system/system-provider"
import { activeBacktest, backtestKey, isBacktestRun } from "@/lib/backtest"
import { capture, settle, type Intake } from "@/lib/intake"
import { toast } from "sonner"
import {
  selectWorkbench,
  selectWorkbenchBacktests,
  selectWorkbenchProgress,
  store,
  useAppDispatch,
  useAppSelector,
} from "@/store"
import {
  addBacktest,
  rollbackReview,
  setActive,
  setBacktestActive,
  setStage,
  startReview,
} from "@/store/workbench-slice"
import { code, createTimeline, type FlowStatus, type ReviewStatus, type SessionItem, type StepStatus, type TimelineEvent } from "../data"
import { useWorkbenchProgressSync } from "./use-workbench-progress"
import { scoped } from "./use-workbench-review"
import type { BacktestConfig } from "@/types/backtest"

const locks = new Set<string>()
const intakes = new Map<string, Intake>()

function status(state?: string): ReviewStatus {
  if (state === "running") return "running"
  if (state === "passed") return "passed"
  if (state === "failed" || state === "error") return "failed"
  return "idle"
}

function step(state: string): StepStatus {
  if (state === "running") return "running"
  if (state === "passed") return "done"
  if (state === "warning") return "warning"
  if (state === "failed" || state === "error") return "error"
  return "pending"
}

function stamp(value?: number) {
  if (!value) return ""
  return new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

function plugin(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1)?.replace(/-local$/, "") ?? ""
}

function message(text?: string) {
  const value = text?.trim() ?? ""
  if (!value) return "审查"
  return `${value}\n\n请根据以上内容审查当前策略代码，并给出明确的审查结论。`
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
    backtestRun: null,
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

export function workflow(row: NonNullable<ReturnType<typeof selectWorkbench>["workflow"]>): TimelineEvent {
  const type =
    row.stage === "review" ? "review" : row.stage === "debug" ? "debug" : row.stage === "backtest" ? "backtest" : "workflow"
  const labels = { review: "策略审查", debug: "策略调试", backtest: "策略回测", done: "策略流程" }
  const states = {
    requested: "等待执行",
    dispatching: "正在调度审查智能体",
    running: "正在执行",
    fixing: "正在自动修复",
    passed: "已通过",
    failed: "执行失败",
    review_exhausted: "审查达到轮次上限",
    cancelled: "已取消",
    paused: "已暂停",
  }
  return {
    id: `${row.id}-${row.revision}`,
    type,
    label: labels[row.stage],
    time: new Date(row.updatedAt).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    description: row.error || row.summary || states[row.state],
  }
}

export function useWorkbench(setRight?: (open: boolean) => void) {
  const sys = useSystem()
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""
  useWorkbenchProgressSync(state.sessionPath, state.active)
  const prog = useAppSelector((item) => selectWorkbenchProgress(item, state.sessionPath, state.active))
  const runs = useAppSelector((item) => selectWorkbenchBacktests(item, state.sessionPath, state.active))
  const [view, setView] = useState<"current" | "history">("current")
  const [testing, setTesting] = useState(false)
  const gate = useRef(false)
  const flow = state.flowchart?.workspacePath === state.sessionPath ? state.flowchart : null
  const rows = useMemo(
    () =>
      scoped(
        state.reviewPath === state.sessionPath ? state.reviews : [],
        state.sessionPath,
        state.active,
      )
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [state.active, state.reviewPath, state.reviews, state.sessionPath],
  )
  const row = rows[0] ?? null
  const reviewing = row?.state === "running"
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
        summary: item.summary,
        suggestions: item.suggestions,
      }))
    const back = runs.find((item) => item.id === state.backtestActive) ?? runs[0] ?? null
    const active = activeBacktest(runs)
    const pipeline =
      state.workflowPath === state.sessionPath && state.workflowSession === state.active ? state.workflow : null
    const timeline = prog.map(map)
    if (pipeline) timeline.push(workflow(pipeline))
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
      backtestStatus: back?.status ?? "idle",
      backtestRun: active,
      backtestResults: back,
      backtestHistory: runs,
      timelineEvents: timeline.length > 0 ? timeline : createTimeline(session.title),
    }
  }, [flow, prog, row, rows, runs, state.active, state.backtestActive, state.sessions, state.sessionPath, state.workflow, state.workflowPath, state.workflowSession, view])
  const last = row ? (cur.reviewHistory.find((item) => item.id === row.id) ?? null) : null
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

  const review = async (text?: string) => {
    setRight?.(true)
    const fresh = selectWorkbench(store.getState())
    const session = fresh.sessions.find((item) => item.id === fresh.active)
    if (
      !path ||
      fresh.sessionPath !== path ||
      fresh.reviewPath !== path ||
      !session ||
      session.workspacePath !== path
    ) {
      toast.error("请先创建或选择一个会话")
      return false
    }
    const key = `${path}\u0000${session.id}`
    const wait = fresh.reviews.some((item) => item.id.startsWith("pending_") && item.sessionId === session.id)
    const current = fresh.reviews.find((item) => !item.id.startsWith("pending_") && item.sessionId === session.id)
    if (wait || current?.state === "running" || locks.has(key)) return false
    const id = `pending_${backtestKey()}`
    const source = text?.trim() ?? ""
    const req = sys.cfg.workbench.intake && source ? capture(intakes, key, source) : undefined
    locks.add(key)
    dispatch(startReview({ workspacePath: path, sessionId: session.id, id, updatedAt: Date.now() }))
    try {
      await modelChainApi.sendPrompt({
        workspacePath: path,
        sessionId: session.id,
        parts: [{ type: "text", text: message(text) }],
        intake: req ? { id: req.id, text: source } : undefined,
      })
      if (req) settle(intakes, key, req.id)
      return true
    } catch {
      dispatch(rollbackReview({ workspacePath: path, id }))
      toast.error("提交审查失败")
      return false
    } finally {
      locks.delete(key)
    }
  }

  const backtest = async (cfg?: BacktestConfig) => {
    dispatch(setStage("backtest"))
    if (cur.backtestRun || gate.current) return
    if (!state.sessionPath || !state.active) {
      toast.error("请先创建或选择一个会话")
      return
    }
    gate.current = true
    setTesting(true)
    try {
      const run = await backtestApi.run({
        workspacePath: state.sessionPath,
        sessionId: state.active,
        pluginId: plugin(state.sessionPath),
        requestKey: backtestKey(),
        config: cfg,
      })
      dispatch(addBacktest({ workspacePath: state.sessionPath, run }))
      toast.success("回测已开始")
    } catch (err) {
      const run = err instanceof ApiError && err.code === 409 ? err.payload?.data : undefined
      if (isBacktestRun(run) && run.workspacePath === state.sessionPath && run.sessionId === state.active) {
        dispatch(addBacktest({ workspacePath: state.sessionPath, run }))
        toast.info("已有回测正在运行")
        return
      }
      toast.error(err instanceof Error ? err.message : "启动回测失败")
    } finally {
      gate.current = false
      setTesting(false)
    }
  }

  return {
    active: state.active,
    path,
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
