import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { type Stage } from "@/components/workbench/data"
import type { BacktestRun, BacktestUpdate } from "@/types/backtest"

export type WorkbenchSession = {
  id: string
  title: string
  workspacePath: string
  session?: unknown
  analysis?: unknown
  requirements: string[]
  createdAt: number
  updatedAt: number
}

export type WorkbenchQuestion = {
  id: string
  workspacePath: string
  sessionId: string
  messageId: string
  body: string
  createdAt: number
  name?: string
}

export type WorkbenchAnalysis = {
  workspacePath: string
  worktreePath: string
  state: "idle" | "requested" | "running" | "done"
  items: string[]
  text: string
  updatedAt: number
}

export type WorkbenchFlowchart = {
  workspacePath: string
  worktreePath: string
  state: "idle" | "requested" | "generating" | "done" | "error"
  code: string
  err: string
  manual: boolean
  source: "ai" | "manual"
  updatedAt: number
}

export type WorkbenchReviewItem = {
  name: string
  status: "passed" | "failed" | "warning" | "running" | "error"
  detail: string
  suggestion: string
}

export type WorkbenchReview = {
  id: string
  workspacePath: string
  worktreePath: string
  state: "idle" | "running" | "passed" | "failed" | "error"
  summary: string
  items: WorkbenchReviewItem[]
  suggestions: string[]
  updatedAt: number
}

export type WorkbenchProgressEvent = {
  id: string
  workspacePath: string
  sessionId: string
  kind: string
  state: "running" | "done" | "error"
  title: string
  detail: string
  source: string
  payload?: unknown
  createdAt: number
}

type RequirementReview = {
  revision: number
  pending: boolean
}

type State = {
  sessions: WorkbenchSession[]
  sessionPath: string
  requirementReviews: Record<string, Record<string, RequirementReview>>
  questions: WorkbenchQuestion[]
  questionPath: string
  analysis: WorkbenchAnalysis | null
  analysisPath: string
  flowchart: WorkbenchFlowchart | null
  flowchartPath: string
  reviews: WorkbenchReview[]
  reviewPath: string
  progress: WorkbenchProgressEvent[]
  progressPath: string
  progressSession: string
  backtests: BacktestRun[]
  backtestPath: string
  backtestSession: string
  backtestActive: string
  active: string
  stage: Stage
}

const initialState: State = {
  sessions: [],
  sessionPath: "",
  requirementReviews: {},
  questions: [],
  questionPath: "",
  analysis: null,
  analysisPath: "",
  flowchart: null,
  flowchartPath: "",
  reviews: [],
  reviewPath: "",
  progress: [],
  progressPath: "",
  progressSession: "",
  backtests: [],
  backtestPath: "",
  backtestSession: "",
  backtestActive: "",
  active: "",
  stage: "session",
}

function same(a: WorkbenchProgressEvent, b: WorkbenchProgressEvent) {
  if (a.kind !== b.kind) return false
  if (a.state !== b.state) return false
  if (a.title !== b.title) return false
  return a.source === b.source
}

function compact(list: WorkbenchProgressEvent[]) {
  const state = { start: 0, end: 0 }
  return list.map((item) => title(item, state)).reduce<WorkbenchProgressEvent[]>((all, item) => {
    const prev = all[all.length - 1]
    if (!prev || !same(prev, item)) return [...all, item]
    return [...all.slice(0, -1), item]
  }, [])
}

function title(item: WorkbenchProgressEvent, state: { start: number; end: number }) {
  if (item.kind === "review.start") {
    state.start++
    if (item.title !== "审查" && item.title !== "review.start") return item
    return { ...item, title: `开始第${state.start}轮审查` }
  }
  if (item.kind !== "review.done" && item.kind !== "review.error") return item
  state.end++
  const round = Math.max(state.start, state.end)
  if (item.title !== "审查" && item.title !== "review.done" && item.title !== "review.error") return item
  if (item.kind === "review.error") return { ...item, title: `第${round}轮审查异常` }
  return { ...item, title: `第${round}轮审查结束` }
}

const slice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    setSessions(state, action: PayloadAction<{ sessions: WorkbenchSession[]; workspacePath: string }>) {
      state.sessions = action.payload.sessions
      state.sessionPath = action.payload.workspacePath
      if (state.sessions.some((item) => item.id === state.active)) return
      state.active = state.sessions[0]?.id ?? ""
    },
    setQuestions(state, action: PayloadAction<{ workspacePath: string; questions: WorkbenchQuestion[] }>) {
      state.questionPath = action.payload.workspacePath
      state.questions = action.payload.questions
    },
    setRequirements(
      state,
      action: PayloadAction<{ workspacePath: string; sessionId: string; requirements: string[] }>,
    ) {
      const session = state.sessions.find(
        (item) => item.id === action.payload.sessionId && item.workspacePath === action.payload.workspacePath,
      )
      if (!session) return
      if (
        session.requirements.length === action.payload.requirements.length &&
        session.requirements.every((item, index) => item === action.payload.requirements[index])
      ) return
      session.requirements = action.payload.requirements
    },
    markRequirementReview(state, action: PayloadAction<{ workspacePath: string; sessionId: string }>) {
      state.requirementReviews[action.payload.workspacePath] ??= {}
      const review = state.requirementReviews[action.payload.workspacePath][action.payload.sessionId]
      state.requirementReviews[action.payload.workspacePath][action.payload.sessionId] = {
        revision: (review?.revision ?? 0) + 1,
        pending: true,
      }
    },
    clearRequirementReview(
      state,
      action: PayloadAction<{ workspacePath: string; sessionId: string; revision: number }>,
    ) {
      const review = state.requirementReviews[action.payload.workspacePath]?.[action.payload.sessionId]
      if (!review?.pending || review.revision !== action.payload.revision) return
      review.pending = false
    },
    setAnalysis(state, action: PayloadAction<{ workspacePath: string; analysis: WorkbenchAnalysis | null }>) {
      state.analysisPath = action.payload.workspacePath
      state.analysis = action.payload.analysis
    },
    setFlowchart(state, action: PayloadAction<{ workspacePath: string; flowchart: WorkbenchFlowchart | null }>) {
      state.flowchartPath = action.payload.workspacePath
      state.flowchart = action.payload.flowchart
    },
    setReviews(state, action: PayloadAction<{ workspacePath: string; reviews: WorkbenchReview[] }>) {
      state.reviewPath = action.payload.workspacePath
      state.reviews = action.payload.reviews
    },
    setProgress(
      state,
      action: PayloadAction<{ workspacePath: string; sessionId: string; events: WorkbenchProgressEvent[] }>,
    ) {
      state.progressPath = action.payload.workspacePath
      state.progressSession = action.payload.sessionId
      state.progress = compact(action.payload.events)
    },
    upsertProgress(state, action: PayloadAction<{ workspacePath: string; event: WorkbenchProgressEvent }>) {
      state.progressPath = action.payload.workspacePath
      state.progressSession = action.payload.event.sessionId
      state.progress = compact([
        ...state.progress.filter((item) => item.id !== action.payload.event.id),
        action.payload.event,
      ].sort((a, b) => a.createdAt - b.createdAt))
    },
    setBacktestScope(state, action: PayloadAction<{ workspacePath: string; sessionId: string }>) {
      if (state.backtestPath === action.payload.workspacePath && state.backtestSession === action.payload.sessionId) return
      state.backtestPath = action.payload.workspacePath
      state.backtestSession = action.payload.sessionId
      state.backtests = []
      state.backtestActive = ""
    },
    setBacktests(state, action: PayloadAction<{ workspacePath: string; sessionId: string; runs: BacktestRun[] }>) {
      if (state.backtestPath !== action.payload.workspacePath || state.backtestSession !== action.payload.sessionId) return
      const runs = action.payload.runs.map((run) => {
        const current = state.backtests.find((item) => item.id === run.id)
        if (!current || current.revision <= run.revision) return run
        return current
      })
      state.backtests = [
        ...runs,
        ...state.backtests.filter((run) => !runs.some((item) => item.id === run.id)),
      ].sort((a, b) => b.updatedAt - a.updatedAt)
      if (state.backtests.some((item) => item.id === state.backtestActive)) return
      state.backtestActive = state.backtests[0]?.id ?? ""
    },
    addBacktest(state, action: PayloadAction<{ workspacePath: string; run: BacktestRun }>) {
      if (state.backtestPath !== action.payload.workspacePath || state.backtestSession !== action.payload.run.sessionId) return
      const current = state.backtests.find((item) => item.id === action.payload.run.id)
      state.backtests = [
        current && current.revision > action.payload.run.revision ? current : action.payload.run,
        ...state.backtests.filter((item) => item.id !== action.payload.run.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt)
      state.backtestActive = action.payload.run.id
    },
    upsertBacktest(state, action: PayloadAction<{ workspacePath: string; run: BacktestRun }>) {
      if (state.backtestPath !== action.payload.workspacePath || state.backtestSession !== action.payload.run.sessionId) return
      const current = state.backtests.find((item) => item.id === action.payload.run.id)
      if (current && current.revision > action.payload.run.revision) return
      state.backtests = [
        action.payload.run,
        ...state.backtests.filter((item) => item.id !== action.payload.run.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt)
      if (state.backtestActive) return
      state.backtestActive = action.payload.run.id
    },
    updateBacktest(state, action: PayloadAction<{ workspacePath: string; update: BacktestUpdate }>) {
      if (
        state.backtestPath !== action.payload.workspacePath ||
        state.backtestSession !== action.payload.update.sessionId ||
        action.payload.update.workspacePath !== action.payload.workspacePath
      ) return
      const idx = state.backtests.findIndex((item) => item.id === action.payload.update.id)
      if (idx < 0 || state.backtests[idx].revision >= action.payload.update.revision) return
      state.backtests[idx] = { ...state.backtests[idx], ...action.payload.update }
      state.backtests.sort((a, b) => b.updatedAt - a.updatedAt)
    },
    setBacktestActive(state, action: PayloadAction<string>) {
      state.backtestActive = action.payload
    },
    upsertReview(state, action: PayloadAction<{ workspacePath: string; review: WorkbenchReview }>) {
      state.reviewPath = action.payload.workspacePath
      const stale = action.payload.review.state !== "running"
      state.reviews = [
        action.payload.review,
        ...state.reviews.filter((item) => item.id !== action.payload.review.id && !(stale && item.id.startsWith("pending_"))),
      ].sort((a, b) => b.updatedAt - a.updatedAt)
    },
    upsertSession(state, action: PayloadAction<{ session: WorkbenchSession }>) {
      const idx = state.sessions.findIndex((item) => item.id === action.payload.session.id)
      if (idx >= 0) {
        state.sessions[idx] = action.payload.session
        return
      }
      state.sessions.unshift(action.payload.session)
      if (!state.active) {
        state.active = action.payload.session.id
      }
    },
    deleteSession(state, action: PayloadAction<{ id: string }>) {
      const session = state.sessions.find((item) => item.id === action.payload.id)
      state.sessions = state.sessions.filter((item) => item.id !== action.payload.id)
      if (session) {
        const reviews = state.requirementReviews[session.workspacePath]
        if (reviews) {
          delete reviews[action.payload.id]
          if (Object.keys(reviews).length === 0) delete state.requirementReviews[session.workspacePath]
        }
      }
      if (state.active !== action.payload.id) return
      state.active = state.sessions[0]?.id ?? ""
    },
    deleteQuestion(state, action: PayloadAction<{ id: string; sessionId: string }>) {
      state.questions = state.questions.filter(
        (item) => item.id !== action.payload.id || item.sessionId !== action.payload.sessionId,
      )
    },
    setStage(state, action: PayloadAction<Stage>) {
      state.stage = action.payload
    },
    setActive(state, action: PayloadAction<string>) {
      state.active = action.payload
    },
  },
})

export const {
  addBacktest,
  clearRequirementReview,
  deleteQuestion,
  deleteSession,
  markRequirementReview,
  setAnalysis,
  setActive,
  setBacktestActive,
  setBacktestScope,
  setBacktests,
  setFlowchart,
  setQuestions,
  setProgress,
  setRequirements,
  setReviews,
  setSessions,
  setStage,
  upsertProgress,
  upsertBacktest,
  updateBacktest,
  upsertReview,
  upsertSession,
} = slice.actions

export const workbenchReducer = slice.reducer
